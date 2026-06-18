import Fastify from "fastify";
import pg from "pg";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

interface OrderItemInput { menuItemId: string; name: string; quantity: number; unitPrice: number; notes?: string | null; modifiers?: string | null }
interface CreateOrderInput {
  tableId?: string; customerName?: string; customerPhone?: string;
  orderType?: "dine_in" | "takeout" | "delivery"; deliveryAddress?: string; deliveryFee?: number;
  estimatedPickupTime?: string; estimatedDeliveryTime?: string; items: OrderItemInput[]; notes?: string;
}

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

// Same SSE event bus as the monolith: publish to order:<tenantId>; the monolith's
// /events route subscribes and relays to the kitchen feed. Required for cutover.
const pub = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 }) : null;
pub?.on("error", (e) => log.error({ err: e }, "redis error"));
function emitEvent(type: string, tenantId: string, orderId: string, data?: Record<string, unknown>) {
  const msg = JSON.stringify(data ? { type, tenantId, orderId, data } : { type, tenantId, orderId });
  pub?.publish(`order:${tenantId}`, msg).catch((e) => log.error({ err: e }, "redis publish failed"));
}

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

// Order placement — ported from createOrder (alongside; NOT cut over). Mirrors
// totals/tax/service-charge + insert. NOTE before cutover: also emit the SSE
// order_created event (Redis) + KOT print, which still live on the monolith.
app.post<{ Params: { slug: string }; Body: CreateOrderInput }>("/compat/orders/:slug", async (req, reply) => {
  const t = await pool.query("SELECT id, tax_rate, service_charge FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1", [req.params.slug]);
  const tenant = t.rows[0];
  if (!tenant) return reply.code(404).send(err("Tenant not found"));

  const input = req.body || ({} as CreateOrderInput);
  const orderType = input.orderType || "dine_in";
  if (!input.items?.length) return reply.code(400).send(err("items required"));
  if (orderType === "dine_in") {
    if (!input.tableId) return reply.code(400).send({ error: "Table ID is required for dine-in orders" });
    const tbl = await pool.query("SELECT id FROM tables WHERE id = $1 AND tenant_id = $2 LIMIT 1", [input.tableId, tenant.id]);
    if (!tbl.rows[0]) return reply.code(404).send({ error: "Table not found" });
  }

  const orderId = randomUUID();
  const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itemCount = input.items.reduce((s, i) => s + i.quantity, 0);
  const taxRate = tenant.tax_rate || 0;
  const serviceChargeRate = orderType === "dine_in" ? tenant.service_charge || 0 : 0;
  const deliveryFee = input.deliveryFee || 0;
  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * serviceChargeRate;
  const total = subtotal + tax + serviceCharge + deliveryFee;

  await pool.query(
    `INSERT INTO orders (id, tenant_id, table_id, customer_name, customer_phone, order_type, delivery_address,
       delivery_fee, estimated_pickup_time, estimated_delivery_time, status, item_count, subtotal,
       discount_amount, tax, service_charge, total, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,0,$13,$14,$15,$16)`,
    [orderId, tenant.id, input.tableId || null, input.customerName || null, input.customerPhone || null, orderType,
     input.deliveryAddress || null, deliveryFee, input.estimatedPickupTime || null, input.estimatedDeliveryTime || null,
     itemCount, subtotal, tax, serviceCharge, total, input.notes || null],
  );

  const orderItems = input.items.map((i) => ({
    id: randomUUID(), orderId, menuItemId: i.menuItemId, name: i.name,
    quantity: i.quantity, unitPrice: i.unitPrice, notes: i.notes, modifiers: i.modifiers,
  }));
  for (const it of orderItems) {
    await pool.query(
      "INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, unit_price, notes, modifiers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [it.id, it.orderId, it.menuItemId, it.name, it.quantity, it.unitPrice, it.notes ?? null, it.modifiers ?? null],
    );
  }
  if (orderType === "dine_in" && input.tableId) {
    await pool.query("UPDATE tables SET status = 'occupied' WHERE id = $1", [input.tableId]);
  }

  emitEvent("order_created", tenant.id, orderId); // notify the kitchen feed (monolith /events relays it)
  return reply.code(201).send({ id: orderId, items: orderItems, subtotal, tax, serviceCharge, deliveryFee, total, orderType });
});

// Order status update — ported from updateOrderStatus (authed: staff roles).
// Mirrors the update + both SSE events. Note: 'ready' push notification (web
// push) still fires from the monolith and isn't ported here.
const STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"];
app.patch<{ Params: { slug: string; orderId: string }; Body: { status?: string } }>("/compat/status/:slug/:orderId", async (req, reply) => {
  const claims = verifyHs256(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Authentication required"));
  if (!["admin", "manager", "kitchen", "waiter"].includes(String(claims.role))) return reply.code(403).send(err("Forbidden"));
  const status = req.body?.status;
  if (!status || !STATUSES.includes(status)) return reply.code(400).send(err("invalid status"));
  const t = await pool.query("SELECT id FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1", [req.params.slug]);
  const tid = t.rows[0]?.id;
  if (!tid) return reply.code(404).send(err("Tenant not found"));
  if (claims.tenantId !== tid) return reply.code(403).send(err("Forbidden"));

  const now = new Date().toISOString();
  if (status === "delivered") {
    await pool.query("UPDATE orders SET status = $1, updated_at = $2, completed_at = $2 WHERE id = $3 AND tenant_id = $4", [status, now, req.params.orderId, tid]);
  } else {
    await pool.query("UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3 AND tenant_id = $4", [status, now, req.params.orderId, tid]);
  }
  emitEvent("order_updated", tid, req.params.orderId, { status });
  emitEvent("order_status_changed", tid, req.params.orderId, { status });
  return reply.send({ success: true });
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
