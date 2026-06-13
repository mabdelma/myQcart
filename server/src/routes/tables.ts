import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { logger } from '../lib/logger.js';

const tables = new Hono();

const tableSchema = z.object({
  number: z.number().int().positive(),
  capacity: z.number().int().positive().optional().default(2),
  xPos: z.number().optional(),
  yPos: z.number().optional(),
});

// Public: resolve a table by QR token (no slug needed)
tables.get('/resolve/:qrToken', async (c) => {
  const qrToken = c.req.param('qrToken')!;

  const [table] = await db
    .select()
    .from(schema.tables)
    .where(eq(schema.tables.qrToken, qrToken))
    .limit(1);

  if (!table) {
    return c.json({ error: 'Table not found' }, 404);
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, table.tenantId))
    .limit(1);

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  return c.json({
    id: table.id,
    number: table.number,
    capacity: table.capacity,
    status: table.status,
    qrToken: table.qrToken,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
  });
});

// Public: get table info by QR token (requires slug)
tables.get('/:slug/table/:qrToken', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const qrToken = c.req.param('qrToken')!;

  const [table] = await db
    .select()
    .from(schema.tables)
    .where(and(eq(schema.tables.qrToken, qrToken), eq(schema.tables.tenantId, tenantId)))
    .limit(1);

  if (!table) {
    return c.json({ error: 'Table not found' }, 404);
  }

  return c.json({
    id: table.id,
    number: table.number,
    capacity: table.capacity,
    status: table.status,
  });
});

// Protected: manage tables
tables.post('/:slug/tables', authMiddleware, requireRole('admin'), resolveTenant, zValidator('json', tableSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const id = uuid();
  const qrToken = crypto.randomBytes(16).toString('hex');

  await db.insert(schema.tables).values({ id, tenantId, qrToken, ...input });

  logger.info({ tenantId, tableId: id, number: input.number }, 'Table created');
  return c.json({ id, qrToken, ...input }, 201);
});

tables.get('/:slug/tables', authMiddleware, requireRole('admin', 'manager', 'waiter'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const result = await db
    .select()
    .from(schema.tables)
    .where(eq(schema.tables.tenantId, tenantId))
    .orderBy(schema.tables.number);

  return c.json(result);
});

tables.put('/:slug/tables/:tableId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const tableId = c.req.param('tableId')!;
  const body = await c.req.json();

  const allowed = ['number', 'capacity', 'status', 'xPos', 'yPos'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await db.update(schema.tables)
    .set(updates)
    .where(and(eq(schema.tables.id, tableId), eq(schema.tables.tenantId, tenantId)));

  return c.json({ success: true });
});

tables.delete('/:slug/tables/:tableId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const tableId = c.req.param('tableId')!;

  await db.delete(schema.tables)
    .where(and(eq(schema.tables.id, tableId), eq(schema.tables.tenantId, tenantId)));

  return c.json({ success: true });
});

export default tables;
