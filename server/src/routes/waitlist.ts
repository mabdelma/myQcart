import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { db, schema } from '../db/index.js';
import {
  joinWaitlist,
  getWaitlist,
  updateWaitlistStatus,
  deleteWaitlistEntry,
} from '../services/waitlistService.js';

const waitlist = new Hono();

const joinSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().or(z.literal('')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  partySize: z.number().int().positive(),
  notes: z.string().optional().or(z.literal('')),
  source: z.enum(['web', 'staff']).optional().default('web'),
});

const statusUpdateSchema = z.object({
  status: z.enum(['waiting', 'notified', 'seated', 'cancelled', 'expired']),
});

// Public: join waitlist
waitlist.post('/:slug/waitlist', resolveTenant, zValidator('json', joinSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const result = await joinWaitlist(tenantId, input);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

// Public: get waitlist status by phone (for customers to check position)
waitlist.get('/:slug/waitlist/status', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const phone = c.req.query('phone');
  if (!phone) return c.json({ error: 'Phone number required' }, 400);

  const [entry] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.tenantId, tenantId), eq(schema.waitlistEntries.customerPhone, phone), eq(schema.waitlistEntries.status, 'waiting')))
    .limit(1);

  if (!entry) return c.json({ status: 'not_found' });
  return c.json({ status: entry.status, position: entry.position, estimatedWaitMinutes: entry.estimatedWaitMinutes });
});

// Auth: list waitlist
waitlist.get('/:slug/waitlist', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');
  const result = await getWaitlist(tenantId, status || undefined);
  return c.json(result.data);
});

// Auth: update status
waitlist.patch('/:slug/waitlist/:entryId/status', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', statusUpdateSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const entryId = c.req.param('entryId')!;
  const { status } = c.req.valid('json');
  const result = await updateWaitlistStatus(tenantId, entryId, status);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

// Auth: delete entry
waitlist.delete('/:slug/waitlist/:entryId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const entryId = c.req.param('entryId')!;
  const result = await deleteWaitlistEntry(tenantId, entryId);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

export default waitlist;
