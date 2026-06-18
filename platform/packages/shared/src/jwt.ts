import { createHmac, timingSafeEqual } from "crypto";

/**
 * Compact HS256-style JWT helpers shared by all services. `auth` signs tokens;
 * every other service verifies them with the same AUTH_SECRET. Deliberately
 * dependency-free so it works in any runtime (Node, edge, workers).
 */

const b64url = (b: Buffer) => b.toString("base64url");
const fromB64url = (s: string) => Buffer.from(s, "base64url");

export interface ServiceClaims {
  sub: string; // user id
  role?: string;
  email?: string;
  exp: number; // epoch ms
  [k: string]: unknown;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function signToken(claims: Omit<ServiceClaims, "exp"> & { ttlMs?: number }): string {
  const { ttlMs = 24 * 3600_000, ...rest } = claims;
  const payload = b64url(Buffer.from(JSON.stringify({ ...rest, exp: Date.now() + ttlMs })));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(token?: string | null): ServiceClaims | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = b64url(createHmac("sha256", secret()).update(payload).digest());
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(fromB64url(payload).toString()) as ServiceClaims;
    if (!claims.sub || typeof claims.exp !== "number" || claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Pull a bearer token from an Authorization header. */
export function bearer(header?: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1] : null;
}
