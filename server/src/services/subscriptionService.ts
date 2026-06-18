import Stripe from 'stripe';
import { eq, desc, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { logger } from '../lib/logger.js';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  usersLimit: number;
  ordersLimit: number;
  priceEnv: string; // env var holding the Stripe Price id
}

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 29, usersLimit: 3, ordersLimit: 500, priceEnv: 'STRIPE_PRICE_STARTER' },
  { id: 'growth', name: 'Growth', price: 79, usersLimit: 10, ordersLimit: 2000, priceEnv: 'STRIPE_PRICE_GROWTH' },
  { id: 'enterprise', name: 'Enterprise', price: 199, usersLimit: 50, ordersLimit: 10000, priceEnv: 'STRIPE_PRICE_ENTERPRISE' },
];

export function getPlan(planId: string) {
  return PLANS.find((p) => p.id === planId);
}

function priceIdFor(planId: string): string | null {
  const plan = getPlan(planId);
  if (!plan) return null;
  return process.env[plan.priceEnv] || null;
}

const iso = (unixSeconds?: number | null) =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

/** Current subscription for a tenant (from our DB), or a default trial. */
export async function getSubscription(tenantId: string) {
  const [sub] = await db
    .select()
    .from(schema.tenantSubscriptions)
    .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
    .orderBy(desc(schema.tenantSubscriptions.createdAt))
    .limit(1);

  const planId = sub?.planId || 'starter';
  const plan = getPlan(planId) || PLANS[0];

  const usersRes = await db.execute(sql`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = ${tenantId}`);
  const ordersRes = await db.execute(sql`SELECT COUNT(*)::int AS c FROM orders WHERE tenant_id = ${tenantId}`);
  const users = (usersRes.rows[0] as { c: number } | undefined);
  const orders = (ordersRes.rows[0] as { c: number } | undefined);

  return {
    plan,
    status: sub?.status || 'trial',
    stripeSubscriptionId: sub?.stripeSubscriptionId || null,
    currentPeriodEnd: sub?.currentPeriodEnd || sub?.trialEndsAt || null,
    billingEnabled: !!priceIdFor(planId) && !!process.env.STRIPE_SECRET_KEY,
    usage: { users: Number(users?.c || 0), orders: Number(orders?.c || 0) },
  };
}

/** Create a Stripe Checkout Session (subscription mode) for a plan. */
export async function createCheckoutSession(
  tenant: { id: string; email: string },
  planId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const stripe = getStripe();
  if (!stripe) return { error: 'Billing not configured (no Stripe key)', status: 501 as const };

  const price = priceIdFor(planId);
  if (!price) return { error: `Plan "${planId}" has no Stripe price configured`, status: 400 as const };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer_email: tenant.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId: tenant.id, planId },
    subscription_data: { metadata: { tenantId: tenant.id, planId } },
  });

  return { data: { url: session.url }, status: 200 as const };
}

export async function cancelSubscription(tenantId: string) {
  const sub = await getSubscription(tenantId);
  if (!sub.stripeSubscriptionId) return { error: 'No active subscription', status: 400 as const };
  const stripe = getStripe();
  if (!stripe) return { error: 'Billing not configured', status: 501 as const };

  await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
  logger.info({ tenantId }, 'Subscription set to cancel at period end');
  return { data: { success: true }, status: 200 as const };
}

async function upsert(tenantId: string, values: Partial<typeof schema.tenantSubscriptions.$inferInsert>) {
  const [existing] = await db
    .select()
    .from(schema.tenantSubscriptions)
    .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
    .orderBy(desc(schema.tenantSubscriptions.createdAt))
    .limit(1);

  if (existing) {
    await db.update(schema.tenantSubscriptions).set(values).where(eq(schema.tenantSubscriptions.id, existing.id));
  } else {
    await db.insert(schema.tenantSubscriptions).values({
      id: uuid(),
      tenantId,
      planId: values.planId || 'starter',
      ...values,
    });
  }
}

/** Handle Stripe billing webhook events (called from the shared webhook). */
export async function handleSubscriptionEvent(event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== 'subscription') return false;
      const tenantId = s.metadata?.tenantId;
      const planId = s.metadata?.planId || 'starter';
      if (!tenantId) return true;
      const stripe = getStripe();
      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      if (stripe && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        periodStart = iso(sub.current_period_start);
        periodEnd = iso(sub.current_period_end);
      }
      await upsert(tenantId, {
        planId,
        stripeSubscriptionId: (s.subscription as string) || null,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });
      logger.info({ tenantId, planId }, 'Subscription activated via checkout');
      return true;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (!tenantId) return true;
      const status = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : (sub.status === 'past_due' || sub.status === 'unpaid') ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : 'active';
      await upsert(tenantId, {
        stripeSubscriptionId: sub.id,
        status: status as 'active' | 'past_due' | 'canceled' | 'trial',
        currentPeriodStart: iso(sub.current_period_start),
        currentPeriodEnd: iso(sub.current_period_end),
        ...(sub.metadata?.planId ? { planId: sub.metadata.planId } : {}),
      });
      logger.info({ tenantId, status }, 'Subscription status updated');
      return true;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = inv.subscription as string | null;
      if (!subId) return true;
      const [row] = await db
        .select()
        .from(schema.tenantSubscriptions)
        .where(eq(schema.tenantSubscriptions.stripeSubscriptionId, subId))
        .limit(1);
      if (row) {
        await db.update(schema.tenantSubscriptions).set({ status: 'past_due' }).where(eq(schema.tenantSubscriptions.id, row.id));
        logger.warn({ subId }, 'Subscription payment failed → past_due');
      }
      return true;
    }
    default:
      return false;
  }
}
