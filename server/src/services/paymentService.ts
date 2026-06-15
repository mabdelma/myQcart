import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

export async function createPaymentIntent(tenantId: string, orderId: string, tip?: number) {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) return { error: 'Order not found', status: 404 as const };
  if (order.paymentStatus === 'paid') return { error: 'Order already paid', status: 400 as const };

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

    return {
      data: { clientSecret: paymentIntent.client_secret, paymentId, amount },
      status: 200 as const,
    };
  }

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

  return {
    data: { status: 'paid', paymentId, amount, mock: true },
    status: 200 as const,
  };
}

export async function recordCashPayment(tenantId: string, orderId: string, amount: number, tip?: number) {
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

  return { id: paymentId, status: 'paid' };
}

export async function listPayments(tenantId: string) {
  return db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.tenantId, tenantId))
    .orderBy(schema.payments.createdAt);
}

export async function createPaymentLink(tenantId: string, orderId?: string, amount?: number, description?: string) {
  const linkId = uuid();
  const token = crypto.randomBytes(24).toString('hex');

  const stripe = getStripe();
  let stripeLinkId: string | undefined;

  if (stripe && amount) {
    const link = await stripe.paymentLinks.create({
      line_items: [{
        price: (await stripe.prices.create({
          currency: 'usd',
          product_data: { name: description || 'Restaurant Payment' },
          unit_amount: Math.round(amount * 100),
        })).id,
        quantity: 1,
      }] as Stripe.PaymentLinkCreateParams.LineItem[],
    });
    stripeLinkId = link.id;
  }

  await db.insert(schema.paymentLinks).values({
    id: linkId,
    tenantId,
    orderId,
    amount: amount || 0,
    description: description || 'Restaurant Payment',
    token,
    stripeLinkId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  logger.info({ tenantId, linkId }, 'Payment link created');

  return { id: linkId, token, url: `/pay/${token}` };
}

export async function handleStripeWebhook(body: string, signature: string) {
  const stripe = getStripe();
  if (!stripe) return { error: 'Stripe not configured', status: 501 as const };

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
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

    return { data: { received: true }, status: 200 as const };
  } catch (err) {
    logger.error({ err }, 'Stripe webhook verification failed');
    return { error: 'Webhook error', status: 400 as const };
  }
}

export async function getPaymentLinkByToken(token: string) {
  const [link] = await db
    .select()
    .from(schema.paymentLinks)
    .where(eq(schema.paymentLinks.token, token))
    .limit(1);

  if (!link) return { error: 'Payment link not found', status: 404 as const };
  if (link.status !== 'active') return { error: `Payment link is ${link.status}`, status: 400 as const };

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, link.tenantId))
    .limit(1);

  return {
    data: {
      id: link.id,
      orderId: link.orderId,
      amount: link.amount,
      description: link.description,
      tenantName: tenant?.name,
      tenantSlug: tenant?.slug,
      tenantLogo: tenant?.logoUrl,
      status: link.status,
      expiresAt: link.expiresAt,
    },
    status: 200 as const,
  };
}
