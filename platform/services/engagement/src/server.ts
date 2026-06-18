import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@escoutly/shared";

/**
 * ENGAGEMENT service — owns saved properties/searches, viewing requests, and the
 * leads/CRM pipeline. Saved-search matches are handed to NOTIFICATIONS (alert
 * digests) — directly for now, via the event bus later.
 */
const log = createLogger("engagement");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const auth = (req: { headers: Record<string, unknown> }) =>
  verifyToken(bearer(req.headers.authorization as string | undefined));

app.get("/health", async () => ok({ service: "engagement", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

app.post("/v1/engagement/saved", async (req, reply) => (auth(req) ? err("not_implemented: toggle saved") : reply.code(401).send(err("Unauthorized"))));
app.post("/v1/engagement/searches", async (req, reply) => (auth(req) ? err("not_implemented: save search") : reply.code(401).send(err("Unauthorized"))));
app.post("/v1/engagement/viewings", async (req, reply) => (auth(req) ? err("not_implemented: request viewing") : reply.code(401).send(err("Unauthorized"))));
app.get("/v1/engagement/leads", async (req, reply) => (auth(req) ? err("not_implemented: CRM leads") : reply.code(401).send(err("Unauthorized"))));
// Cron-triggered saved-search alert run (calls notifications).
app.post("/v1/engagement/alerts/run", async () => err("not_implemented: port from lib/alerts runSavedSearchAlerts"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`engagement on :${PORT}`));
