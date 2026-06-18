import Fastify from "fastify";
import { createLogger, ok, err } from "@qlisted/shared";

/**
 * GATEWAY — the single public seam in front of the services. Routes a path
 * prefix to the matching upstream and forwards the request verbatim. This is
 * the strangler-fig boundary: paths not yet extracted can fall through to the
 * monolith (MONOLITH_URL) so cutover happens one prefix at a time.
 */
const log = createLogger("gateway");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

// prefix → upstream base URL (container DNS on the edge network)
const ROUTES: Record<string, string | undefined> = {
  "/api/auth": process.env.AUTH_URL,
  "/api/catalog": process.env.CATALOG_URL,
  "/api/orders": process.env.ORDERS_URL,
  "/api/billing": process.env.BILLING_URL,
  "/api/engagement": process.env.ENGAGEMENT_URL,
  "/api/notify": process.env.NOTIFICATIONS_URL,
};
// Anything not matched above falls through to the existing monolith.
const MONOLITH_URL = process.env.MONOLITH_URL;

app.get("/health", async () => ok({ service: "gateway", status: "up" }));

function upstreamFor(path: string): string | undefined {
  const hit = Object.keys(ROUTES).find((p) => path === p || path.startsWith(p + "/"));
  return hit ? ROUTES[hit] : MONOLITH_URL;
}

app.all("/*", async (req, reply) => {
  const base = upstreamFor(req.url.split("?")[0]);
  if (!base) return reply.code(502).send(err("no upstream configured for this path"));
  try {
    const target = base.replace(/\/$/, "") + req.url;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers[k] = v;
    const res = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    });
    const text = await res.text();
    reply.code(res.status);
    const ct = res.headers.get("content-type");
    if (ct) reply.header("content-type", ct);
    return reply.send(text);
  } catch (e) {
    log.error(e);
    return reply.code(502).send(err("upstream unreachable"));
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`gateway on :${PORT}`));
