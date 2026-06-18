import { z } from 'zod';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { sendOrderSms } from '../lib/sms.js';

const smsRoutes = new Hono();

smsRoutes.post('/:slug/sms/notify', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    phone: z.string().min(1),
    orderId: z.string().min(1),
    message: z.string().min(1),
  });
  const { phone, orderId, message } = schema.parse(body);
  const ok = await sendOrderSms(phone, orderId, message);
  return c.json({ sent: ok });
});

export default smsRoutes;
