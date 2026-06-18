import PDFDocument from 'pdfkit';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export interface PnL {
  start: string | null;
  end: string | null;
  grossRevenue: number;   // paid payments (excl. tips)
  tips: number;
  refunds: number;
  netRevenue: number;     // grossRevenue - refunds
  tax: number;            // tax collected (liability, not profit)
  serviceCharge: number;
  cogs: number;           // cost of goods sold (from stock costs, if mapped)
  grossProfit: number;    // netRevenue - cogs
  orderCount: number;
  avgOrderValue: number;
  byMethod: { method: string; amount: number; count: number }[];
}

function rangeClause(col: string, start?: string, end?: string) {
  // ISO timestamps compare lexicographically === chronologically.
  if (start && end) return sql`AND ${sql.raw(col)} >= ${start} AND ${sql.raw(col)} <= ${end}`;
  if (start) return sql`AND ${sql.raw(col)} >= ${start}`;
  if (end) return sql`AND ${sql.raw(col)} <= ${end}`;
  return sql``;
}

export async function computePnL(tenantId: string, start?: string, end?: string): Promise<PnL> {
  const pay = rangeClause('created_at', start, end);

  const paid = (await db.execute(sql`
    SELECT COALESCE(SUM(amount),0)::float AS amount, COALESCE(SUM(tip),0)::float AS tips, COUNT(*)::int AS cnt
    FROM payments WHERE tenant_id = ${tenantId} AND status = 'paid' ${pay}
  `)).rows[0] as { amount: number; tips: number; cnt: number };

  const refunded = (await db.execute(sql`
    SELECT COALESCE(SUM(amount),0)::float AS amount
    FROM payments WHERE tenant_id = ${tenantId} AND status = 'refunded' ${pay}
  `)).rows[0] as { amount: number };

  const byMethod = (await db.execute(sql`
    SELECT method, COALESCE(SUM(amount),0)::float AS amount, COUNT(*)::int AS count
    FROM payments WHERE tenant_id = ${tenantId} AND status = 'paid' ${pay}
    GROUP BY method ORDER BY amount DESC
  `)).rows as { method: string; amount: number; count: number }[];

  const ord = rangeClause('o.created_at', start, end);
  const orderAgg = (await db.execute(sql`
    SELECT COALESCE(SUM(o.tax),0)::float AS tax, COALESCE(SUM(o.service_charge),0)::float AS svc, COUNT(*)::int AS cnt
    FROM orders o WHERE o.tenant_id = ${tenantId} AND o.payment_status = 'paid' ${ord}
  `)).rows[0] as { tax: number; svc: number; cnt: number };

  // COGS from recipe mapping × stock unit cost (0 if no ingredients mapped).
  const cogsRow = (await db.execute(sql`
    SELECT COALESCE(SUM(oi.quantity * mii.quantity * COALESCE(si.cost_per_unit,0)),0)::float AS cogs
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    JOIN stock_items si ON si.id = mii.stock_item_id
    WHERE o.tenant_id = ${tenantId} AND o.payment_status = 'paid' ${ord}
  `)).rows[0] as { cogs: number };

  const grossRevenue = Number(paid.amount) || 0;
  const tips = Number(paid.tips) || 0;
  const refunds = Number(refunded.amount) || 0;
  const netRevenue = grossRevenue - refunds;
  const cogs = Number(cogsRow.cogs) || 0;
  const orderCount = Number(orderAgg.cnt) || 0;

  return {
    start: start ?? null,
    end: end ?? null,
    grossRevenue,
    tips,
    refunds,
    netRevenue,
    tax: Number(orderAgg.tax) || 0,
    serviceCharge: Number(orderAgg.svc) || 0,
    cogs,
    grossProfit: netRevenue - cogs,
    orderCount,
    avgOrderValue: orderCount ? netRevenue / orderCount : 0,
    byMethod: byMethod.map((m) => ({ method: m.method, amount: Number(m.amount) || 0, count: Number(m.count) || 0 })),
  };
}

export async function generatePnLPdf(opts: {
  tenantName: string; currency: string; pnl: PnL;
}): Promise<Buffer> {
  const { tenantName, currency, pnl } = opts;
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const money = (n: number) => `${currency} ${n.toFixed(2)}`;
  const period = pnl.start || pnl.end
    ? `${(pnl.start || '…').slice(0, 10)} → ${(pnl.end || 'now').slice(0, 10)}`
    : 'All time';

  doc.fontSize(20).fillColor('#8B4513').text('Profit & Loss', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor('#111').text(tenantName);
  doc.fontSize(10).fillColor('#666').text(`Period: ${period}`);
  doc.fontSize(8).fillColor('#999').text(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  doc.moveDown();

  const row = (label: string, value: string, opt: { bold?: boolean; color?: string } = {}) => {
    doc.fontSize(11).fillColor(opt.color || '#111').font(opt.bold ? 'Helvetica-Bold' : 'Helvetica');
    const y = doc.y;
    doc.text(label, 50, y);
    doc.text(value, 350, y, { width: 195, align: 'right' });
    doc.moveDown(0.4);
  };
  const divider = () => { doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke(); doc.moveDown(0.4); };

  row('Gross revenue (paid)', money(pnl.grossRevenue));
  row('Less: refunds', `- ${money(pnl.refunds)}`, { color: '#b00' });
  row('Net revenue', money(pnl.netRevenue), { bold: true });
  doc.moveDown(0.2); divider();
  row('Cost of goods sold (COGS)', `- ${money(pnl.cogs)}`, { color: '#b00' });
  row('Gross profit', money(pnl.grossProfit), { bold: true, color: pnl.grossProfit >= 0 ? '#0a7d33' : '#b00' });
  doc.moveDown(0.2); divider();
  row('Tips collected (pass-through)', money(pnl.tips), { color: '#666' });
  row('Tax collected (liability)', money(pnl.tax), { color: '#666' });
  row('Service charge', money(pnl.serviceCharge), { color: '#666' });
  doc.moveDown(0.2); divider();
  row('Orders', String(pnl.orderCount));
  row('Average order value', money(pnl.avgOrderValue));

  if (pnl.byMethod.length) {
    doc.moveDown(); doc.fontSize(13).fillColor('#8B4513').font('Helvetica-Bold').text('Revenue by payment method');
    doc.moveDown(0.3);
    for (const m of pnl.byMethod) row(`${m.method} (${m.count})`, money(m.amount));
  }

  if (pnl.cogs === 0) {
    doc.moveDown();
    doc.fontSize(8).fillColor('#999').font('Helvetica').text(
      'Note: COGS is 0 because no recipe/ingredient costs are mapped. Add stock items + menu-item ingredients to track cost of goods.',
      { width: 495 },
    );
  }

  doc.end();
  return done;
}
