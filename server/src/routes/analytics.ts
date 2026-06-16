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

analytics.get('/:slug/analytics/hourly-traffic', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const hourly = await db
    .select({
      hour: sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)::int`,
      orderCount: sql`COUNT(*)`,
      revenue: sql`COALESCE(SUM(${schema.orders.total}), 0)`,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
      )
    )
    .groupBy(sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)`)
    .orderBy(sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)`);

  return c.json({ data: hourly });
});

analytics.get('/:slug/analytics/category-performance', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const data = await db
    .select({
      categoryId: schema.menuCategories.id,
      categoryName: schema.menuCategories.name,
      totalSold: sql`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
      totalRevenue: sql`COALESCE(SUM(${schema.orderItems.unitPrice} * ${schema.orderItems.quantity}), 0)`,
    })
    .from(schema.menuCategories)
    .leftJoin(schema.menuItems, eq(schema.menuCategories.id, schema.menuItems.categoryId))
    .leftJoin(schema.orderItems, eq(schema.menuItems.id, schema.orderItems.menuItemId))
    .leftJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.menuCategories.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
      )
    )
    .groupBy(schema.menuCategories.id, schema.menuCategories.name)
    .orderBy(desc(sql`COALESCE(SUM(${schema.orderItems.unitPrice} * ${schema.orderItems.quantity}), 0)`));

  return c.json({ data });
});

analytics.get('/:slug/analytics/peak-hours', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const dayHour = await db
    .select({
      dayOfWeek: sql`EXTRACT(DOW FROM ${schema.orders.createdAt}::timestamp)::int`,
      hour: sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)::int`,
      orderCount: sql`COUNT(*)`,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.paymentStatus, 'paid'),
      )
    )
    .groupBy(
      sql`EXTRACT(DOW FROM ${schema.orders.createdAt}::timestamp)`,
      sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)`,
    )
    .orderBy(
      sql`EXTRACT(DOW FROM ${schema.orders.createdAt}::timestamp)`,
      sql`EXTRACT(HOUR FROM ${schema.orders.createdAt}::timestamp)`,
    );

  return c.json({ data: dayHour });
});

analytics.get('/:slug/analytics/item-pairings', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const items = await db
    .select({
      id: schema.orderItems.menuItemId,
      name: schema.orderItems.name,
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
    .orderBy(desc(sql`COUNT(*)`))
    .limit(20);

  return c.json({ data: items });
});

analytics.get('/:slug/analytics/recommendations', async (c) => {
  const tenantId = c.get('tenantId');
  const { menuItemId } = c.req.query();

  const items = await db
    .select({
      id: schema.menuItems.id,
      name: schema.menuItems.name,
      price: schema.menuItems.price,
      orderCount: sql`COUNT(DISTINCT ${schema.orders.id})`,
    })
    .from(schema.menuItems)
    .innerJoin(schema.orderItems, eq(schema.menuItems.id, schema.orderItems.menuItemId))
    .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.menuItems.tenantId, tenantId),
        eq(schema.menuItems.available, true),
        eq(schema.orders.paymentStatus, 'paid'),
        menuItemId ? sql`${schema.menuItems.id} != ${menuItemId}` : sql`1=1`,
      )
    )
    .groupBy(schema.menuItems.id, schema.menuItems.name, schema.menuItems.price)
    .orderBy(desc(sql`COUNT(DISTINCT ${schema.orders.id})`))
    .limit(6);

  return c.json({ data: items });
});

analytics.get('/:slug/analytics/trending', async (c) => {
  const tenantId = c.get('tenantId');

  const items = await db
    .select({
      id: schema.menuItems.id,
      name: schema.menuItems.name,
      price: schema.menuItems.price,
      recentOrders: sql`COUNT(*)`,
    })
    .from(schema.menuItems)
    .innerJoin(schema.orderItems, eq(schema.menuItems.id, schema.orderItems.menuItemId))
    .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.menuItems.tenantId, tenantId),
        eq(schema.menuItems.available, true),
        sql`${schema.orders.createdAt}::timestamp > NOW() - INTERVAL '7 days'`,
      )
    )
    .groupBy(schema.menuItems.id, schema.menuItems.name, schema.menuItems.price)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(5);

  return c.json({ data: items });
});

export default analytics;
