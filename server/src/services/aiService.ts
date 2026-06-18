import OpenAI from 'openai';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computePnL } from './reportService.js';
import { logger } from '../lib/logger.js';

// OpenAI (same provider as the Escoutly app). Override the model with OPENAI_MODEL.
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  return key ? new OpenAI({ apiKey: key }) : null;
}

export function aiEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// ── Admin copilot: tenant-scoped tools over the restaurant's own data ───────
const adminTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_pnl',
      description: 'Profit & loss / sales summary for THIS restaurant over an optional ISO date range. Returns gross/net revenue, refunds, COGS, gross profit, tax, tips, service charge, order count, average order value, and revenue by payment method.',
      parameters: { type: 'object', properties: { start: { type: 'string', description: 'ISO start datetime (optional)' }, end: { type: 'string', description: 'ISO end datetime (optional)' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_popular_items',
      description: 'Top-selling menu items by quantity for THIS restaurant.',
      parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu',
      description: "List THIS restaurant's menu categories and items with prices, availability, and descriptions.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_orders',
      description: 'Recent orders for THIS restaurant with status, payment status, total, and item count.',
      parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
    },
  },
];

async function runAdminTool(tenantId: string, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_pnl':
      return JSON.stringify(await computePnL(tenantId, input.start as string | undefined, input.end as string | undefined));
    case 'get_popular_items': {
      const limit = Math.min(Number(input.limit) || 10, 50);
      const r = await db.execute(sql`
        SELECT mi.name, SUM(oi.quantity)::int AS quantity, SUM(oi.quantity * oi.unit_price)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.tenant_id = ${tenantId}
        GROUP BY mi.name ORDER BY quantity DESC LIMIT ${limit}`);
      return JSON.stringify(r.rows);
    }
    case 'get_menu': {
      const categories = await db.select().from(schema.menuCategories).where(eq(schema.menuCategories.tenantId, tenantId));
      const items = await db.select().from(schema.menuItems).where(eq(schema.menuItems.tenantId, tenantId));
      return JSON.stringify({ categories, items });
    }
    case 'get_recent_orders': {
      const limit = Math.min(Number(input.limit) || 10, 50);
      const r = await db.execute(sql`
        SELECT id, status, payment_status, total::float AS total, item_count, created_at
        FROM orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}`);
      return JSON.stringify(r.rows);
    }
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` });
  }
}

export async function adminCopilot(tenantId: string, tenantName: string, currency: string, history: ChatTurn[]) {
  const client = getClient();
  if (!client) return { error: 'AI assistant not configured (set OPENAI_API_KEY)', status: 501 as const };

  const system = `You are the Qlisted assistant for the restaurant "${tenantName}" (currency: ${currency}). `
    + `Answer the owner/manager's questions about their business by calling the provided tools to fetch REAL data — never invent numbers. `
    + `Be concise and concrete; format money with the currency. You may also help draft menu item descriptions or short marketing copy when asked. `
    + `You only have access to this one restaurant's data.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  // Manual tool-use loop (bounded).
  for (let i = 0; i < 6; i++) {
    const resp = await client.chat.completions.create({ model: MODEL, messages, tools: adminTools, max_tokens: 1024 });
    const msg = resp.choices[0]?.message;
    if (!msg) break;
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        if (tc.type !== 'function') continue;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore bad args */ }
        let out: string;
        try { out = await runAdminTool(tenantId, tc.function.name, args); }
        catch (e) { out = JSON.stringify({ error: (e as Error).message }); }
        messages.push({ role: 'tool', tool_call_id: tc.id, content: out });
      }
      continue;
    }
    return { data: { reply: (msg.content || '').trim() || '(no response)' }, status: 200 as const };
  }
  logger.warn({ tenantId }, 'admin copilot hit tool-loop limit');
  return { data: { reply: 'Sorry — I could not complete that request.' }, status: 200 as const };
}

// ── Customer chat: menu inlined as context (no tools, fast) ─────────────────
export async function customerChat(tenantId: string, tenantName: string, currency: string, history: ChatTurn[]) {
  const client = getClient();
  if (!client) return { error: 'AI assistant not configured', status: 501 as const };

  const cats = await db.select().from(schema.menuCategories).where(eq(schema.menuCategories.tenantId, tenantId));
  const items = await db.select().from(schema.menuItems).where(eq(schema.menuItems.tenantId, tenantId));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const menuText = items
    .filter((i) => i.available)
    .map((i) => `- ${i.name} (${catName.get(i.categoryId) || 'Other'}) — ${currency} ${Number(i.price).toFixed(2)}${i.description ? `: ${i.description}` : ''}`)
    .join('\n');

  const system = `You are a friendly ordering assistant for "${tenantName}". Help the guest choose from the menu below: answer questions, suggest dishes, and note likely dietary considerations. Keep replies short. Only recommend items that appear on this menu. You cannot place orders or take payment — direct the guest to use the on-screen menu to order.\n\nMENU:\n${menuText || '(menu unavailable)'}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];
  const resp = await client.chat.completions.create({ model: MODEL, messages, max_tokens: 600 });
  return { data: { reply: (resp.choices[0]?.message?.content || '').trim() || '(no response)' }, status: 200 as const };
}

async function buildMenuText(tenantId: string, currency: string): Promise<string> {
  const cats = await db.select().from(schema.menuCategories).where(eq(schema.menuCategories.tenantId, tenantId));
  const items = await db.select().from(schema.menuItems).where(eq(schema.menuItems.tenantId, tenantId));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  return items
    .filter((i) => i.available)
    .map((i) => `- ${i.name} (${catName.get(i.categoryId) || 'Other'}) — ${currency} ${Number(i.price).toFixed(2)}${i.description ? `: ${i.description}` : ''}`)
    .join('\n');
}

// ── Voice ordering: mint a short-lived OpenAI Realtime session token ─────────
// The browser connects to OpenAI's Realtime API over WebRTC using this
// ephemeral token, so the real OPENAI_API_KEY never leaves the server.
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';

export async function createRealtimeSession(tenantId: string, tenantName: string, currency: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: 'AI assistant not configured', status: 501 as const };

  const menuText = await buildMenuText(tenantId, currency);
  const instructions = `You are a friendly spoken ordering assistant for the restaurant "${tenantName}". `
    + `Help the guest choose from the menu below: answer questions, suggest dishes, and note likely dietary considerations. `
    + `Keep spoken replies short and natural. Only mention items that appear on this menu. `
    + `You cannot place orders or take payment — tell the guest to use the on-screen menu to add items and check out.\n\nMENU:\n${menuText || '(menu unavailable)'}`;

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: REALTIME_MODEL, voice: 'alloy', modalities: ['audio', 'text'], instructions }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, 'realtime session mint failed');
      return { error: 'Could not start voice session', status: 502 as const };
    }
    const session = await res.json() as { client_secret?: { value?: string; expires_at?: number } };
    const clientSecret = session.client_secret?.value;
    if (!clientSecret) return { error: 'Could not start voice session', status: 502 as const };
    return { data: { clientSecret, expiresAt: session.client_secret?.expires_at, model: REALTIME_MODEL }, status: 200 as const };
  } catch (e) {
    logger.error(e, 'realtime session error');
    return { error: 'Could not start voice session', status: 502 as const };
  }
}
