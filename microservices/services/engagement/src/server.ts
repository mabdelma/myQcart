import Fastify from "fastify";
import pg from "pg";
import { createLogger, ok, err, verifyHs256, bearer, initSentry, captureError } from "@qlisted/shared";

/**
 * ENGAGEMENT service — loyalty, promotions/campaigns, reviews. The campaigns
 * READ is ported for real (mirrors monolith GET /api/r/:slug/campaigns →
 * getCampaigns), authenticated with monolith-compatible JWTs via verifyHs256.
 */
const log = createLogger("engagement");
const app = Fastify({ loggerInstance: log });
initSentry("engagement");
app.addHook("onError", async (req, _reply, error) => captureError(error, { url: req.url, method: req.method }));
const PORT = Number(process.env.PORT || 8080);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const toCamel = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase()), v]));

app.get("/health", async () => ok({ service: "engagement", status: "up" }));
app.get("/ready", async () => {
  try { await pool.query("select 1"); return ok({ ready: true }); }
  catch { return err("db unavailable"); }
});

// Compat: GET campaigns (admin/manager) — mirrors getCampaigns; returns { data }.
app.get<{ Params: { slug: string } }>("/compat/campaigns/:slug", async (req, reply) => {
  const claims = verifyHs256(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Authentication required"));
  if (!["admin", "manager"].includes(String(claims.role))) return reply.code(403).send(err("Forbidden"));
  const t = await pool.query("SELECT id FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1", [req.params.slug]);
  const tid = t.rows[0]?.id;
  if (!tid) return reply.code(404).send(err("Tenant not found"));
  const r = await pool.query("SELECT * FROM promo_campaigns WHERE tenant_id = $1 ORDER BY created_at", [tid]);
  return reply.send({ data: r.rows.map(toCamel) });
});

// Loyalty + promotions (mirror monolith /api/r/:slug/loyalty, /promotions).
app.get("/v1/tenants/:slug/loyalty/:customerId", async () => err("not_implemented: port from getLoyalty"));
app.post("/v1/tenants/:slug/promotions/validate", async () => err("not_implemented: port from validatePromo"));
app.get("/v1/tenants/:slug/reviews", async () => err("not_implemented: port from listReviews"));

// Campaign sends require an admin JWT (fans out to the notifications service).
app.post("/v1/tenants/:slug/campaigns", async (req, reply) => {
  if (!verifyHs256(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from marketing campaign send");
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`engagement on :${PORT}`));
