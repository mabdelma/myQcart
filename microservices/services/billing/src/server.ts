import Fastify from "fastify";
import pg from "pg";
import { createLogger, ok, err, verifyHs256, bearer } from "@qlisted/shared";

/**
 * BILLING service — SaaS subscriptions + Stripe. The subscription READ is
 * ported for real (mirrors monolith GET /admin/subscriptions/:tenantId →
 * getSubscription). Checkout/cancel/webhook (writes + live payments) stay on
 * the monolith pending a deliberate, Stripe-test-mode cutover.
 */
const log = createLogger("billing");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

interface Plan { id: string; name: string; price: number; usersLimit: number; ordersLimit: number; priceEnv: string }
const PLANS: Plan[] = [
  { id: "starter", name: "Starter", price: 29, usersLimit: 3, ordersLimit: 500, priceEnv: "STRIPE_PRICE_STARTER" },
  { id: "growth", name: "Growth", price: 79, usersLimit: 10, ordersLimit: 2000, priceEnv: "STRIPE_PRICE_GROWTH" },
  { id: "enterprise", name: "Enterprise", price: 199, usersLimit: 50, ordersLimit: 10000, priceEnv: "STRIPE_PRICE_ENTERPRISE" },
];
const getPlan = (id: string) => PLANS.find((p) => p.id === id);
const priceIdFor = (id: string) => { const p = getPlan(id); return p ? process.env[p.priceEnv] || null : null; };

app.get("/health", async () => ok({ service: "billing", status: "up" }));
app.get("/ready", async () => {
  try { await pool.query("select 1"); return ok({ ready: true }); }
  catch { return err("db unavailable"); }
});

// Compat: byte-compatible with GET /admin/subscriptions/:tenantId.
app.get<{ Params: { tenantId: string } }>("/compat/subscription/:tenantId", async (req, reply) => {
  const claims = verifyHs256(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Authentication required"));
  if (!["admin", "manager", "super_admin"].includes(String(claims.role))) return reply.code(403).send(err("Forbidden"));
  const { tenantId } = req.params;
  if (claims.role !== "super_admin" && claims.tenantId !== tenantId) return reply.code(403).send(err("Forbidden"));

  const t = await pool.query("SELECT id FROM tenants WHERE id = $1 LIMIT 1", [tenantId]);
  if (!t.rows[0]) return reply.code(404).send(err("Tenant not found"));

  const s = await pool.query(
    "SELECT plan_id, status, stripe_subscription_id, current_period_end, trial_ends_at FROM tenant_subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1",
    [tenantId],
  );
  const sub = s.rows[0];
  const planId = sub?.plan_id || "starter";
  const plan = getPlan(planId) || PLANS[0];
  const u = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1", [tenantId]);
  const o = await pool.query("SELECT COUNT(*)::int AS c FROM orders WHERE tenant_id = $1", [tenantId]);

  return reply.send({
    plan,
    plans: PLANS,
    status: sub?.status || "trial",
    stripeSubscriptionId: sub?.stripe_subscription_id || null,
    renewDate: sub?.current_period_end || sub?.trial_ends_at || null,
    billingEnabled: !!priceIdFor(planId) && !!process.env.STRIPE_SECRET_KEY,
    usage: { users: Number(u.rows[0]?.c || 0), orders: Number(o.rows[0]?.c || 0) },
  });
});

// Order payment intents (mirror monolith /api/r/:slug/payments).
app.post("/v1/tenants/:slug/payments/intent", async () => err("not_implemented: port from createPaymentIntent"));

// SaaS subscriptions (mirror monolith /api/admin/subscriptions).
app.get("/v1/tenants/:id/subscription", async (req, reply) => {
  if (!verifyHs256(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from getSubscription");
});
app.post("/v1/tenants/:id/subscription/checkout", async (req, reply) => {
  if (!verifyHs256(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from createCheckoutSession");
});

// Stripe webhook (raw body) — ports from handleStripeWebhook + handleSubscriptionEvent.
app.post("/v1/billing/webhook", async () => err("not_implemented: port from paymentService.handleStripeWebhook"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`billing on :${PORT}`));
