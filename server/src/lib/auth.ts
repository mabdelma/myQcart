import { sign, verify } from 'hono/jwt';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'qcart-dev-secret-change-in-production';
const JWT_EXPIRES_IN = 60 * 60 * 24; // 24 hours

export interface JwtPayload {
  sub: string;
  userId: string;
  tenantId: string | null; // null for platform-level super_admin
  role: string;
  exp: number;
}

export async function createToken(payload: Omit<JwtPayload, 'exp'>): Promise<string> {
  return sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN },
    JWT_SECRET,
    'HS256'
  );
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  return verify(token, JWT_SECRET, 'HS256') as unknown as Promise<JwtPayload>;
}

export function getTokenFromRequest(c: Context): string | null {
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  const cookie = getCookie(c, 'session');
  if (cookie) return cookie;
  return null;
}
