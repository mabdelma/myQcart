import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../lib/mail.js';

const daysSince = (d?: string | null) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity);

/**
 * Send a one-off campaign email to a customer segment.
 *  - all     → every customer with an email
 *  - vip     → high spenders / frequent visitors
 *  - atRisk  → lapsed (>=2 visits, none in 30 days) — i.e. win-back
 * Delivery is best-effort per recipient; returns how many were sent.
 */
export async function sendCampaign(
  tenantId: string,
  tenantName: string,
  opts: { segment: 'all' | 'vip' | 'atRisk'; subject: string; message: string },
) {
  const customers = await db.select().from(schema.customers).where(eq(schema.customers.tenantId, tenantId));
  const inSeg = (c: typeof customers[number]) =>
    opts.segment === 'vip' ? (Number(c.totalSpent) >= 200 || (c.totalVisits || 0) >= 5)
      : opts.segment === 'atRisk' ? ((c.totalVisits || 0) >= 2 && daysSince(c.lastVisit) > 30)
        : true;
  const targets = customers.filter((c) => inSeg(c) && c.email);

  const safe = opts.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#333">`
    + `${safe}<hr style="border:none;border-top:1px solid #eee;margin:24px 0">`
    + `<p style="color:#999;font-size:12px">${tenantName} · powered by Qlisted</p></div>`;

  let sent = 0;
  for (const c of targets) {
    if (!c.email) continue;
    try { await sendEmail({ to: c.email, subject: opts.subject, html }); sent += 1; } catch { /* skip failures */ }
  }
  return { sent, total: targets.length };
}
