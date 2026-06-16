import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { exportOrders, exportPayments, exportMenuItems } from '../services/exportService.js';

const exports = new Hono();

exports.get('/:slug/exports/orders', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { startDate, endDate } = c.req.query();
  const csv = await exportOrders(tenantId, startDate, endDate);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(csv);
});

exports.get('/:slug/exports/payments', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { startDate, endDate } = c.req.query();
  const csv = await exportPayments(tenantId, startDate, endDate);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(csv);
});

exports.get('/:slug/exports/menu', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const csv = await exportMenuItems(tenantId);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="menu-${new Date().toISOString().slice(0, 10)}.csv"`);
  return c.body(csv);
});

export default exports;
