// Mailbox management via the shared mailcow API. Lets super-admins create/list/
// delete @qlisted.com email accounts from the Qlisted console. Reaches mailcow's
// nginx over the `edge` docker network; the cert is for the mailcow vhost so we
// pin SNI + Host and skip cert-name validation on that internal hop.
import https from 'node:https';
import { logger } from '../lib/logger.js';

const API_HOST = process.env.MAILCOW_API_HOST || 'mailcowdockerized-nginx-mailcow-1'; // network-reachable host
const VHOST = process.env.MAILCOW_API_VHOST || 'mail.entrequipos.com'; // SNI + Host header
const KEY = process.env.MAILCOW_API_KEY || '';
export const MAIL_DOMAIN = process.env.MAILCOW_MAIL_DOMAIN || 'qlisted.com';

export function mailEnabled(): boolean {
  return Boolean(KEY && API_HOST);
}

interface McResult { status: number; json: unknown }

function mcRequest(method: string, path: string, body?: unknown): Promise<McResult> {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        host: API_HOST,
        port: 443,
        path,
        method,
        servername: VHOST,
        rejectUnauthorized: false,
        timeout: 12000,
        headers: {
          'X-API-Key': KEY,
          Host: VHOST,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json: unknown = buf;
          try { json = JSON.parse(buf); } catch { /* keep raw */ }
          resolve({ status: res.statusCode || 0, json });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('mailcow timeout')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const mcSucceeded = (json: unknown) =>
  Array.isArray(json) && json.some((x) => (x as { type?: string }).type === 'success');
const mcMessage = (json: unknown) =>
  (Array.isArray(json) && JSON.stringify((json[0] as { msg?: unknown })?.msg)) || 'mailcow error';

export interface MailboxRow { username: string; name: string; active: boolean; quota: number; messages: number }

export async function listMailboxes() {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  try {
    const r = await mcRequest('GET', `/api/v1/get/mailbox/all/${MAIL_DOMAIN}`);
    const rows: MailboxRow[] = Array.isArray(r.json)
      ? (r.json as Record<string, unknown>[]).map((m) => ({
          username: String(m.username || ''),
          name: String(m.name || ''),
          active: m.active === 1 || m.active === '1',
          quota: Number(m.quota || 0),
          messages: Number(m.messages || 0),
        }))
      : [];
    return { data: rows, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow list failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function createMailbox(localPart: string, name: string, password: string) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62})$/i.test(localPart)) return { error: 'Invalid address', status: 400 as const };
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters', status: 400 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/add/mailbox', {
      local_part: localPart, domain: MAIL_DOMAIN, name: name || localPart,
      password, password2: password, quota: '1024', active: '1',
    });
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { email: `${localPart}@${MAIL_DOMAIN}` }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow create failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function deleteMailbox(email: string) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  // Scope guard: this console only manages the Qlisted domain.
  if (!email.toLowerCase().endsWith(`@${MAIL_DOMAIN}`)) return { error: 'Out of scope', status: 403 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/delete/mailbox', [email]);
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { deleted: email }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow delete failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}
