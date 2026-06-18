import { createTransport } from 'nodemailer';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

const FROM = process.env.MAIL_FROM || 'noreply@qcart.app';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: ReturnType<typeof createTransport> | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

const MAIL_DIR = join(process.cwd(), 'maildump');

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html,
      });
      logger.info({ to, subject }, 'Email sent via SMTP');
    } catch (error) {
      logger.error({ error, to, subject }, 'SMTP failed to send email');
      return;
    }
    return;
  }

  if (!existsSync(MAIL_DIR)) {
    await mkdir(MAIL_DIR, { recursive: true });
  }

  const filename = `${Date.now()}-${to.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
  const content = `
    <p><strong>To:</strong> ${to}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <hr />
    ${html}
  `;
  await writeFile(join(MAIL_DIR, filename), content);
  logger.info({ to, subject, file: filename }, 'Email written to maildump/');
}

export function brandedEmailHtml(content: string, tenantName: string, primaryColor?: string | null, logoUrl?: string | null): string {
  const color = primaryColor || '#8B4513';
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${tenantName}" style="height:40px;width:40px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;" />`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
  <table width="100%" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:${color};padding:16px 24px;">
      <table width="100%"><tr>
        <td style="color:#fff;font-size:18px;font-weight:600;">${logo}${tenantName}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px;">
      ${content}
    </td></tr>
    <tr><td style="padding:12px 24px;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">Qlisted &middot; ${tenantName}</p>
    </td></tr>
  </table>
</td></tr></table>
</body>
</html>`;
}

export async function sendDemoNotification(email: string, name: string, restaurant: string) {
  const html = `
    <h2>New Demo Request</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Restaurant:</strong> ${restaurant}</p>
    <hr />
    <p style="color:#666;font-size:12px;">Qlisted</p>
  `;

  await sendEmail({
    to: email,
    subject: `Thanks for your interest, ${name}!`,
    html: `
      <h2>Thanks for reaching out!</h2>
      <p>Hi ${name},</p>
      <p>We've received your demo request for <strong>${restaurant}</strong> and will be in touch within 24 hours.</p>
      <p>In the meantime, you can start your <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding">self-service setup</a> right away.</p>
      <hr />
      <p style="color:#666;font-size:12px;">Qlisted</p>
    `,
  });

  if (smtpHost) {
    await sendEmail({
      to: FROM,
      subject: `Demo request from ${name} — ${restaurant}`,
      html,
    });
  }
}
