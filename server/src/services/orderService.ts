import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';
import { emitOrderEvent } from '../lib/events.js';

export interface OrderItemInput {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  modifiers?: string;
}

export interface CreateOrderInput {
  tableId: string;
  customerName?: string;
  items: OrderItemInput[];
  notes?: string;
}

export async function createOrder(tenantId: string, input: CreateOrderInput) {
  const [table] = await db
    .select()
    .from(schema.tables)
    .where(and(eq(schema.tables.id, input.tableId), eq(schema.tables.tenantId, tenantId)))
    .limit(1);

  if (!table) {
    return { error: 'Table not found', status: 404 as const };
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
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    notes: item.notes,
    modifiers: item.modifiers,
  }));

  await db.insert(schema.orderItems).values(orderItems);

  await db.update(schema.tables)
    .set({ status: 'occupied' })
    .where(eq(schema.tables.id, input.tableId));

  logger.info({ tenantId, orderId, tableId: input.tableId }, 'Order created');
  emitOrderEvent({ type: 'order_created', tenantId, orderId });

  return {
    data: { id: orderId, items: orderItems, subtotal, tax, serviceCharge, total },
    status: 201 as const,
  };
}

export async function getTableOrders(tenantId: string, tableId: string) {
  return db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.tableId, tableId)))
    .orderBy(schema.orders.createdAt);
}

export async function getAllOrders(tenantId: string, statusFilter?: string) {
  const conditions = [eq(schema.orders.tenantId, tenantId)];
  if (statusFilter) {
    conditions.push(eq(schema.orders.status, statusFilter as typeof schema.orders.$inferSelect.status));
  }

  return db
    .select()
    .from(schema.orders)
    .where(and(...conditions))
    .orderBy(schema.orders.createdAt);
}

export async function getOrderDetail(tenantId: string, orderId: string) {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) {
    return { error: 'Order not found', status: 404 as const };
  }

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));

  return { data: { ...order, items }, status: 200 as const };
}

export async function updateOrderStatus(tenantId: string, orderId: string, status: string) {
  const updates: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (status === 'delivered') {
    updates.completedAt = new Date().toISOString();
  }

  await db.update(schema.orders)
    .set(updates)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)));

  logger.info({ tenantId, orderId, status }, 'Order status updated');
  emitOrderEvent({ type: 'order_updated', tenantId, orderId, data: { status } });
  emitOrderEvent({ type: 'order_status_changed', tenantId, orderId, data: { status } });
}

export async function getServerOrders(tenantId: string, serverId: string) {
  return db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.serverId, serverId)))
    .orderBy(schema.orders.createdAt);
}
