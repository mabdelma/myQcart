import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

export async function onboardTenant(data: {
  restaurantName: string;
  slug: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
}) {
  const existing = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, data.slug)).limit(1);
  if (existing.length > 0) return { error: 'Restaurant slug already taken', status: 409 as const };

  const tenantId = uuid();
  const userId = uuid();

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.insert(schema.tenants).values({
    id: tenantId,
    name: data.restaurantName,
    slug: data.slug,
    email: data.email,
    phone: data.phone,
    address: data.address,
    currency: data.currency || 'USD',
    timezone: data.timezone || 'UTC',
  });

  await db.insert(schema.users).values({
    id: userId,
    tenantId,
    name: 'Owner',
    email: data.email,
    passwordHash,
    role: 'admin',
    emailVerified: false,
    verificationToken: crypto.randomBytes(32).toString('hex'),
  });

  const defaultPlan = await db.select().from(schema.subscriptionPlans).limit(1);
  if (defaultPlan.length > 0) {
    const subId = uuid();
    await db.insert(schema.tenantSubscriptions).values({
      id: subId,
      tenantId,
      planId: defaultPlan[0].id,
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  logger.info({ tenantId, slug: data.slug }, 'New tenant onboarded');
  return { data: { tenantId, slug: data.slug }, status: 201 as const };
}

export async function getPlans() {
  return db.select().from(schema.subscriptionPlans).orderBy(schema.subscriptionPlans.price);
}

export async function createPlan(data: { name: string; price: number; maxMenus?: number; maxTables?: number; maxStaff?: number; features?: string }) {
  const id = uuid();
  await db.insert(schema.subscriptionPlans).values({ id, ...data });
  return { id };
}
