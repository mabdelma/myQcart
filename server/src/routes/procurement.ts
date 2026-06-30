import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as svc from '../services/procurementService.js';

const procurement = new Hono();
const adminMgr = [authMiddleware, requireRole('admin', 'manager'), resolveTenant] as const;

const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const poSchema = z.object({
  supplierId: z.string().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    stockItemId: z.string().nullable().optional(),
    name: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
  })).min(1),
});

// ── Suppliers ──
procurement.get('/:slug/suppliers', ...adminMgr, async (c) => c.json(await svc.listSuppliers(c.get('tenantId'))));
procurement.post('/:slug/suppliers', ...adminMgr, zValidator('json', supplierSchema), async (c) => c.json(await svc.createSupplier(c.get('tenantId'), c.req.valid('json')), 201));
procurement.put('/:slug/suppliers/:id', ...adminMgr, async (c) => c.json(await svc.updateSupplier(c.get('tenantId'), c.req.param('id')!, await c.req.json())));
procurement.delete('/:slug/suppliers/:id', ...adminMgr, async (c) => c.json(await svc.deleteSupplier(c.get('tenantId'), c.req.param('id')!)));

// ── Purchase orders ──
procurement.get('/:slug/purchase-orders', ...adminMgr, async (c) => c.json(await svc.listPurchaseOrders(c.get('tenantId'))));
procurement.get('/:slug/purchase-orders/suggest', ...adminMgr, async (c) => c.json(await svc.suggestReorder(c.get('tenantId'))));
procurement.post('/:slug/purchase-orders', ...adminMgr, zValidator('json', poSchema), async (c) => {
  const r = await svc.createPurchaseOrder(c.get('tenantId'), c.req.valid('json'));
  if ('error' in r) return c.json({ error: r.error }, r.status);
  return c.json(r.data, r.status);
});
procurement.post('/:slug/purchase-orders/:id/receive', ...adminMgr, async (c) => {
  const r = await svc.receivePurchaseOrder(c.get('tenantId'), c.req.param('id')!);
  if ('error' in r) return c.json({ error: r.error }, r.status);
  return c.json(r.data, r.status);
});
procurement.post('/:slug/purchase-orders/:id/cancel', ...adminMgr, async (c) => c.json(await svc.cancelPurchaseOrder(c.get('tenantId'), c.req.param('id')!)));

export default procurement;
