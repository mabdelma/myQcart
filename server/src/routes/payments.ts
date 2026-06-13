import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { logger } from '../lib/logger.js';
import Stripe from 'stripe';

const payments = new Hono();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

// Customer: create payment intent for an order
payments.post('/:slug/payments/create-intent', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, tip } = await c.req.json<{ orderId: string; tip?: number }>();

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) return c.json({ error: 'Order not found' }, 404);
  if (order.paymentStatus === 'paid') return c.json({ error: 'Order already paid' }, 400);

  const stripe = getStripe();
  const amount = Math.round((order.total + (tip || 0)) * 100);

  if (stripe) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { orderId, tenantId },
    });

    const paymentId = uuid();
    await db.insert(schema.payments).values({
      id: paymentId,
      tenantId,
      orderId,
      amount: order.total,
      tip: tip || 0,
      method: 'card',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    logger.info({ tenantId, orderId, paymentId }, 'Payment intent created');

    return c.json({
      clientSecret: paymentIntent.client_secret,
      paymentId,
      amount,
    });
  }

  // No Stripe key: mock payment for development
  const paymentId = uuid();
  await db.insert(schema.payments).values({
    id: paymentId,
    tenantId,
    orderId,
    amount: order.total,
    tip: tip || 0,
    method: 'card',
    status: 'paid',
  });

  await db.update(schema.orders)
    .set({ paymentStatus: 'paid', updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, orderId));

  logger.info({ tenantId, orderId, paymentId }, 'Mock payment processed');

  return c.json({
    status: 'paid',
    paymentId,
    amount,
    mock: true,
  });
});

// Staff: record cash payment
payments.post('/:slug/payments/cash', authMiddleware, requireRole('admin', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, amount, tip } = await c.req.json<{ orderId: string; amount: number; tip?: number }>();

  const paymentId = uuid();
  await db.insert(schema.payments).values({
    id: paymentId,
    tenantId,
    orderId,
    amount,
    tip: tip || 0,
    method: 'cash',
    status: 'paid',
  });

  await db.update(schema.orders)
    .set({ paymentStatus: 'paid', updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, orderId));

  logger.info({ tenantId, orderId, paymentId, method: 'cash' }, 'Cash payment recorded');
  return c.json({ id: paymentId, status: 'paid' }, 201);
});

// Admin: list payments for a tenant
payments.get('/:slug/payments', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const result = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.tenantId, tenantId))
    .orderBy(schema.payments.createdAt);

  return c.json(result);
});

// Payment Links
payments.post('/:slug/payment-links', authMiddleware, requireRole('admin', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const { orderId, amount, description } = await c.req.json<{ orderId?: string; amount: number; description?: string }>();

  const linkId = uuid();
  const token = crypto.randomBytes(24).toString('hex');

  const stripe = getStripe();
  let stripeLinkId: string | undefined;

  if (stripe) {
    const link = await stripe.paymentLinks.create({
      line_items: [{
        price: (await stripe.prices.create({
          currency: 'usd',
          product_data: { name: description || 'Restaurant Payment' },
          unit_amount: Math.round(amount * 100),
        })).id,
        quantity: 1,
      }] as any,
    });
    stripeLinkId = link.id;
  }

  await db.insert(schema.paymentLinks).values({
    id: linkId,
    tenantId,
    orderId,
    amount,
    description: description || 'Restaurant Payment',
    token,
    stripeLinkId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  logger.info({ tenantId, linkId }, 'Payment link created');
  return c.json({ id: linkId, token, url: `/pay/${token}` }, 201);
});

export const webhookRoutes = new Hono();

webhookRoutes.post('/webhooks/stripe', async (c) => {
  const stripe = getStripe();
  if (!stripe) return c.json({ error: 'Stripe not configured' }, 501);

  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    const intent = event.data.object as Stripe.PaymentIntent;

    if (event.type === 'payment_intent.succeeded') {
      const orderId = intent.metadata.orderId;
      if (orderId) {
        await db.update(schema.orders)
          .set({ paymentStatus: 'paid', updatedAt: new Date().toISOString() })
          .where(eq(schema.orders.id, orderId));

        await db.update(schema.payments)
          .set({ status: 'paid' })
          .where(eq(schema.payments.stripePaymentIntentId, intent.id));

        logger.info({ orderId, paymentIntent: intent.id }, 'Stripe payment succeeded');
      }
    }

    return c.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Stripe webhook verification failed');
    return c.json({ error: 'Webhook error' }, 400);
  }
});

// Public: get payment link info
payments.get('/payment-links/:token', async (c) => {
  const token = c.req.param('token')!;

  const [link] = await db
    .select()
    .from(schema.paymentLinks)
    .where(eq(schema.paymentLinks.token, token))
    .limit(1);

  if (!link) return c.json({ error: 'Payment link not found' }, 404);
  if (link.status !== 'active') return c.json({ error: `Payment link is ${link.status}` }, 400);

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, link.tenantId))
    .limit(1);

  return c.json({
    amount: link.amount,
    description: link.description,
    tenantName: tenant?.name,
    tenantLogo: tenant?.logoUrl,
    status: link.status,
  });
});

export default payments;
