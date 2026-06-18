import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * BILLING service — owns Stripe customer payments (order checkout) and SaaS
 * subscriptions (tenant plans), plus the Stripe webhook. Emits payment.succeeded
 * / subscription.updated. Logic ports from server/src/services/paymentService.ts
 * + server/src/services/subscriptionService.ts.
 */
const log = createLogger("billing");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "billing", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Order payment intents (mirror monolith /api/r/:slug/payments).
app.post("/v1/tenants/:slug/payments/intent", async () => err("not_implemented: port from createPaymentIntent"));

// SaaS subscriptions (mirror monolith /api/admin/subscriptions).
app.get("/v1/tenants/:id/subscription", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from getSubscription");
});
app.post("/v1/tenants/:id/subscription/checkout", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from createCheckoutSession");
});

// Stripe webhook (raw body) — ports from handleStripeWebhook + handleSubscriptionEvent.
app.post("/v1/billing/webhook", async () => err("not_implemented: port from paymentService.handleStripeWebhook"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`billing on :${PORT}`));
