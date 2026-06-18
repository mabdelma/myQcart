import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as timeService from '../services/timeTrackingService.js';

const timeRoutes = new Hono();

timeRoutes.use('*', authMiddleware, resolveTenant);

timeRoutes.post('/:slug/time/clock-in', async (c) => {
  const tenantId = c.get('tenantId')!;
  const userId = c.get('userId')!;
  const body = await c.req.json().catch(() => ({}));
  const entry = await timeService.clockIn(tenantId, userId, body.notes);
  return c.json(entry, 201);
});

timeRoutes.post('/:slug/time/clock-out', async (c) => {
  const tenantId = c.get('tenantId')!;
  const userId = c.get('userId')!;
  const body = await c.req.json().catch(() => ({}));
  const entry = await timeService.clockOut(tenantId, userId, body.notes);
  return c.json(entry);
});

timeRoutes.get('/:slug/time/active', requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const active = await timeService.getActiveShifts(tenantId);
  return c.json(active);
});

timeRoutes.get('/:slug/time/timesheet', requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const userId = c.req.query('userId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const entries = await timeService.getTimesheet(tenantId, userId || undefined, startDate || undefined, endDate || undefined);
  return c.json(entries);
});

export default timeRoutes;
