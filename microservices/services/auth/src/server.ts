import Fastify from "fastify";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { createLogger, ok, err, verifyToken, signToken, bearer } from "@qlisted/shared";

/**
 * AUTH service — owns users, credentials, JWT issuance, sessions, super_admin.
 * LOGIN is ported for real (mirrors monolith loginUser): bcrypt against
 * password_hash + a monolith-compatible HS256 JWT so tokens verify on both
 * sides. Register/refresh/reset remain stubbed.
 */
const log = createLogger("auth");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// Standard HS256 JWT byte-compatible with the monolith's hono/jwt sign() —
// header {alg:HS256,typ:JWT}, exp in SECONDS, signed with AUTH_SECRET (=JWT_SECRET).
function signJwt(payload: Record<string, unknown>): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

app.get("/health", async () => ok({ service: "auth", status: "up" }));
app.get("/ready", async () => {
  try { await pool.query("select 1"); return ok({ ready: true }); }
  catch { return err("db unavailable"); }
});

// Verify a token (used internally by the gateway + other services).
app.get("/v1/auth/verify", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  return claims ? ok(claims) : reply.code(401).send(err("Invalid token"));
});

// Real login — credentials → monolith-compatible JWT. Mirrors loginUser:
// returns { token, user:{id,name,email,role,tenantId} } with the same status codes.
app.post<{ Body: { email?: string; password?: string } }>("/v1/auth/login", async (req, reply) => {
  const { email, password } = req.body || {};
  if (!email || !password) return reply.code(400).send(err("email + password required"));
  const r = await pool.query(
    "SELECT id, name, email, role, tenant_id, password_hash, is_active FROM users WHERE email = $1 LIMIT 1",
    [email],
  );
  const u = r.rows[0];
  if (!u) return reply.code(401).send(err("Invalid credentials"));
  if (!u.is_active) return reply.code(403).send(err("Account is disabled"));
  if (!(await bcrypt.compare(password, u.password_hash))) return reply.code(401).send(err("Invalid credentials"));

  const token = signJwt({
    sub: u.id,
    userId: u.id,
    tenantId: u.tenant_id,
    role: u.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });
  await pool.query("UPDATE users SET last_active = $1 WHERE id = $2", [new Date().toISOString(), u.id]);
  return reply.send({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenant_id } });
});
app.post("/v1/auth/register", async () => err("not_implemented: port from server/src/routes/auth.ts register"));
app.post("/v1/auth/refresh", async () => err("not_implemented: port refresh-token rotation"));
app.post("/v1/auth/verify-email", async () => err("not_implemented: port email verification"));
app.post("/v1/auth/reset-password", async () => err("not_implemented: port password reset"));

// Demo issuance so downstream services can be integration-tested before full port.
app.post("/v1/auth/token", async (req) => {
  const b = (req.body || {}) as { sub?: string; role?: string; tenantId?: string | null };
  if (!b.sub) return err("sub required");
  return ok({ token: signToken({ sub: b.sub, role: b.role, tenantId: b.tenantId ?? null }) });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`auth on :${PORT}`));
