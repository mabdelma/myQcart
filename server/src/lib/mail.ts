import { Resend } from 'resend';
import { logger } from './logger.js';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM = process.env.MAIL_FROM || 'noreply@qcart.app';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    logger.info({ to, subject }, 'Mail disabled — RESEND_API_KEY not set');
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error({ error, to, subject }, 'Failed to send email');
    return;
  }

  logger.info({ to, subject }, 'Email sent');
}

export async function sendDemoNotification(email: string, name: string, restaurant: string) {
  const html = `
    <h2>New Demo Request</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Restaurant:</strong> ${restaurant}</p>
    <hr />
    <p style="color:#666;font-size:12px;">QCart — qcart.gmtmall.com</p>
  `;

  await sendEmail({
    to: email,
    subject: `Thanks for your interest, ${name}!`,
    html: `
      <h2>Thanks for reaching out!</h2>
      <p>Hi ${name},</p>
      <p>We've received your demo request for <strong>${restaurant}</strong> and will be in touch within 24 hours.</p>
      <p>In the meantime, you can start your <a href="https://qcart.gmtmall.com/onboarding">self-service setup</a> right away.</p>
      <hr />
      <p style="color:#666;font-size:12px;">QCart — qcart.gmtmall.com</p>
    `,
  });

  if (resend) {
    await sendEmail({
      to: 'hello@qcart.app',
      subject: `Demo request from ${name} — ${restaurant}`,
      html,
    });
  }
}
