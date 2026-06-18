import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getSubscription, createCheckoutSession, cancelSubscription, PLANS } from '../services/subscriptionService.js';
import { db, schema } from '../db/index.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import { logger } from '../lib/logger.js';
import { updateTenantSettings } from '../services/tenantService.js';

const admin = new Hono();

admin.get('/admin/tenants', authMiddleware, requireRole('super_admin'), async (c) => {
  const result = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      slug: schema.tenants.slug,
      email: schema.tenants.email,
      isActive: schema.tenants.isActive,
      currency: schema.tenants.currency,
      createdAt: schema.tenants.createdAt,
    })
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt));

  return c.json(result);
});

admin.get('/admin/tenants/:tenantId', authMiddleware, requireRole('super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));

  const [orderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const [revenueResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(schema.payments)
    .where(sql`${schema.payments.tenantId} = ${tenantId} AND ${schema.payments.status} = 'paid'`);

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId));

  const [tableCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tables)
    .where(eq(schema.tables.tenantId, tenantId));

  const [menuItemCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.menuItems)
    .where(eq(schema.menuItems.tenantId, tenantId));

  const storageEstimate = `${
    (Number(userCount?.count || 0) * 5 +
     Number(orderCount?.count || 0) * 2 +
     Number(customerCount?.count || 0) * 3 +
     Number(menuItemCount?.count || 0) * 4)
  } KB`;

  return c.json({
    ...tenant,
    stats: {
      users: Number(userCount?.count || 0),
      orders: Number(orderCount?.count || 0),
      revenue: Number(revenueResult?.total || 0),
      customers: Number(customerCount?.count || 0),
      tables: Number(tableCount?.count || 0),
      menuItems: Number(menuItemCount?.count || 0),
      storageEstimate,
    },
  });
});

admin.put('/admin/tenants/:tenantId/status', authMiddleware, requireRole('super_admin'), auditLog('update', 'tenant_status'), zValidator('json', z.object({ isActive: z.boolean() })), async (c) => {
  const tenantId = c.req.param('tenantId')!;
  const { isActive } = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  await db.update(schema.tenants)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(schema.tenants.id, tenantId));

  logger.info({ tenantId, isActive }, 'Tenant status updated by super admin');

  return c.json({ success: true });
});

admin.put('/admin/tenants/:tenantId/settings', authMiddleware, requireRole('super_admin'), auditLog('update', 'tenant_settings'), async (c) => {
  const { tenantId } = c.req.param();
  const body = await c.req.json();
  const [existing] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  await updateTenantSettings(tenantId, body);
  return c.json({ success: true });
});

admin.get('/admin/analytics', authMiddleware, requireRole('super_admin'), async (c) => {
  const [tenantCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tenants);

  const [activeTenantCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tenants)
    .where(eq(schema.tenants.isActive, true));

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);

  const [orderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders);

  const [totalRevenue] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(schema.payments)
    .where(eq(schema.payments.status, 'paid'));

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.customers);

  const [tableCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tables);

  const [menuItemCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.menuItems);

  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
  const [thisMonthOrders] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(sql`created_at >= ${lastMonth}`);

  const priorMonth = new Date(Date.now() - 60 * 86400000).toISOString();
  const [priorMonthOrders] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(and(sql`created_at >= ${priorMonth}`, sql`created_at < ${lastMonth}`));

  const monthlyGrowth = priorMonthOrders?.count && priorMonthOrders.count > 0
    ? Math.round(((Number(thisMonthOrders?.count || 0) - Number(priorMonthOrders.count)) / Number(priorMonthOrders.count)) * 100)
    : 0;

  return c.json({
    tenants: Number(tenantCount?.count || 0),
    activeTenants: Number(activeTenantCount?.count || 0),
    users: Number(userCount?.count || 0),
    orders: Number(orderCount?.count || 0),
    revenue: Number(totalRevenue?.total || 0),
    customers: Number(customerCount?.count || 0),
    tables: Number(tableCount?.count || 0),
    menuItems: Number(menuItemCount?.count || 0),
    monthlyGrowth,
  });
});

admin.get('/admin/tenants/:tenantId/usage', authMiddleware, requireRole('super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));

  const [orderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const [revenueResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(schema.payments)
    .where(sql`${schema.payments.tenantId} = ${tenantId} AND ${schema.payments.status} = 'paid'`);

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId));

  const [tableCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tables)
    .where(eq(schema.tables.tenantId, tenantId));

  const [menuItemCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.menuItems)
    .where(eq(schema.menuItems.tenantId, tenantId));

  const storageEstimate = `${
    (Number(userCount?.count || 0) * 5 +
     Number(orderCount?.count || 0) * 2 +
     Number(customerCount?.count || 0) * 3 +
     Number(menuItemCount?.count || 0) * 4)
  } KB`;

  return c.json({
    users: Number(userCount?.count || 0),
    orders: Number(orderCount?.count || 0),
    revenue: Number(revenueResult?.total || 0),
    customers: Number(customerCount?.count || 0),
    tables: Number(tableCount?.count || 0),
    menuItems: Number(menuItemCount?.count || 0),
    storageEstimate,
  });
});

// Real subscription billing (Stripe). A non-super_admin may only touch their own tenant.
function assertTenantAccess(c: Context, tenantId: string): boolean {
  const role = c.get('role');
  const own = c.get('userTenantId');
  return role === 'super_admin' || own === tenantId;
}

admin.get('/admin/subscriptions/:tenantId', authMiddleware, requireRole('admin', 'manager', 'super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;
  if (!assertTenantAccess(c, tenantId)) return c.json({ error: 'Forbidden' }, 403);

  const [tenantRecord] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
  if (!tenantRecord) return c.json({ error: 'Tenant not found' }, 404);

  const sub = await getSubscription(tenantId);
  return c.json({
    plan: sub.plan,
    plans: PLANS,
    status: sub.status,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    renewDate: sub.currentPeriodEnd,
    billingEnabled: sub.billingEnabled,
    usage: sub.usage,
  });
});

// Start a Stripe Checkout (subscription) for a plan → returns a redirect URL.
admin.post('/admin/subscriptions/:tenantId/checkout', authMiddleware, requireRole('admin', 'super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;
  if (!assertTenantAccess(c, tenantId)) return c.json({ error: 'Forbidden' }, 403);
  const { planId } = await c.req.json() as { planId: string };

  const [tenantRecord] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
  if (!tenantRecord) return c.json({ error: 'Tenant not found' }, 404);

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const result = await createCheckoutSession(
    { id: tenantId, email: tenantRecord.email },
    planId,
    `${base}/admin/subscription?status=success`,
    `${base}/admin/subscription?status=cancelled`,
  );
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

admin.post('/admin/subscriptions/:tenantId/cancel', authMiddleware, requireRole('admin', 'super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;
  if (!assertTenantAccess(c, tenantId)) return c.json({ error: 'Forbidden' }, 403);
  const result = await cancelSubscription(tenantId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

export default admin;
