import { db, schema } from '../db/index.js';
import { and, eq, sql, desc } from 'drizzle-orm';
import OpenAI from 'openai';
import { getLowStockItems } from './inventoryService.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Forecasting & Insights — derives forward-looking signals from the data the
 * platform already collects: a 7-day revenue forecast (day-of-week seasonality
 * over the trailing 8 weeks), reorder suggestions from low stock, churn-risk
 * customers, and top customers by lifetime value. An optional AI narrative turns
 * the numbers into a few concrete, actionable recommendations.
 */
export async function getInsights(tenantId: string, tenantName: string, currency: string) {
  // ── 7-day revenue forecast (day-of-week average over trailing 56 days) ──
  const rows = await db
    .select({ d: sql<string>`DATE(${schema.orders.createdAt}::timestamp)`, total: schema.orders.total })
    .from(schema.orders)
    .where(and(
      eq(schema.orders.tenantId, tenantId),
      sql`${schema.orders.status} <> 'cancelled'`,
      sql`${schema.orders.createdAt}::timestamp >= CURRENT_DATE - INTERVAL '56 days'`,
    ));
  const daily = new Map<string, number>();
  for (const r of rows) daily.set(r.d, (daily.get(r.d) || 0) + Number(r.total || 0));
  const dowSum = Array(7).fill(0);
  const dowCnt = Array(7).fill(0);
  for (const [d, tot] of daily) {
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    dowSum[dow] += tot;
    dowCnt[dow] += 1;
  }
  const dowAvg = dowSum.map((s, i) => (dowCnt[i] ? s / dowCnt[i] : 0));
  const today = new Date();
  const forecast: { date: string; dow: string; projected: number }[] = [];
  for (let i = 1; i <= 7; i++) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() + i);
    const dow = day.getUTCDay();
    forecast.push({ date: day.toISOString().slice(0, 10), dow: DOW[dow], projected: Math.round(dowAvg[dow]) });
  }
  const forecast7Total = forecast.reduce((s, f) => s + f.projected, 0);

  // ── Reorder suggestions from low stock ──
  const low = await getLowStockItems(tenantId).catch(() => []);
  const lowStock = (low as { name: string; unit: string | null; currentStock: number; minStock: number; costPerUnit: number | null }[]).map((s) => {
    const cur = Number(s.currentStock || 0);
    const min = Number(s.minStock || 0);
    const suggestedReorder = Math.max(0, Math.ceil(min * 2 - cur));
    return { name: s.name, unit: s.unit || '', currentStock: cur, minStock: min, suggestedReorder, estCost: +(suggestedReorder * Number(s.costPerUnit || 0)).toFixed(2) };
  });
  const reorderCost = +lowStock.reduce((s, i) => s + i.estCost, 0).toFixed(2);

  // ── Churn-risk customers (>=2 visits, none in 30 days) ──
  const atRiskRows = await db
    .select()
    .from(schema.customers)
    .where(and(
      eq(schema.customers.tenantId, tenantId),
      sql`${schema.customers.totalVisits} >= 2`,
      sql`${schema.customers.lastVisit} IS NOT NULL`,
      sql`${schema.customers.lastVisit}::timestamp < CURRENT_DATE - INTERVAL '30 days'`,
    ))
    .orderBy(desc(schema.customers.totalSpent))
    .limit(8);
  const atRisk = atRiskRows.map((c) => ({ name: c.name, lastVisit: c.lastVisit, totalSpent: Number(c.totalSpent || 0), totalVisits: c.totalVisits || 0 }));

  // ── Top customers by lifetime value ──
  const topRows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId))
    .orderBy(desc(schema.customers.totalSpent))
    .limit(5);
  const topCustomers = topRows.map((c) => ({ name: c.name, totalSpent: Number(c.totalSpent || 0), totalVisits: c.totalVisits || 0 }));

  const data = { forecast, forecast7Total, lowStock, reorderCost, atRisk, topCustomers };

  // ── AI narrative (best-effort; degrades to empty if no key) ──
  let narrative = '';
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const resp = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 320,
        messages: [{
          role: 'user',
          content: `You are the AI business analyst for the restaurant "${tenantName}" (currency ${currency}). `
            + `From this data, write 3-4 short, specific, actionable bullet points (start each with "•", no preamble, no headings). `
            + `Call out the projected weekly revenue, the most urgent reorder, and how to win back at-risk customers.\n\n${JSON.stringify(data)}`,
        }],
      });
      narrative = resp.choices[0]?.message?.content?.trim() || '';
    } catch { /* best-effort: narrative stays empty */ }
  }

  return { ...data, narrative };
}
