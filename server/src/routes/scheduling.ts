import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as svc from '../services/schedulingService.js';

const scheduling = new Hono();
const adminMgr = [authMiddleware, requireRole('admin', 'manager'), resolveTenant] as const;

const shiftSchema = z.object({
  userId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  role: z.string().optional(),
  notes: z.string().optional(),
});

scheduling.get('/:slug/shifts', ...adminMgr, async (c) => {
  const week = c.req.query('week') || new Date().toISOString().slice(0, 10);
  return c.json(await svc.listShifts(c.get('tenantId'), week));
});
scheduling.post('/:slug/shifts', ...adminMgr, zValidator('json', shiftSchema), async (c) =>
  c.json(await svc.createShift(c.get('tenantId'), c.req.valid('json')), 201));
scheduling.put('/:slug/shifts/:id', ...adminMgr, async (c) =>
  c.json(await svc.updateShift(c.get('tenantId'), c.req.param('id')!, await c.req.json())));
scheduling.delete('/:slug/shifts/:id', ...adminMgr, async (c) =>
  c.json(await svc.deleteShift(c.get('tenantId'), c.req.param('id')!)));

export default scheduling;
