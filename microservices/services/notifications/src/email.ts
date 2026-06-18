import nodemailer from "nodemailer";

/**
 * SMTP transport — only built when SMTP_HOST is configured. Without it the
 * service no-ops (mirrors the monolith's behaviour when no mailer is set up),
 * so delivery ownership can move here transparently before SMTP exists.
 */
const FROM = process.env.MAIL_FROM || "Qlisted <noreply@qlisted.com>";
const host = process.env.SMTP_HOST;

const transport = host
  ? nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}),
      tls: { rejectUnauthorized: false },
    })
  : null;

export const smtpConfigured = !!transport;

/** Returns true if actually delivered, false if skipped (no SMTP). Throws on SMTP failure. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transport) return false;
  await transport.sendMail({ from: FROM, to, subject, html });
  return true;
}
