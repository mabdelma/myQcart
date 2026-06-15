import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { logger } from '../lib/logger.js';
import { parsePagination, buildPagination } from '../lib/pagination.js';

const users = new Hono();

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'manager', 'waiter', 'kitchen', 'cashier']),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'manager', 'waiter', 'kitchen', 'cashier']).optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

users.get('/:slug/users', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit } = parsePagination(c.req.query());
  const offset = (page - 1) * limit;

  const conditions = eq(schema.users.tenantId, tenantId);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(conditions);

  const data = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      phone: schema.users.phone,
      avatar: schema.users.avatar,
      isActive: schema.users.isActive,
      joinedAt: schema.users.joinedAt,
      lastActive: schema.users.lastActive,
    })
    .from(schema.users)
    .where(conditions)
    .orderBy(schema.users.joinedAt)
    .limit(limit)
    .offset(offset);

  return c.json(buildPagination(data, Number(count), { page, limit }));
});

users.post('/:slug/users', authMiddleware, requireRole('admin'), resolveTenant, zValidator('json', createUserSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, input.email), eq(schema.users.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  const userId = uuid();
  const passwordHash = await bcrypt.hash(input.password, 12);

  await db.insert(schema.users).values({
    id: userId,
    tenantId,
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    phone: input.phone,
  });

  logger.info({ tenantId, userId, role: input.role }, 'Staff user created');

  return c.json({
    id: userId,
    name: input.name,
    email: input.email,
    role: input.role,
    phone: input.phone,
  }, 201);
});

users.put('/:slug/users/:userId', authMiddleware, requireRole('admin'), resolveTenant, zValidator('json', updateUserSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.req.param('userId')!;
  const input = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.update(schema.users)
    .set({ ...input, lastActive: new Date().toISOString() })
    .where(eq(schema.users.id, userId));

  logger.info({ tenantId, userId }, 'Staff user updated');

  return c.json({ success: true });
});

users.patch('/:slug/users/:userId/status', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.req.param('userId')!;
  const { isActive } = await c.req.json<{ isActive: boolean }>();

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.update(schema.users)
    .set({ isActive, lastActive: new Date().toISOString() })
    .where(eq(schema.users.id, userId));

  logger.info({ tenantId, userId, isActive }, 'Staff user status updated');

  return c.json({ success: true });
});

users.delete('/:slug/users/:userId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.req.param('userId')!;

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.delete(schema.users)
    .where(eq(schema.users.id, userId));

  logger.info({ tenantId, userId }, 'Staff user deleted');

  return c.json({ success: true });
});

export default users;
