import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * ORDERS service — owns carts, orders, kitchen/KDS status, and the live order
 * feed (SSE). Emits order.placed / order.ready domain events that notifications
 * + engagement subscribe to. Logic ports from server/src/routes/orders.ts +
 * server/src/services/orderService.ts (and the Redis SSE pub/sub).
 */
const log = createLogger("orders");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "orders", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Guest places an order (mirror monolith POST /api/r/:slug/orders).
app.post("/v1/tenants/:slug/orders", async () => err("not_implemented: port from createOrder"));
app.get("/v1/tenants/:slug/orders/:id", async () => err("not_implemented: port from getOrder"));

// Kitchen/staff status transitions require a staff JWT.
app.patch("/v1/tenants/:slug/orders/:id/status", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from updateOrderStatus (+ emit order.ready)");
});

// Live order stream (SSE) — ports from the Redis-backed feed.
app.get("/v1/tenants/:slug/orders/stream", async () => err("not_implemented: port SSE feed (Redis pub/sub)"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`orders on :${PORT}`));
