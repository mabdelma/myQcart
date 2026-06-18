import Fastify from "fastify";
import { createLogger, verifyToken, bearer, ok, err } from "@escoutly/shared";
import type { EmailRequest } from "@escoutly/shared/types";
import { renderEmail } from "./templates.js";
import { sendEmail } from "./email.js";

const log = createLogger("notifications");
const app = Fastify({ loggerInstance: log });

const PORT = Number(process.env.PORT || 8080);
// Only other services (with a service JWT) may trigger sends in production.
const REQUIRE_AUTH = process.env.NODE_ENV === "production";

app.get("/health", async () => ok({ service: "notifications", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

app.post("/v1/notifications/email/send", async (req, reply) => {
  if (REQUIRE_AUTH && !verifyToken(bearer(req.headers.authorization))) {
    return reply.code(401).send(err("Unauthorized"));
  }
  const body = req.body as EmailRequest;
  if (!body?.to || !body?.template) return reply.code(400).send(err("to and template are required"));
  try {
    const { subject, html } = renderEmail(body.template as never, body.locale, body.vars || {});
    await sendEmail(body.to, subject, html);
    return ok({ sent: true });
  } catch (e) {
    log.error({ err: e }, "send failed");
    return reply.code(502).send(err("Email delivery failed"));
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`notifications on :${PORT}`));
