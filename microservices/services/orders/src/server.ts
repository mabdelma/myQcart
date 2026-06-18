import Fastify from "fastify";
import pg from "pg";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * ORDERS service — owns carts, orders, kitchen/KDS status. The public
 * order-tracking READ is migrated for real (mirrors monolith
 * GET /api/r/:slug/orders/:orderId/track → getOrderDetail). Writes + the live
 * feed (a separate events/SSE route on the monolith) remain there for now.
 */
const log = createLogger("orders");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const toCamel = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase()), v]));

app.get("/health", async () => ok({ service: "orders", status: "up" }));
app.get("/ready", async () => {
  try { await pool.query("select 1"); return ok({ ready: true }); }
  catch { return err("db unavailable"); }
});

// Compat: byte-compatible with the monolith's order-tracking read — returns the
// raw order row (camelCased) with an items[] array, or { error } + 404.
app.get<{ Params: { slug: string; orderId: string } }>("/compat/track/:slug/:orderId", async (req, reply) => {
  const t = await pool.query("SELECT id FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1", [req.params.slug]);
  const tenantId = t.rows[0]?.id;
  if (!tenantId) return reply.code(404).send({ error: "Order not found" });
  const o = await pool.query("SELECT * FROM orders WHERE id = $1 AND tenant_id = $2 LIMIT 1", [req.params.orderId, tenantId]);
  if (!o.rows[0]) return reply.code(404).send({ error: "Order not found" });
  const items = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [req.params.orderId]);
  return reply.send({ ...toCamel(o.rows[0]), items: items.rows.map(toCamel) });
});

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
