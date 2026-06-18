import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * ENGAGEMENT service — owns loyalty points, promotions/coupons, reviews, and
 * marketing campaigns. Subscribes to order.placed / payment.succeeded to award
 * loyalty. Logic ports from the monolith's loyalty/promotions/marketing routes.
 */
const log = createLogger("engagement");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "engagement", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Loyalty + promotions (mirror monolith /api/r/:slug/loyalty, /promotions).
app.get("/v1/tenants/:slug/loyalty/:customerId", async () => err("not_implemented: port from getLoyalty"));
app.post("/v1/tenants/:slug/promotions/validate", async () => err("not_implemented: port from validatePromo"));
app.get("/v1/tenants/:slug/reviews", async () => err("not_implemented: port from listReviews"));

// Campaign sends require an admin JWT (fans out to the notifications service).
app.post("/v1/tenants/:slug/campaigns", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from marketing campaign send");
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`engagement on :${PORT}`));
