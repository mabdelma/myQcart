import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

const analytics = new Hono();

analytics.get('/:slug/analytics/summary', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const [todaysSales] = await db
    .select({ value: sql`COALESCE(SUM(${schema.orders.total}), 0)` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
        gte(sql`${schema.orders.createdAt}::timestamp`, sql`CURRENT_DATE`),
        lte(sql`${schema.orders.createdAt}::timestamp`, sql`CURRENT_DATE + INTERVAL '1 day'`),
      )
    );

  const [totalSales] = await db
    .select({ value: sql`COALESCE(SUM(${schema.orders.total}), 0)` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
      )
    );

  const [avgPrep] = await db
    .select({ value: sql`COALESCE(AVG(EXTRACT(EPOCH FROM (${schema.orders.completedAt}::timestamp - ${schema.orders.createdAt}::timestamp)) / 60), 0)` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.status, 'delivered'),
        sql`${schema.orders.completedAt} IS NOT NULL`,
      )
    );

  const [activeTables] = await db
    .select({ value: sql`COUNT(*)` })
    .from(schema.tables)
    .where(
      and(
        eq(schema.tables.tenantId, tenantId),
        eq(schema.tables.status, 'occupied'),
      )
    );

  const [totalTables] = await db
    .select({ value: sql`COUNT(*)` })
    .from(schema.tables)
    .where(eq(schema.tables.tenantId, tenantId));

  const [delayedOrders] = await db
    .select({ value: sql`COUNT(*)` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        sql`${schema.orders.status} NOT IN ('delivered', 'cancelled')`,
        sql`${schema.orders.createdAt}::timestamp < NOW() - INTERVAL '15 minutes'`,
      )
    );

  const [pendingOrders] = await db
    .select({ value: sql`COUNT(*)` })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        sql`${schema.orders.status} NOT IN ('delivered', 'cancelled')`,
      )
    );

  const popularItems = await db
    .select({
      menuItemId: schema.orderItems.menuItemId,
      name: schema.orderItems.name,
      totalQuantity: sql`SUM(${schema.orderItems.quantity})`,
    })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
      )
    )
    .groupBy(schema.orderItems.menuItemId, schema.orderItems.name)
    .orderBy(desc(sql`SUM(${schema.orderItems.quantity})`))
    .limit(5);

  return c.json({
    todaysSales: Number(todaysSales.value),
    totalSales: Number(totalSales.value),
    averagePreparationTime: Math.round(Number(avgPrep.value)),
    activeTables: Number(activeTables.value),
    totalTables: Number(totalTables.value),
    delayedOrders: Number(delayedOrders.value),
    pendingOrders: Number(pendingOrders.value),
    popularItems,
  });
});

analytics.get('/:slug/analytics/revenue', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const daily = await db
    .select({
      date: sql`DATE(${schema.payments.createdAt}::timestamp)`,
      revenue: sql`COALESCE(SUM(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, 'paid'),
        gte(sql`${schema.payments.createdAt}::timestamp`, sql`CURRENT_DATE - INTERVAL '6 days'`),
      )
    )
    .groupBy(sql`DATE(${schema.payments.createdAt}::timestamp)`)
    .orderBy(sql`DATE(${schema.payments.createdAt}::timestamp)`);

  return c.json({ daily });
});

analytics.get('/:slug/analytics/financial', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const [dailyRevenue] = await db
    .select({ value: sql`COALESCE(SUM(${schema.payments.amount}), 0)` })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, 'paid'),
        gte(sql`${schema.payments.createdAt}::timestamp`, sql`CURRENT_DATE`),
        lte(sql`${schema.payments.createdAt}::timestamp`, sql`CURRENT_DATE + INTERVAL '1 day'`),
      )
    );

  const [weeklyRevenue] = await db
    .select({ value: sql`COALESCE(SUM(${schema.payments.amount}), 0)` })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, 'paid'),
        gte(sql`${schema.payments.createdAt}::timestamp`, sql`CURRENT_DATE - INTERVAL '6 days'`),
      )
    );

  const [monthlyRevenue] = await db
    .select({ value: sql`COALESCE(SUM(${schema.payments.amount}), 0)` })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, 'paid'),
        gte(sql`${schema.payments.createdAt}::timestamp`, sql`CURRENT_DATE - INTERVAL '29 days'`),
      )
    );

  const methods = await db
    .select({
      method: schema.payments.method,
      count: sql`COUNT(*)`,
    })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, 'paid'),
      )
    )
    .groupBy(schema.payments.method);

  const paymentMethods: Record<string, number> = { card: 0, cash: 0, wallet: 0, crypto: 0 };
  for (const m of methods) {
    paymentMethods[m.method] = Number(m.count);
  }

  return c.json({
    dailyRevenue: Number(dailyRevenue.value),
    weeklyRevenue: Number(weeklyRevenue.value),
    monthlyRevenue: Number(monthlyRevenue.value),
    paymentMethods,
  });
});

export default analytics;
