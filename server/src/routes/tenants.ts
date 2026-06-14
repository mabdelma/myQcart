import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createTenant, getTenantBySlug, updateTenantSettings } from '../services/tenantService.js';

const tenants = new Hono();

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  email: z.string().email(),
  phone: z.string().optional(),
  adminName: z.string().min(1).max(100),
  adminPassword: z.string().min(6).max(100),
});

tenants.post('/', zValidator('json', createTenantSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await createTenant(input);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

tenants.get('/:slug', async (c) => {
  const slug = c.req.param('slug')!;
  const result = await getTenantBySlug(slug);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

tenants.put('/:slug/settings', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();

  await updateTenantSettings(tenantId, body);
  return c.json({ success: true });
});

export default tenants;
