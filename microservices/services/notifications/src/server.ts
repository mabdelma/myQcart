import Fastify from "fastify";
import { createLogger, ok, err, initSentry, captureError } from "@qlisted/shared";
import type { EmailRequest } from "@qlisted/shared";
import { renderEmail } from "./templates.js";
import { sendEmail, smtpConfigured } from "./email.js";

/**
 * NOTIFICATIONS service — owns transactional email (and later SMS + web push).
 * Other services call POST /v1/notify/email; it also subscribes to order.ready
 * to alert guests. Templates live in templates.ts; transport in email.ts.
 */
const log = createLogger("notifications");
const app = Fastify({ loggerInstance: log });
initSentry("notifications");
app.addHook("onError", async (req, _reply, error) => captureError(error, { url: req.url, method: req.method }));
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "notifications", status: "up", smtp: smtpConfigured }));
app.get("/ready", async () => ok({ ready: true }));

// Raw delivery — the monolith renders the email and delegates SENDING here, so
// this service is the single owner of delivery. { to, subject, html }.
app.post("/v1/notify/send", async (req, reply) => {
  const b = (req.body || {}) as { to?: string; subject?: string; html?: string };
  if (!b.to || !b.subject || !b.html) return reply.code(400).send(err("to + subject + html required"));
  try {
    const sent = await sendEmail(b.to, b.subject, b.html);
    return ok({ sent, skipped: !sent });
  } catch (e) {
    log.error(e);
    return reply.code(502).send(err("email send failed"));
  }
});

// Send a templated email. Body: EmailRequest.
app.post("/v1/notify/email", async (req, reply) => {
  const body = req.body as EmailRequest | undefined;
  if (!body?.to || !body?.template) return reply.code(400).send(err("to + template required"));
  try {
    const { subject, html } = renderEmail(body.template as never, body.locale, body.vars || {});
    await sendEmail(body.to, subject, html);
    return ok({ sent: true });
  } catch (e) {
    log.error(e);
    return reply.code(502).send(err("email send failed"));
  }
});

// TODO(port): SMS (Twilio) + web push (VAPID) from the monolith.
app.post("/v1/notify/sms", async () => err("not_implemented: port SMS provider"));
app.post("/v1/notify/push", async () => err("not_implemented: port web push (VAPID)"));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`notifications on :${PORT}`));
