import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const tenants = new Hono();

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  email: z.string().email(),
  phone: z.string().optional(),
  adminName: z.string().min(1).max(100),
  adminPassword: z.string().min(6).max(100),
});

tenants.post('/', zValidator('json', createTenantSchema), async (c) => {
  const input = c.req.valid('json');

  const [existingSlug] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, input.slug))
    .limit(1);

  if (existingSlug) {
    return c.json({ error: 'Restaurant slug already taken' }, 409);
  }

  const tenantId = uuid();
  const adminId = uuid();
  const passwordHash = await bcrypt.hash(input.adminPassword, 12);

  await db.insert(schema.tenants).values({
    id: tenantId,
    name: input.name,
    slug: input.slug,
    email: input.email,
    phone: input.phone,
  });

  await db.insert(schema.users).values({
    id: adminId,
    tenantId,
    name: input.adminName,
    email: input.email,
    passwordHash,
    role: 'admin',
  });

  logger.info({ tenantId, slug: input.slug }, 'Tenant created');

  return c.json({
    tenant: { id: tenantId, name: input.name, slug: input.slug },
    admin: { id: adminId, name: input.adminName, email: input.email },
  }, 201);
});

tenants.get('/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    coverImage: tenant.coverImage,
    primaryColor: tenant.primaryColor,
    currency: tenant.currency,
  });
});

tenants.put('/:slug/settings', authMiddleware, requireRole('admin'), async (c) => {
  const slug = c.req.param('slug')!;
  const body = await c.req.json();
  const tenantId = c.get('tenantId');

  const allowed = ['name', 'phone', 'address', 'currency', 'timezone', 'logoUrl', 'coverImage', 'primaryColor', 'taxRate', 'serviceCharge', 'stripeAccountId'];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  updates.updatedAt = new Date().toISOString();

  await db.update(schema.tenants)
    .set(updates)
    .where(eq(schema.tenants.id, tenantId));

  logger.info({ tenantId }, 'Tenant settings updated');

  return c.json({ success: true });
});

export default tenants;
