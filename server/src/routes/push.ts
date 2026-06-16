import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { resolveTenant } from '../middleware/tenant.js';
import { addSubscription, removeSubscription, getVapidPublicKey } from '../lib/push.js';
import { logger } from '../lib/logger.js';

const pushRoutes = new Hono();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().optional(),
});

pushRoutes.get('/:slug/push/vapid-key', resolveTenant, (c) => {
  const key = getVapidPublicKey();
  if (!key) return c.json({ error: 'Push notifications not configured' }, 501);
  return c.json({ publicKey: key });
});

pushRoutes.post('/:slug/push/subscribe', resolveTenant, zValidator('json', subscribeSchema), async (c) => {
  const tenantId = c.get('tenantId') as string;
  const { endpoint, keys, userAgent } = c.req.valid('json');
  await addSubscription(endpoint, keys.p256dh, keys.auth, tenantId, userAgent);
  logger.info({ tenantId }, 'Push subscription added');
  return c.json({ status: 'ok' });
});

pushRoutes.post('/:slug/push/unsubscribe', resolveTenant, async (c) => {
  const body = await c.req.json();
  if (!body.endpoint) return c.json({ error: 'Missing endpoint' }, 400);
  await removeSubscription(body.endpoint);
  logger.info({ endpoint: body.endpoint.slice(0, 30) }, 'Push subscription removed');
  return c.json({ status: 'ok' });
});

export default pushRoutes;
