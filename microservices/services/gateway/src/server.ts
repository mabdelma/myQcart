import Fastify from "fastify";
import replyFrom from "@fastify/reply-from";
import { createLogger, ok, err } from "@qlisted/shared";

/**
 * GATEWAY — the strangler-fig seam. Transparently proxies (streaming, raw body
 * preserved) so it can safely carry SSE feeds and signature-verified webhooks:
 * a path prefix → its service, else the monolith, with one rewrite for the live
 * menu read. Built on @fastify/reply-from (pipes upstream responses + bodies).
 */
const log = createLogger("gateway");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.register(replyFrom);
// Forward request bodies verbatim (raw Buffer) — do NOT JSON-parse, or Stripe
// webhook signatures (and multipart uploads) would break when re-serialized.
app.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

// prefix → upstream base URL
const ROUTES: Record<string, string | undefined> = {
  "/api/auth": process.env.AUTH_URL,
  "/api/catalog": process.env.CATALOG_URL,
  "/api/orders": process.env.ORDERS_URL,
  "/api/billing": process.env.BILLING_URL,
  "/api/engagement": process.env.ENGAGEMENT_URL,
  "/api/notify": process.env.NOTIFICATIONS_URL,
};
const MONOLITH_URL = process.env.MONOLITH_URL;

app.get("/health", async () => ok({ service: "gateway", status: "up" }));

function target(method: string, url: string): { base?: string; path: string } {
  const pathOnly = url.split("?")[0];
  // Transparent cutover: monolith's GET /api/r/:slug/menu → catalog compat shim.
  const menu = method === "GET" && /^\/api\/r\/([^/]+)\/menu$/.exec(pathOnly);
  if (menu && ROUTES["/api/catalog"]) return { base: ROUTES["/api/catalog"], path: `/compat/menu/${menu[1]}` };
  // Service prefix → strip prefix and forward to the service.
  const hit = Object.keys(ROUTES).find((p) => pathOnly === p || pathOnly.startsWith(p + "/"));
  if (hit) return { base: ROUTES[hit], path: url.slice(hit.length) || "/" };
  // Otherwise fall through to the monolith, path unchanged.
  return { base: MONOLITH_URL, path: url };
}

app.all("/*", (req, reply) => {
  const { base, path } = target(req.method, req.url);
  if (!base) return reply.code(502).send(err("no upstream configured for this path"));
  // reply.from streams the upstream response (incl. SSE) and forwards the raw body.
  return reply.from(base.replace(/\/$/, "") + path);
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`gateway on :${PORT}`));
