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

export interface MailboxRow {
  username: string;
  name: string;
  active: boolean;
  quotaMb: number;
  usedMb: number;
  messages: number;
  lastLogin: string | null;
}

export interface AliasRow { id: number; address: string; goto: string; active: boolean }

// All mailbox writes are scoped to the Qlisted domain — never touch other tenants' mail.
function inScope(email: string) {
  return email.toLowerCase().endsWith(`@${MAIL_DOMAIN}`);
}

export async function listMailboxes() {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  try {
    const r = await mcRequest('GET', `/api/v1/get/mailbox/all/${MAIL_DOMAIN}`);
    const rows: MailboxRow[] = Array.isArray(r.json)
      ? (r.json as Record<string, unknown>[]).map((m) => {
          const last = (m.last_imap_login && String(m.last_imap_login)) || (m.last_pop3_login && String(m.last_pop3_login)) || '0';
          return {
            username: String(m.username || ''),
            name: String(m.name || ''),
            active: m.active === 1 || m.active === '1' || m.active === true,
            quotaMb: Math.round(Number(m.quota || 0) / 1048576),
            usedMb: Math.round(Number(m.quota_used || 0) / 1048576),
            messages: Number(m.messages || 0),
            lastLogin: last && last !== '0' ? new Date(Number(last) * 1000).toISOString() : null,
          };
        })
      : [];
    return { data: rows, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow list failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function setMailboxPassword(email: string, password: string) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  if (!inScope(email)) return { error: 'Out of scope', status: 403 as const };
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters', status: 400 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/edit/mailbox', { items: [email], attr: { password, password2: password } });
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { email }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow set-password failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function editMailbox(email: string, input: { name?: string; quotaMb?: number }) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  if (!inScope(email)) return { error: 'Out of scope', status: 403 as const };
  const attr: Record<string, string> = {};
  if (input.name !== undefined) attr.name = input.name;
  if (input.quotaMb !== undefined) attr.quota = String(Math.max(64, Math.round(input.quotaMb)));
  if (Object.keys(attr).length === 0) return { error: 'Nothing to update', status: 400 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/edit/mailbox', { items: [email], attr });
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { email }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow edit failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function setMailboxActive(email: string, active: boolean) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  if (!inScope(email)) return { error: 'Out of scope', status: 403 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/edit/mailbox', { items: [email], attr: { active: active ? '1' : '0' } });
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { email, active }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow set-active failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function listAliases() {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  try {
    const r = await mcRequest('GET', '/api/v1/get/alias/all');
    const rows: AliasRow[] = Array.isArray(r.json)
      ? (r.json as Record<string, unknown>[])
          .filter((a) => String(a.address || '').toLowerCase().endsWith(`@${MAIL_DOMAIN}`))
          .map((a) => ({
            id: Number(a.id),
            address: String(a.address || ''),
            goto: String(a.goto || ''),
            active: a.active === 1 || a.active === '1' || a.active === true,
          }))
      : [];
    return { data: rows, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow alias list failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function createAlias(address: string, goto: string) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  const addr = address.trim().toLowerCase();
  if (!addr.endsWith(`@${MAIL_DOMAIN}`)) return { error: 'Alias must be on the Qlisted domain', status: 400 as const };
  if (!goto.trim()) return { error: 'Destination is required', status: 400 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/add/alias', { address: addr, goto: goto.trim(), active: '1' });
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { address: addr, goto: goto.trim() }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow alias create failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function deleteAlias(id: number) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/delete/alias', [id]);
    if (!mcSucceeded(r.json)) return { error: mcMessage(r.json), status: 400 as const };
    return { data: { deleted: id }, status: 200 as const };
  } catch (e) {
    logger.error({ err: e }, 'mailcow alias delete failed');
    return { error: 'Could not reach the mail server', status: 502 as const };
  }
}

export async function createMailbox(localPart: string, name: string, password: string, quotaMb = 1024) {
  if (!mailEnabled()) return { error: 'Email service not configured', status: 501 as const };
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62})$/i.test(localPart)) return { error: 'Invalid address', status: 400 as const };
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters', status: 400 as const };
  try {
    const r = await mcRequest('POST', '/api/v1/add/mailbox', {
      local_part: localPart, domain: MAIL_DOMAIN, name: name || localPart,
      password, password2: password, quota: String(Math.max(64, Math.round(quotaMb))), active: '1',
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
