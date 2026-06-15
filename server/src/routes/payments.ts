import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { parsePagination } from '../lib/pagination.js';
import {
  createPaymentIntent,
  recordCashPayment,
  listPayments,
  createPaymentLink,
  handleStripeWebhook,
  getPaymentLinkByToken,
} from '../services/paymentService.js';

const payments = new Hono();

payments.post('/:slug/payments/create-intent', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, tip } = await c.req.json<{ orderId: string; tip?: number }>();

  const result = await createPaymentIntent(tenantId, orderId, tip);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

payments.post('/:slug/payments/cash', authMiddleware, requireRole('admin', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, amount, tip } = await c.req.json<{ orderId: string; amount: number; tip?: number }>();
  const result = await recordCashPayment(tenantId, orderId, amount, tip);
  return c.json(result, 201);
});

payments.get('/:slug/payments', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { page, limit } = parsePagination(c.req.query());
  const result = await listPayments(tenantId, { page, limit });
  return c.json(result);
});

payments.post('/:slug/payment-links', authMiddleware, requireRole('admin', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, amount, description } = await c.req.json<{ orderId?: string; amount: number; description?: string }>();
  const result = await createPaymentLink(tenantId, orderId, amount, description);
  return c.json(result, 201);
});

export const webhookRoutes = new Hono();

webhookRoutes.post('/webhooks/stripe', async (c) => {
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  const result = await handleStripeWebhook(body, sig);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

payments.get('/payment-links/:token', async (c) => {
  const token = c.req.param('token')!;
  const result = await getPaymentLinkByToken(token);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

export default payments;
