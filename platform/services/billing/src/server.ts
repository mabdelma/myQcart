import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@escoutly/shared";

/**
 * BILLING service — owns plans, Stripe, Bizum, coupons, webhooks, transactions.
 * Webhooks are unauthenticated but signature-verified (Stripe/Bizum HMAC).
 * On success it emits payment.succeeded / coupon.redeemed (async phase).
 */
const log = createLogger("billing");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "billing", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

app.post("/v1/billing/checkout", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from /api/checkout (Stripe)");
});
app.post("/v1/billing/checkout/bizum", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from /api/checkout/bizum");
});
app.post("/v1/billing/coupons/redeem", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from redeemCoupon");
});
// Webhooks (signature-verified inside handler, no JWT).
app.post("/v1/billing/webhooks/stripe", async () => err("not_implemented: port from /api/checkout/webhook"));
app.post("/v1/billing/webhooks/bizum", async () => err("not_implemented: port from /api/checkout/bizum/webhook"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`billing on :${PORT}`));
