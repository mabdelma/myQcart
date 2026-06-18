import Fastify from "fastify";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createHmac, createHash, randomUUID } from "node:crypto";
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

  // Refresh token — same scheme as the monolith's loginWithRefresh (sha256 hash
  // stored in refresh_tokens), so the monolith's /api/auth/refresh accepts it.
  const refreshToken = randomUUID();
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await pool.query(
    "INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), u.id, u.tenant_id, tokenHash, expiresAt],
  );

  return reply.send({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenant_id }, refreshToken });
});
// Best-effort email delegation to the notifications service (no-op without it).
async function notify(to: string, subject: string, html: string) {
  const url = process.env.NOTIFICATIONS_URL;
  if (!url) return;
  try {
    await fetch(`${url}/v1/notify/send`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, subject, html }) });
  } catch { /* best-effort */ }
}
const FRONTEND = () => process.env.FRONTEND_URL || "http://localhost:5173";

// Register — ported from registerUser. { tenantSlug, name, email, password, role? }
const ROLES = ["admin", "manager", "waiter", "kitchen", "cashier"];
app.post<{ Body: { tenantSlug?: string; name?: string; email?: string; password?: string; role?: string } }>("/v1/auth/register", async (req, reply) => {
  const b = req.body || {};
  if (!b.tenantSlug || !b.name || !b.email || !b.password) return reply.code(400).send({ error: "tenantSlug, name, email, password required" });
  const role = b.role && ROLES.includes(b.role) ? b.role : "waiter";
  const tr = await pool.query("SELECT id, name FROM tenants WHERE slug = $1 LIMIT 1", [b.tenantSlug]);
  const tenant = tr.rows[0];
  if (!tenant) return reply.code(404).send({ error: "Restaurant not found. Contact your admin." });
  const ex = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [b.email]);
  if (ex.rows[0]) return reply.code(409).send({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(b.password, 12);
  const userId = randomUUID();
  await pool.query("INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5,$6)", [userId, tenant.id, b.name, b.email, passwordHash, role]);
  const token = signJwt({ sub: userId, userId, tenantId: tenant.id, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });

  const vToken = randomUUID();
  const vHash = createHash("sha256").update(vToken).digest("hex");
  await pool.query("UPDATE users SET verification_token = $1, verification_token_expiry = $2 WHERE id = $3", [vHash, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), userId]);
  await notify(b.email, `Verify your email — ${tenant.name}`, `<h2>Welcome, ${b.name}!</h2><p>Verify your email:</p><p><a href="${FRONTEND()}/verify-email?token=${vToken}">${FRONTEND()}/verify-email?token=${vToken}</a></p><p>This link expires in 24 hours.</p>`);
  return reply.code(201).send({ token, user: { id: userId, name: b.name, email: b.email, role } });
});

// Forgot password — ported from requestPasswordReset (no email enumeration).
app.post<{ Body: { email?: string } }>("/v1/auth/forgot-password", async (req, reply) => {
  const msg = { message: "If an account with that email exists, a reset link has been sent." };
  const email = req.body?.email;
  if (!email) return reply.code(400).send({ error: "email required" });
  const u = await pool.query("SELECT id, name, email FROM users WHERE email = $1 LIMIT 1", [email]);
  const user = u.rows[0];
  if (!user) return reply.send(msg);
  const raw = randomUUID();
  const hash = createHash("sha256").update(raw).digest("hex");
  await pool.query("UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3", [hash, new Date(Date.now() + 60 * 60 * 1000).toISOString(), user.id]);
  await notify(user.email, "Reset your Qlisted password", `<h2>Password Reset</h2><p>Hi ${user.name},</p><p>Reset your password:</p><p><a href="${FRONTEND()}/reset-password?token=${raw}">${FRONTEND()}/reset-password?token=${raw}</a></p><p>This link expires in 1 hour.</p>`);
  return reply.send(msg);
});

// Reset password — ported from resetPassword.
app.post<{ Body: { token?: string; password?: string } }>("/v1/auth/reset-password", async (req, reply) => {
  const { token, password } = req.body || {};
  if (!token || !password) return reply.code(400).send({ error: "token and password required" });
  const hash = createHash("sha256").update(token).digest("hex");
  const u = await pool.query("SELECT id, reset_token_expiry FROM users WHERE reset_token = $1 LIMIT 1", [hash]);
  const user = u.rows[0];
  if (!user) return reply.code(400).send({ error: "Invalid or expired reset token" });
  if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) return reply.code(400).send({ error: "Reset token has expired" });
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query("UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2", [passwordHash, user.id]);
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
  return reply.send({ message: "Password has been reset successfully." });
});

// Demo issuance so downstream services can be integration-tested before full port.
app.post("/v1/auth/token", async (req) => {
  const b = (req.body || {}) as { sub?: string; role?: string; tenantId?: string | null };
  if (!b.sub) return err("sub required");
  return ok({ token: signToken({ sub: b.sub, role: b.role, tenantId: b.tenantId ?? null }) });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`auth on :${PORT}`));
