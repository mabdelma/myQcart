import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { computePnL, generatePnLPdf } from '../services/reportService.js';

const reports = new Hono();

// Profit & Loss summary (JSON)
reports.get('/:slug/reports/pnl', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const start = c.req.query('start');
  const end = c.req.query('end');
  const pnl = await computePnL(tenantId, start, end);
  return c.json(pnl);
});

// Profit & Loss as a downloadable PDF report
reports.get('/:slug/reports/pnl.pdf', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenant = c.get('tenant');
  const start = c.req.query('start');
  const end = c.req.query('end');
  const pnl = await computePnL(tenant.id, start, end);
  const pdf = await generatePnLPdf({ tenantName: tenant.name, currency: tenant.currency, pnl });
  return new Response(pdf as unknown as Blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pnl-${tenant.slug}.pdf"`,
    },
  });
});

export default reports;
