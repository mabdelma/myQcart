import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  getStockItems, createStockItem, updateStockItem, deleteStockItem,
  recordStockMovement, getStockMovements, getLowStockItems,
  linkIngredient, unlinkIngredient, getMenuItemIngredients,
} from '../services/inventoryService.js';

const inventory = new Hono();

const stockItemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().optional().default('units'),
  currentStock: z.number().min(0).optional().default(0),
  minStock: z.number().min(0).optional().default(0),
  costPerUnit: z.number().min(0).optional().default(0),
});

const movementSchema = z.object({
  stockItemId: z.string().min(1),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().min(0),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

inventory.get('/:slug/inventory', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const items = await getStockItems(tenantId);
  return c.json({ data: items });
});

inventory.post('/:slug/inventory', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', stockItemSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = c.req.valid('json');
  const result = await createStockItem(tenantId, body);
  return c.json({ data: result }, 201);
});

inventory.put('/:slug/inventory/:itemId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', stockItemSchema.partial()), async (c) => {
  const tenantId = c.get('tenantId');
  const itemId = c.req.param('itemId')!;
  const body = c.req.valid('json');
  await updateStockItem(itemId, tenantId, body);
  return c.json({ success: true });
});

inventory.delete('/:slug/inventory/:itemId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const itemId = c.req.param('itemId')!;
  await deleteStockItem(itemId, tenantId);
  return c.json({ success: true });
});

inventory.get('/:slug/inventory/low-stock', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const items = await getLowStockItems(tenantId);
  return c.json({ data: items });
});

inventory.get('/:slug/inventory/movements', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const stockItemId = c.req.query('stockItemId');
  const movements = await getStockMovements(tenantId, stockItemId);
  return c.json({ data: movements });
});

inventory.post('/:slug/inventory/movements', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', movementSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = c.req.valid('json');
  const result = await recordStockMovement(tenantId, body);
  return c.json({ data: result }, 201);
});

inventory.get('/:slug/inventory/ingredients/:menuItemId', resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const ingredients = await getMenuItemIngredients(menuItemId);
  return c.json({ data: ingredients });
});

inventory.post('/:slug/inventory/ingredients/:menuItemId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const { stockItemId, quantity } = await c.req.json() as { stockItemId: string; quantity: number };
  const result = await linkIngredient(menuItemId, stockItemId, quantity);
  return c.json({ data: result }, 201);
});

inventory.delete('/:slug/inventory/ingredients/:menuItemId/:stockItemId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const stockItemId = c.req.param('stockItemId')!;
  await unlinkIngredient(menuItemId, stockItemId);
  return c.json({ success: true });
});

export default inventory;
