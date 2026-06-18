import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, signToken, bearer } from "@qlisted/shared";

/**
 * AUTH service — owns users, credentials, JWT issuance, email verification,
 * password reset, sessions, and the platform super_admin login.
 * Routes below are the CONTRACT; logic is ported from the monolith's
 * server/src/routes/auth.ts + server/src/services/authService.ts.
 */
const log = createLogger("auth");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "auth", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Verify a token (used internally by the gateway + other services).
app.get("/v1/auth/verify", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  return claims ? ok(claims) : reply.code(401).send(err("Invalid token"));
});

// TODO(port): credentials → issue JWT (server/src/routes/auth.ts login)
app.post("/v1/auth/login", async () => err("not_implemented: port from server/src/routes/auth.ts"));
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
