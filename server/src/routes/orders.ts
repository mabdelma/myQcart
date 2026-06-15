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
  tableId: z.string().min(1),
  customerName: z.string().optional(),
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
  const { page, limit } = parsePagination(c.req.query());
  const result = await getAllOrders(tenantId, status || undefined, { page, limit });
  return c.json(result);
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

export default orders;
