import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@qlisted/shared";

/**
 * CATALOG service — owns each tenant's menu: categories, items, modifiers,
 * availability, images. The customer ordering page + admin menu editor already
 * consume /api/r/:slug/menu over HTTP, so this is the easiest seam to cut over.
 * Logic ports from server/src/routes/menu.ts + server/src/services/menuService.
 */
const log = createLogger("catalog");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "catalog", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Public read paths (mirror monolith /api/r/:slug/menu).
app.get("/v1/tenants/:slug/menu", async () => err("not_implemented: port from getFullMenu"));
app.get("/v1/tenants/:slug/menu/items/:id", async () => err("not_implemented: port from getMenuItem"));

// Admin writes require a valid manager/admin JWT.
app.post("/v1/tenants/:slug/menu/items", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from createMenuItem");
});
app.patch("/v1/tenants/:slug/menu/items/:id", async (req, reply) => {
  if (!verifyToken(bearer(req.headers.authorization))) return reply.code(401).send(err("Unauthorized"));
  return err("not_implemented: port from updateMenuItem");
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`catalog on :${PORT}`));
