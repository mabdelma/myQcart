import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as taxCategoryService from '../services/taxCategoryService.js';

const taxCategoryRoutes = new Hono();

const createTaxCategorySchema = z.object({
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(1),
  isDefault: z.boolean().optional(),
});

const updateTaxCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rate: z.number().min(0).max(1).optional(),
  isDefault: z.boolean().optional(),
});

taxCategoryRoutes.get('/:slug/tax-categories', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const result = await taxCategoryService.listTaxCategories(tenantId);
  return c.json(result.data);
});

taxCategoryRoutes.post('/:slug/tax-categories', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', createTaxCategorySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const result = await taxCategoryService.createTaxCategory(tenantId, input);
  return c.json(result.data, result.status);
});

taxCategoryRoutes.put('/:slug/tax-categories/:id', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', updateTaxCategorySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const categoryId = c.req.param('id')!;
  const input = c.req.valid('json');
  const result = await taxCategoryService.updateTaxCategory(tenantId, categoryId, input);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

taxCategoryRoutes.delete('/:slug/tax-categories/:id', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const categoryId = c.req.param('id')!;
  const result = await taxCategoryService.deleteTaxCategory(tenantId, categoryId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

export { taxCategoryRoutes };
