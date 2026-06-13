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

  c.set('tenant', tenant);
  c.set('tenantId', tenant.id);
  await next();
}
