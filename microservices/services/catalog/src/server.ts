import Fastify from "fastify";
import pg from "pg";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * CATALOG service — owns each tenant's menu (categories + items). FIRST service
 * migrated for real from the monolith (mirrors GET /api/r/:slug/menu). Reads the
 * shared Postgres directly; writes are still stubbed pending the full port.
 */
const log = createLogger("catalog");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

app.get("/health", async () => ok({ service: "catalog", status: "up" }));
app.get("/ready", async () => {
  try { await pool.query("select 1"); return ok({ ready: true }); }
  catch { return err("db unavailable"); }
});

async function tenantBySlug(slug: string) {
  const r = await pool.query(
    "SELECT id, name, currency FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1",
    [slug],
  );
  return r.rows[0] as { id: string; name: string; currency: string } | undefined;
}

// Public read: full menu (mirror monolith /api/r/:slug/menu).
app.get<{ Params: { slug: string } }>("/v1/tenants/:slug/menu", async (req, reply) => {
  const tenant = await tenantBySlug(req.params.slug);
  if (!tenant) return reply.code(404).send(err("Tenant not found"));

  const [cats, items] = await Promise.all([
    pool.query(
      "SELECT id, name, type, parent_id, sort_order FROM menu_categories WHERE tenant_id = $1 ORDER BY sort_order, name",
      [tenant.id],
    ),
    pool.query(
      "SELECT id, category_id, sub_category_id, name, description, price, image_url, available, sort_order FROM menu_items WHERE tenant_id = $1 ORDER BY sort_order, name",
      [tenant.id],
    ),
  ]);

  return ok({
    tenant: { slug: req.params.slug, name: tenant.name, currency: tenant.currency },
    categories: cats.rows,
    items: items.rows,
  });
});

// Public read: a single item.
app.get<{ Params: { slug: string; id: string } }>("/v1/tenants/:slug/menu/items/:id", async (req, reply) => {
  const tenant = await tenantBySlug(req.params.slug);
  if (!tenant) return reply.code(404).send(err("Tenant not found"));
  const r = await pool.query(
    "SELECT id, category_id, sub_category_id, name, description, price, image_url, available FROM menu_items WHERE tenant_id = $1 AND id = $2 LIMIT 1",
    [tenant.id, req.params.id],
  );
  if (!r.rows[0]) return reply.code(404).send(err("Item not found"));
  return ok(r.rows[0]);
});

// Admin writes — still stubbed (port from createMenuItem/updateMenuItem next).
app.post("/v1/tenants/:slug/menu/items", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from createMenuItem");
});
app.patch("/v1/tenants/:slug/menu/items/:id", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from updateMenuItem");
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`catalog on :${PORT}`));
