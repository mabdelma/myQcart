import Anthropic from '@anthropic-ai/sdk';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { computePnL } from './reportService.js';
import { logger } from '../lib/logger.js';

// Default to the latest Claude; override with ANTHROPIC_MODEL if you want a
// cheaper model for high-volume customer chat (e.g. claude-haiku-4-5).
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// ── Admin copilot: tenant-scoped tools over the restaurant's own data ───────
const adminTools: Anthropic.Tool[] = [
  {
    name: 'get_pnl',
    description: 'Profit & loss / sales summary for THIS restaurant over an optional ISO date range. Returns gross/net revenue, refunds, COGS, gross profit, tax, tips, service charge, order count, average order value, and revenue by payment method.',
    input_schema: { type: 'object', properties: { start: { type: 'string', description: 'ISO start datetime (optional)' }, end: { type: 'string', description: 'ISO end datetime (optional)' } } },
  },
  {
    name: 'get_popular_items',
    description: 'Top-selling menu items by quantity for THIS restaurant.',
    input_schema: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
  },
  {
    name: 'get_menu',
    description: "List THIS restaurant's menu categories and items with prices, availability, and descriptions.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recent_orders',
    description: 'Recent orders for THIS restaurant with status, payment status, total, and item count.',
    input_schema: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
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

const textOf = (content: Anthropic.ContentBlock[]) =>
  content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();

export async function adminCopilot(tenantId: string, tenantName: string, currency: string, history: ChatTurn[]) {
  const client = getClient();
  if (!client) return { error: 'AI assistant not configured (set ANTHROPIC_API_KEY)', status: 501 as const };

  const system = `You are the Qlisted assistant for the restaurant "${tenantName}" (currency: ${currency}). `
    + `Answer the owner/manager's questions about their business by calling the provided tools to fetch REAL data — never invent numbers. `
    + `Be concise and concrete; format money with the currency. You may also help draft menu item descriptions or short marketing copy when asked. `
    + `You only have access to this one restaurant's data.`;

  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  // Manual tool-use loop (bounded).
  for (let i = 0; i < 6; i++) {
    const resp = await client.messages.create({ model: MODEL, max_tokens: 3072, system, tools: adminTools, messages });
    if (resp.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type === 'tool_use') {
          let out: string;
          try { out = await runAdminTool(tenantId, block.name, (block.input ?? {}) as Record<string, unknown>); }
          catch (e) { out = JSON.stringify({ error: (e as Error).message }); }
          results.push({ type: 'tool_result', tool_use_id: block.id, content: out });
        }
      }
      messages.push({ role: 'user', content: results });
      continue;
    }
    return { data: { reply: textOf(resp.content) || '(no response)' }, status: 200 as const };
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

  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const resp = await client.messages.create({ model: MODEL, max_tokens: 1024, system, messages });
  return { data: { reply: textOf(resp.content) || '(no response)' }, status: 200 as const };
}
