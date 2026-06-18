import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, signToken, bearer } from "@escoutly/shared";

/**
 * AUTH service — owns users, credentials, OAuth, JWT issuance and the central
 * admin session. Routes below are the contract; logic is ported from the
 * monolith's auth.ts / central-session.ts during the auth extraction phase.
 */
const log = createLogger("auth");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "auth", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Verify a token issued by this service (used internally by other services/gateway).
app.get("/v1/auth/verify", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  return claims ? ok(claims) : reply.code(401).send(err("Invalid token"));
});

// TODO(port): credentials + Google login → issue JWT
app.post("/v1/auth/login", async () => err("not_implemented: port from apps/landing auth.ts"));
// TODO(port): central admin login (separate session)
app.post("/v1/auth/central/login", async () => err("not_implemented: port from central-session.ts"));
// Demo issuance so downstream services can be integration-tested before full port.
app.post("/v1/auth/token", async (req) => {
  const b = (req.body || {}) as { sub?: string; role?: string };
  if (!b.sub) return err("sub required");
  return ok({ token: signToken({ sub: b.sub, role: b.role }) });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`auth on :${PORT}`));
