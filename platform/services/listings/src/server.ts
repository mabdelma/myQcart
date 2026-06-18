import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@escoutly/shared";

/**
 * LISTINGS service — owns properties, search, import, tour/media refs.
 * The agent + web already consume /api/properties over HTTP, so this is the
 * easiest seam to cut over (point them at the gateway → here).
 */
const log = createLogger("listings");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "listings", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Public read paths (mirror monolith /api/properties).
app.get("/v1/listings", async () => err("not_implemented: port from lib/properties getProperties"));
app.get("/v1/listings/:slug", async () => err("not_implemented: port from getPropertyBySlug"));

// Admin/owner writes require a valid user JWT.
app.post("/v1/listings", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from parsePropertyInput + create");
});
app.post("/v1/listings/import", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from /api/admin/import");
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`listings on :${PORT}`));
