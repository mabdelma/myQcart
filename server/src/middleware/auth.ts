import type { Context, Next } from 'hono';
import { getTokenFromRequest, verifyToken } from '../lib/auth.js';
import { HTTPException } from 'hono/http-exception';

export async function authMiddleware(c: Context, next: Next) {
  const token = getTokenFromRequest(c);
  if (!token) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }
  try {
    const payload = await verifyToken(token);
    c.set('userId', payload.userId);
    // super_admin has no tenant; leave tenant ids unset for them.
    if (payload.tenantId) {
      c.set('tenantId', payload.tenantId);
      c.set('userTenantId', payload.tenantId); // immutable record of the user's own tenant
    }
    c.set('role', payload.role);
    await next();
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const role = c.get('role');
    if (!roles.includes(role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }
    await next();
  };
}

export async function optionalAuth(c: Context, next: Next) {
  const token = getTokenFromRequest(c);
  if (token) {
    try {
      const payload = await verifyToken(token);
      c.set('userId', payload.userId);
      if (payload.tenantId) {
        c.set('tenantId', payload.tenantId);
        c.set('userTenantId', payload.tenantId);
      }
      c.set('role', payload.role);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  await next();
}
