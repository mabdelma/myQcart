import { z } from 'zod';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as connectService from '../services/stripeConnectService.js';

const connectRoutes = new Hono();

connectRoutes.use('*', authMiddleware, resolveTenant);

connectRoutes.post('/:slug/connect/account', requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const schema = z.object({ email: z.string().email() });
  const { email } = schema.parse(body);
  const account = await connectService.createConnectAccount(tenantId, email);
  return c.json({ accountId: account.id }, 201);
});

connectRoutes.get('/:slug/connect/onboarding-link', requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const refreshUrl = `${new URL(c.req.url).origin}/admin/branding`;
  const returnUrl = `${new URL(c.req.url).origin}/admin/branding`;
  const link = await connectService.getOnboardingLink(tenantId, refreshUrl, returnUrl);
  return c.json({ url: link.url });
});

connectRoutes.get('/:slug/connect/status', requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const status = await connectService.getAccountStatus(tenantId);
  return c.json(status);
});

connectRoutes.get('/:slug/connect/balance', requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const balance = await connectService.getBalance(tenantId);
  return c.json(balance);
});

connectRoutes.post('/:slug/connect/payout', requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const schema = z.object({ amount: z.number().positive(), currency: z.string().default('usd') });
  const { amount, currency } = schema.parse(body);
  const payout = await connectService.createPayout(tenantId, amount, currency);
  return c.json(payout, 201);
});

connectRoutes.get('/:slug/connect/payouts', requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId')!;
  const payouts = await connectService.getPayoutHistory(tenantId);
  return c.json(payouts);
});

export default connectRoutes;
