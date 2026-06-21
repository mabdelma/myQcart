import Fastify from "fastify";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createHmac, createHash, randomUUID } from "node:crypto";
import { createLogger, ok, err, verifyToken, signToken, bearer, initSentry, captureError } from "@qlisted/shared";

/**
 * AUTH service — owns users, credentials, JWT issuance, sessions, super_admin.
 * LOGIN is ported for real (mirrors monolith loginUser): bcrypt against
 * password_hash + a monolith-compatible HS256 JWT so tokens verify on both
 * sides. Register/refresh/reset remain stubbed.
 */
const log = createLogger("auth");
const app = Fastify({ loggerInstance: log });
initSentry("auth");
app.addHook("onError", async (req, _reply, error) => captureError(error, { url: req.url, method: req.method }));
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

// TOTP (RFC 6238) verify — mirrors the monolith's lib/totp.ts so 2FA is enforced
// on the live (cut-over) login path too.
function base32Decode(str: string): Buffer {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
function verifyTotp(secretBase32: string, token: string, window = 1): boolean {
  const t = (token || "").trim();
  if (!/^\d{6}$/.test(t)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter + w));
    const hmac = createHmac("sha1", secret).update(buf).digest();
    const off = hmac[hmac.length - 1] & 0xf;
    const code = (((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff)) % 1_000_000;
    if (code.toString().padStart(6, "0") === t) return true;
  }
  return false;
}

// Real login — credentials → monolith-compatible JWT. Mirrors loginUser:
// returns { token, user:{id,name,email,role,tenantId} } with the same status codes.
app.post<{ Body: { email?: string; password?: string; totpToken?: string } }>("/v1/auth/login", async (req, reply) => {
  const { email, password, totpToken } = req.body || {};
  if (!email || !password) return reply.code(400).send(err("email + password required"));
  const r = await pool.query(
    "SELECT id, name, email, role, tenant_id, password_hash, is_active, totp_secret, totp_enabled FROM users WHERE email = $1 LIMIT 1",
    [email],
  );
  const u = r.rows[0];
  if (!u) return reply.code(401).send(err("Invalid credentials"));
  if (!u.is_active) return reply.code(403).send(err("Account is disabled"));
  if (!(await bcrypt.compare(password, u.password_hash))) return reply.code(401).send(err("Invalid credentials"));

  // 2FA gate (parity with monolith loginUser) — only for opted-in accounts.
  if (u.totp_enabled && u.totp_secret) {
    if (!totpToken) return reply.send({ twoFactorRequired: true });
    if (!verifyTotp(u.totp_secret, totpToken)) return reply.code(401).send(err("Invalid 2FA code"));
  }

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

// Refresh — ported from refreshAccessToken (rotate: revoke old, issue new).
app.post<{ Body: { refreshToken?: string } }>("/v1/auth/refresh", async (req, reply) => {
  const rt = req.body?.refreshToken;
  if (!rt) return reply.code(400).send({ error: "refreshToken required" });
  const hash = createHash("sha256").update(rt).digest("hex");
  const s = await pool.query("SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1 AND revoked = false LIMIT 1", [hash]);
  const stored = s.rows[0];
  if (!stored) return reply.code(401).send({ error: "Invalid refresh token" });
  if (new Date(stored.expires_at) < new Date()) return reply.code(401).send({ error: "Refresh token expired" });
  await pool.query("UPDATE refresh_tokens SET revoked = true WHERE id = $1", [stored.id]);
  const u = await pool.query("SELECT id, name, email, role, tenant_id FROM users WHERE id = $1 LIMIT 1", [stored.user_id]);
  const user = u.rows[0];
  if (!user) return reply.code(404).send({ error: "User not found" });
  const token = signJwt({ sub: user.id, userId: user.id, tenantId: user.tenant_id, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });
  const newRt = randomUUID();
  await pool.query("INSERT INTO refresh_tokens (id, user_id, tenant_id, token_hash, expires_at) VALUES ($1,$2,$3,$4,$5)",
    [randomUUID(), user.id, user.tenant_id, createHash("sha256").update(newRt).digest("hex"), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()]);
  return reply.send({ token, refreshToken: newRt, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id } });
});

// Verify email — ported from verifyEmail.
app.post<{ Body: { token?: string } }>("/v1/auth/verify-email", async (req, reply) => {
  const token = req.body?.token;
  if (!token) return reply.code(400).send({ error: "token required" });
  const hash = createHash("sha256").update(token).digest("hex");
  const u = await pool.query("SELECT id, email_verified, verification_token_expiry FROM users WHERE verification_token = $1 LIMIT 1", [hash]);
  const user = u.rows[0];
  if (!user) return reply.code(400).send({ error: "Invalid verification token" });
  if (user.email_verified) return reply.send({ message: "Email already verified" });
  if (!user.verification_token_expiry || new Date(user.verification_token_expiry) < new Date()) return reply.code(400).send({ error: "Verification token has expired. Request a new one." });
  await pool.query("UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE id = $1", [user.id]);
  return reply.send({ message: "Email verified successfully" });
});

// Demo issuance so downstream services can be integration-tested before full port.
app.post("/v1/auth/token", async (req) => {
  const b = (req.body || {}) as { sub?: string; role?: string; tenantId?: string | null };
  if (!b.sub) return err("sub required");
  return ok({ token: signToken({ sub: b.sub, role: b.role, tenantId: b.tenantId ?? null }) });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`auth on :${PORT}`));
