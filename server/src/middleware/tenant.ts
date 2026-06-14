import type { Context, Next } from 'hono';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

export async function resolveTenant(c: Context, next: Next) {
  const slug = c.req.param('slug');
  if (!slug) {
    throw new HTTPException(400, { message: 'Tenant slug required' });
  }
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw new HTTPException(404, { message: 'Restaurant not found' });
  }
  if (!tenant.isActive) {
    throw new HTTPException(403, { message: 'Restaurant is inactive' });
  }

  // Tenant isolation: if the request is authenticated (userTenantId is set by
  // authMiddleware), a non-super_admin may only act on their OWN tenant. This
  // blocks cross-tenant access (e.g. admin of A calling /api/r/<B>/...). Public
  // routes (QR menu/ordering) have no userTenantId set, so they're unaffected.
  const userTenantId = c.get('userTenantId');
  const role = c.get('role');
  if (userTenantId && role !== 'super_admin' && userTenantId !== tenant.id) {
    throw new HTTPException(403, { message: 'Forbidden: cross-tenant access' });
  }

  c.set('tenant', tenant);
  c.set('tenantId', tenant.id);
  await next();
}
