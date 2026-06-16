import type { Context, Next } from 'hono';
import { db, schema } from '../db/index.js';
import { v4 as uuid } from 'uuid';

export function auditLog(action: string, resource: string) {
  return async (c: Context, next: Next) => {
    await next();

    const userId = c.get('userId');
    const tenantId = c.get('tenantId') || c.get('userTenantId');
    const resourceId = c.req.param('id') || c.req.param('userId') || c.req.param('orderId');

    try {
      await db.insert(schema.auditLogs).values({
        id: uuid(),
        tenantId,
        userId,
        action,
        resource,
        resourceId,
        details: JSON.stringify({ method: c.req.method, path: c.req.path }),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '',
      });
    } catch {
      // Non-blocking: never fail the request on audit log failure
    }
  };
}
