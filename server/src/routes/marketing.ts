import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { sendCampaign } from '../services/marketingService.js';

const marketing = new Hono();

marketing.post('/:slug/marketing/campaign',
  authMiddleware, requireRole('admin', 'manager'), resolveTenant,
  zValidator('json', z.object({ segment: z.enum(['all', 'vip', 'atRisk']), subject: z.string().min(1), message: z.string().min(1) })),
  async (c) => {
    const tenantId = c.get('tenantId');
    const [t] = await db.select({ name: schema.tenants.name }).from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
    const r = await sendCampaign(tenantId, t?.name || 'Restaurant', c.req.valid('json'));
    return c.json(r);
  });

export default marketing;
