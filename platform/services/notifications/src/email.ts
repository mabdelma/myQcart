import nodemailer from "nodemailer";

/** SMTP transport to the self-hosted Mailu/Postfix mailer. */
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mailer",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : {}),
  tls: { rejectUnauthorized: false },
});

const FROM = process.env.EMAIL_FROM || "Escoutly <noreply@escoutly.com>";

export async function sendEmail(to: string, subject: string, html: string) {
  await transport.sendMail({ from: FROM, to, subject, html });
}
