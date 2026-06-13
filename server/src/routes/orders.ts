import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { logger } from '../lib/logger.js';
import { emitOrderEvent } from '../lib/events.js';

const orders = new Hono();

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
  modifiers: z.string().optional(),
});

const createOrderSchema = z.object({
  tableId: z.string().min(1),
  customerName: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

// Customer: create order from table
orders.post('/:slug/orders', resolveTenant, zValidator('json', createOrderSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');

  const [table] = await db
    .select()
    .from(schema.tables)
    .where(and(eq(schema.tables.id, input.tableId), eq(schema.tables.tenantId, tenantId)))
    .limit(1);

  if (!table) {
    return c.json({ error: 'Table not found' }, 404);
  }

  const orderId = uuid();
  const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);

  const [tenantSettings] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  const taxRate = tenantSettings?.taxRate || 0;
  const serviceChargeRate = tenantSettings?.serviceCharge || 0;
  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * serviceChargeRate;
  const total = subtotal + tax + serviceCharge;

  await db.insert(schema.orders).values({
    id: orderId,
    tenantId,
    tableId: input.tableId,
    customerName: input.customerName,
    status: 'pending',
    itemCount,
    subtotal,
    tax,
    serviceCharge,
    total,
    notes: input.notes,
  });

  const orderItems = input.items.map((item) => ({
    id: uuid(),
    orderId,
    ...item,
  }));

  await db.insert(schema.orderItems).values(orderItems);

  await db.update(schema.tables)
    .set({ status: 'occupied' })
    .where(eq(schema.tables.id, input.tableId));

  logger.info({ tenantId, orderId, tableId: input.tableId }, 'Order created');
  emitOrderEvent({ type: 'order_created', tenantId, orderId });

  return c.json({ id: orderId, items: orderItems, subtotal, tax, serviceCharge, total }, 201);
});

// Get orders for a table
orders.get('/:slug/table/:tableId/orders', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const tableId = c.req.param('tableId')!;

  const result = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.tableId, tableId)))
    .orderBy(schema.orders.createdAt);

  return c.json(result);
});

// Staff: get all orders (filtered by status)
orders.get('/:slug/orders', authMiddleware, requireRole('admin', 'manager', 'kitchen', 'waiter'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');

  const conditions = [eq(schema.orders.tenantId, tenantId)];
  if (status) {
    conditions.push(eq(schema.orders.status, status as typeof schema.orders.$inferSelect.status));
  }

  const result = await db
    .select()
    .from(schema.orders)
    .where(and(...conditions))
    .orderBy(schema.orders.createdAt);

  return c.json(result);
});

// Staff: get order detail with items
orders.get('/:slug/orders/:orderId', authMiddleware, resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));

  return c.json({ ...order, items });
});

// Staff: update order status
orders.patch('/:slug/orders/:orderId/status', authMiddleware, requireRole('admin', 'manager', 'kitchen', 'waiter'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const { status } = await c.req.json<{ status: string }>();

  const updates: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (status === 'delivered') {
    updates.completedAt = new Date().toISOString();
  }

  await db.update(schema.orders)
    .set(updates)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)));

  logger.info({ tenantId, orderId, status }, 'Order status updated');
  emitOrderEvent({ type: 'order_status_changed', tenantId, orderId, data: { status } });
  return c.json({ success: true });
});

// Get orders served by a specific staff member
orders.get('/:slug/orders/server/:serverId', authMiddleware, resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const serverId = c.req.param('serverId')!;

  const result = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.serverId, serverId)))
    .orderBy(schema.orders.createdAt);

  return c.json(result);
});

export default orders;
