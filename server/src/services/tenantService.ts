import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';

export interface CreateTenantInput {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  adminName: string;
  adminPassword: string;
}

export async function createTenant(input: CreateTenantInput) {
  const [existingSlug] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, input.slug))
    .limit(1);

  if (existingSlug) {
    return { error: 'Restaurant slug already taken', status: 409 as const };
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

  return {
    data: {
      tenant: { id: tenantId, name: input.name, slug: input.slug },
      admin: { id: adminId, name: input.adminName, email: input.email },
    },
    status: 201 as const,
  };
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    return { error: 'Not found', status: 404 as const };
  }

  return {
    data: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      coverImage: tenant.coverImage,
      primaryColor: tenant.primaryColor,
      currency: tenant.currency,
      googleReviewUrl: tenant.googleReviewUrl,
    },
    status: 200 as const,
  };
}

export async function updateTenantSettings(tenantId: string, body: Record<string, unknown>) {
  const allowed = ['name', 'phone', 'address', 'currency', 'timezone', 'logoUrl', 'coverImage', 'primaryColor', 'accentColor', 'taxRate', 'serviceCharge', 'stripeAccountId', 'googleReviewUrl'];

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
}
