import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createToken, verifyToken, getTokenFromRequest } from '../lib/auth.js';
import { logger } from '../lib/logger.js';
import { v4 as uuid } from 'uuid';

const auth = new Hono();

const registerSchema = z.object({
  tenantSlug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'manager', 'waiter', 'kitchen', 'cashier']).optional().default('waiter'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const input = c.req.valid('json');

  const [existingTenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, input.tenantSlug))
    .limit(1);

  if (!existingTenant) {
    return c.json({ error: 'Restaurant not found. Contact your admin.' }, 404);
  }

  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = uuid();

  await db.insert(schema.users).values({
    id: userId,
    tenantId: existingTenant.id,
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  const token = await createToken({
    sub: userId,
    userId,
    tenantId: existingTenant.id,
    role: input.role,
  });

  logger.info({ userId, tenantId: existingTenant.id, role: input.role }, 'User registered');

  return c.json({
    token,
    user: { id: userId, name: input.name, email: input.email, role: input.role },
  }, 201);
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const input = c.req.valid('json');

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  if (!user.isActive) {
    return c.json({ error: 'Account is disabled' }, 403);
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await createToken({
    sub: user.id,
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  await db
    .update(schema.users)
    .set({ lastActive: new Date().toISOString() })
    .where(eq(schema.users.id, user.id));

  logger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

auth.get('/me', async (c) => {
  const token = getTokenFromRequest(c);
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const userId = payload.userId;
  const tenantId = payload.tenantId;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      tenantId: user.tenantId,
      joinedAt: user.joinedAt,
    },
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      currency: tenant.currency,
      timezone: tenant.timezone,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
    } : null,
  });
});

export default auth;
