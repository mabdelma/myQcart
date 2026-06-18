import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { parsePagination } from '../lib/pagination.js';
import {
  createOrder,
  getTableOrders,
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  getServerOrders,
  updateOrderItems,
  applyDiscount,
  compOrderItem,
} from '../services/orderService.js';

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
  tableId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  orderType: z.enum(['dine_in', 'takeout', 'delivery']).optional().default('dine_in'),
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).optional().default(0),
  estimatedPickupTime: z.string().optional(),
  estimatedDeliveryTime: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

orders.post('/:slug/orders', resolveTenant, zValidator('json', createOrderSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');

  const result = await createOrder(tenantId, input);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

orders.get('/:slug/table/:tableId/orders', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const tableId = c.req.param('tableId')!;
  const result = await getTableOrders(tenantId, tableId);
  return c.json(result);
});

orders.get('/:slug/orders', authMiddleware, requireRole('admin', 'manager', 'kitchen', 'waiter'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');
  const orderType = c.req.query('orderType');
  const { page, limit } = parsePagination(c.req.query());
  const result = await getAllOrders(tenantId, status || undefined, orderType || undefined, { page, limit });
  return c.json(result);
});

orders.get('/:slug/orders/:orderId/track', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const result = await getOrderDetail(tenantId, orderId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

orders.get('/:slug/orders/:orderId', authMiddleware, resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;

  const result = await getOrderDetail(tenantId, orderId);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']),
});

orders.patch('/:slug/orders/:orderId/status', authMiddleware, requireRole('admin', 'manager', 'kitchen', 'waiter'), resolveTenant, zValidator('json', statusUpdateSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const { status } = c.req.valid('json');

  await updateOrderStatus(tenantId, orderId, status);
  return c.json({ success: true });
});

orders.get('/:slug/orders/server/:serverId', authMiddleware, resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const serverId = c.req.param('serverId')!;
  const result = await getServerOrders(tenantId, serverId);
  return c.json(result);
});

const updateOrderItemsSchema = z.object({
  addItems: z.array(z.object({
    menuItemId: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    notes: z.string().optional(),
    modifiers: z.string().optional(),
  })).optional(),
  removeItemIds: z.array(z.string().min(1)).optional(),
});

orders.patch('/:slug/orders/:orderId/items', authMiddleware, requireRole('admin', 'manager', 'waiter'), resolveTenant, zValidator('json', updateOrderItemsSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const input = c.req.valid('json');

  const result = await updateOrderItems(tenantId, orderId, input);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

const discountSchema = z.object({
  amount: z.number().min(0),
  reason: z.string().optional(),
});

orders.post('/:slug/orders/:orderId/discount', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', discountSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const input = c.req.valid('json');
  const result = await applyDiscount(tenantId, orderId, input);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

orders.post('/:slug/orders/:orderId/items/:itemId/comp', authMiddleware, requireRole('admin', 'manager', 'waiter'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.param('orderId')!;
  const itemId = c.req.param('itemId')!;
  const body = await c.req.json().catch(() => ({}));
  const isComp = body.isComp !== false;
  const result = await compOrderItem(tenantId, orderId, itemId, isComp);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

export default orders;
