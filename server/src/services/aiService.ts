import OpenAI from 'openai';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computePnL } from './reportService.js';
import { getInsights } from './forecastService.js';
import { getLowStockItems } from './inventoryService.js';
import { suggestReorder, createPurchaseOrder } from './procurementService.js';
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
  {
    type: 'function',
    function: {
      name: 'get_insights',
      description: 'Forward-looking insights: 7-day revenue forecast, low-stock reorder suggestions, churn-risk customers, and top customers by lifetime value.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock',
      description: 'Stock items at or below their minimum level (need reordering), with current/min quantities and unit cost.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reorder',
      description: 'ACTION: create a purchase order that restocks every low-stock item (top up to ~2x minimum). Use only when the user asks you to reorder/restock. Returns the new PO id and total. The order is recorded for the manager to review and receive — no payment is taken.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function runAdminTool(tenantId: string, tenantName: string, currency: string, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_insights':
      return JSON.stringify(await getInsights(tenantId, tenantName, currency));
    case 'get_low_stock':
      return JSON.stringify(await getLowStockItems(tenantId));
    case 'create_reorder': {
      const items = await suggestReorder(tenantId);
      if (items.length === 0) return JSON.stringify({ ok: false, message: 'Nothing is low on stock — no reorder needed.' });
      const r = await createPurchaseOrder(tenantId, { items: items.map((s) => ({ stockItemId: s.stockItemId, name: s.name, quantity: s.quantity, unitCost: s.unitCost })) });
      if ('error' in r) return JSON.stringify({ ok: false, error: r.error });
      return JSON.stringify({ ok: true, purchaseOrderId: r.data.id, total: r.data.total, lines: items.length });
    }
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

  const system = `You are Qlisted Copilot — the AI operations assistant built into the Qlisted restaurant platform, helping the owner/manager of "${tenantName}" run their restaurant. Currency: ${currency}.\n`
    + `• Always call the provided tools to fetch REAL data (sales, orders, menu, tables, staff, reservations, loyalty) before answering with figures — never invent numbers, names, or dates.\n`
    + `• Be concise, concrete and ACTIONABLE: surface trends, flag problems (slow sellers, low stock, no-shows, drop in revenue), and suggest the next step a busy operator can take right now.\n`
    + `• You can look ahead with get_insights (revenue forecast, churn-risk customers, reorder needs) and you can ACT: when asked to reorder/restock, call create_reorder to raise a purchase order for everything that's low — then tell the owner the PO id and total so they can review and receive it. Never take payment.\n`
    + `• Format every monetary value in ${currency}; round sensibly and show short totals.\n`
    + `• You can also draft menu descriptions, promo/marketing copy, staff notices, and customer email in this restaurant's voice when asked.\n`
    + `• You ONLY ever have access to this one restaurant's data ("${tenantName}") — never mention or compare other restaurants.\n`
    + `• Reply in the SAME language the user writes in (Qlisted serves English, Español, Français, Deutsch, Português, Italiano, العربية, हिन्दी, 中文, 日本語, Русский, and more).\n`
    + `Tone: warm but efficient — a sharp operations manager who knows this restaurant inside out.`;

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
        try { out = await runAdminTool(tenantId, tenantName, currency, tc.function.name, args); }
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

  const system = `You are the friendly ordering assistant for "${tenantName}", powered by Qlisted. You help guests decide what to eat and drink.\n`
    + `• Recommend ONLY items on the menu below — never invent dishes, prices, or ingredients.\n`
    + `• Match the guest's cravings, budget and dietary needs (vegetarian, vegan, gluten-free, spice level, common allergens), and when it feels natural, gently suggest one pairing or popular add-on (a drink, side, or dessert) — never pushy.\n`
    + `• Keep replies short, warm and easy to skim; prices are in ${currency}.\n`
    + `• You cannot place orders or take payment — guide the guest to tap items on the on-screen menu and check out.\n`
    + `• Reply in the SAME language the guest writes in.\n\nMENU:\n${menuText || '(menu unavailable)'}`;

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
  const instructions = `You are the friendly spoken ordering assistant for the restaurant "${tenantName}", powered by Qlisted.\n`
    + `• Speak naturally and keep spoken replies short — one or two sentences.\n`
    + `• Recommend ONLY items on the menu below; never invent dishes, prices, or ingredients.\n`
    + `• Help with cravings, budget and dietary needs (vegetarian, vegan, gluten-free, spice, allergens); suggest a pairing or popular add-on when it feels natural, never pushy.\n`
    + `• Detect the language the guest speaks and respond in that SAME language.\n`
    + `• When the guest wants an item, call add_to_cart with the item's name and quantity, then confirm out loud what you added. To take something off, call remove_from_cart. To answer "what's in my order / how much is it", call read_cart and report it. Only add items that appear on the menu below.\n`
    + `• You cannot take payment — after building the cart, tell the guest to review it and check out on screen.\n\nMENU:\n${menuText || '(menu unavailable)'}`;

  // Tool-calling lets the agent act on the on-screen cart — the browser executes
  // each tool against the live menu/cart and returns the result.
  const tools = [
    {
      type: 'function',
      name: 'add_to_cart',
      description: "Add a menu item to the guest's cart by name. Use the exact item name from the menu.",
      parameters: {
        type: 'object',
        properties: {
          item_name: { type: 'string', description: 'The menu item name to add' },
          quantity: { type: 'integer', description: 'How many to add', minimum: 1 },
        },
        required: ['item_name'],
      },
    },
    {
      type: 'function',
      name: 'remove_from_cart',
      description: "Remove an item from the guest's cart by name.",
      parameters: {
        type: 'object',
        properties: { item_name: { type: 'string', description: 'The item name to remove' } },
        required: ['item_name'],
      },
    },
    {
      type: 'function',
      name: 'read_cart',
      description: "Read back what is currently in the guest's cart and the running total.",
      parameters: { type: 'object', properties: {} },
    },
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: { type: 'realtime', model: REALTIME_MODEL, instructions, tools, tool_choice: 'auto', audio: { output: { voice: 'alloy' } } },
      }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, 'realtime session mint failed');
      return { error: 'Could not start voice session', status: 502 as const };
    }
    const session = await res.json() as { value?: string; expires_at?: number };
    if (!session.value) return { error: 'Could not start voice session', status: 502 as const };
    return { data: { clientSecret: session.value, expiresAt: session.expires_at, model: REALTIME_MODEL }, status: 200 as const };
  } catch (e) {
    logger.error(e, 'realtime session error');
    return { error: 'Could not start voice session', status: 502 as const };
  }
}
