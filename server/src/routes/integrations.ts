import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { getIntegrations, createIntegration, updateIntegration, deleteIntegration } from '../services/integrationService.js';

const integrations = new Hono();

const integrationSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(['delivery', 'accounting', 'custom']),
  url: z.string().url(),
  events: z.string().optional().default('order_created,payment_completed'),
});

integrations.get('/:slug/integrations', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const list = await getIntegrations(tenantId);
  return c.json({ data: list });
});

integrations.post('/:slug/integrations', authMiddleware, requireRole('admin'), resolveTenant, zValidator('json', integrationSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = c.req.valid('json');
  const result = await createIntegration(tenantId, body);
  return c.json({ data: result }, 201);
});

integrations.put('/:slug/integrations/:integrationId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const integrationId = c.req.param('integrationId')!;
  const body = await c.req.json() as { name?: string; url?: string; events?: string; isActive?: boolean };
  await updateIntegration(integrationId, tenantId, body);
  return c.json({ success: true });
});

integrations.delete('/:slug/integrations/:integrationId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const integrationId = c.req.param('integrationId')!;
  await deleteIntegration(integrationId, tenantId);
  return c.json({ success: true });
});

export default integrations;
