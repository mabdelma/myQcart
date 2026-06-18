import { z } from 'zod';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as giftCardService from '../services/giftCardService.js';

const giftCardRoutes = new Hono();

giftCardRoutes.post('/:slug/gift-cards', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    code: z.string().min(1),
    initialBalance: z.number().positive(),
    expiresAt: z.string().optional(),
  });
  const parsed = schema.parse(body);
  const tenantId = c.get('tenantId')!;
  const gc = await giftCardService.createGiftCard(tenantId, parsed);
  return c.json(gc, 201);
});

giftCardRoutes.get('/:slug/gift-cards', authMiddleware, requireRole('admin', 'manager', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const list = await giftCardService.getGiftCards(tenantId);
  return c.json(list);
});

giftCardRoutes.get('/:slug/gift-cards/lookup/:code', authMiddleware, requireRole('admin', 'manager', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const code = c.req.param('code')!;
  const gc = await giftCardService.getGiftCardByCode(tenantId, code);
  if (!gc) return c.json({ error: 'Gift card not found' }, 404);
  return c.json(gc);
});

giftCardRoutes.post('/:slug/gift-cards/redeem', authMiddleware, requireRole('admin', 'manager', 'cashier'), resolveTenant, async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    code: z.string().min(1),
    orderId: z.string().min(1),
  });
  const parsed = schema.parse(body);
  const tenantId = c.get('tenantId')!;
  const result = await giftCardService.redeemGiftCard(tenantId, parsed.code, parsed.orderId);
  return c.json(result);
});

giftCardRoutes.patch('/:slug/gift-cards/:id/deactivate', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const id = c.req.param('id')!;
  const gc = await giftCardService.deactivateGiftCard(tenantId, id);
  return c.json(gc);
});

giftCardRoutes.get('/:slug/gift-cards/:id/redemptions', authMiddleware, requireRole('admin', 'manager', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const id = c.req.param('id')!;
  const redemptions = await giftCardService.getRedemptions(tenantId, id);
  return c.json(redemptions);
});

export default giftCardRoutes;
