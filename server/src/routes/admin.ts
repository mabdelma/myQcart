import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

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

  return c.json({
    ...tenant,
    stats: {
      users: Number(userCount?.count || 0),
      orders: Number(orderCount?.count || 0),
      revenue: Number(revenueResult?.total || 0),
    },
  });
});

admin.put('/admin/tenants/:tenantId/status', authMiddleware, requireRole('super_admin'), async (c) => {
  const tenantId = c.req.param('tenantId')!;
  const { isActive } = await c.req.json<{ isActive: boolean }>();

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

  return c.json({
    tenants: Number(tenantCount?.count || 0),
    activeTenants: Number(activeTenantCount?.count || 0),
    users: Number(userCount?.count || 0),
    orders: Number(orderCount?.count || 0),
    revenue: Number(totalRevenue?.total || 0),
  });
});

export default admin;
