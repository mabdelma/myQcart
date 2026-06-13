import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { logger } from '../lib/logger.js';

const menu = new Hono();

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['main', 'sub']).optional().default('main'),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
});

const itemSchema = z.object({
  categoryId: z.string().min(1),
  subCategoryId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().optional(),
  available: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  modifiers: z.string().optional(),
});

// Public: get full menu for a restaurant
menu.get('/:slug/menu', resolveTenant, async (c) => {
  const tenant = c.get('tenant');

  const categories = await db
    .select()
    .from(schema.menuCategories)
    .where(eq(schema.menuCategories.tenantId, tenant.id))
    .orderBy(schema.menuCategories.sortOrder);

  const items = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.tenantId, tenant.id))
    .orderBy(schema.menuItems.sortOrder);

  return c.json({ categories, items });
});

// Protected: manage categories
menu.post('/:slug/menu/categories', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', categorySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const id = uuid();

  await db.insert(schema.menuCategories).values({ id, tenantId, ...input });

  logger.info({ tenantId, categoryId: id }, 'Menu category created');
  return c.json({ id, ...input }, 201);
});

menu.put('/:slug/menu/categories/:categoryId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', categorySchema), async (c) => {
  const tenantId = c.get('tenantId');
  const categoryId = c.req.param('categoryId')!;
  const input = c.req.valid('json');

  await db.update(schema.menuCategories)
    .set(input)
    .where(and(eq(schema.menuCategories.id, categoryId), eq(schema.menuCategories.tenantId, tenantId)));

  return c.json({ success: true });
});

menu.delete('/:slug/menu/categories/:categoryId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const categoryId = c.req.param('categoryId')!;

  await db.delete(schema.menuCategories)
    .where(and(eq(schema.menuCategories.id, categoryId), eq(schema.menuCategories.tenantId, tenantId)));

  return c.json({ success: true });
});

// Protected: manage items
menu.post('/:slug/menu/items', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', itemSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const id = uuid();

  await db.insert(schema.menuItems).values({ id, tenantId, ...input });

  logger.info({ tenantId, itemId: id }, 'Menu item created');
  return c.json({ id, ...input }, 201);
});

menu.put('/:slug/menu/items/:itemId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const itemId = c.req.param('itemId')!;
  const body = await c.req.json();

  const allowed = ['categoryId', 'subCategoryId', 'name', 'description', 'price', 'imageUrl', 'available', 'sortOrder', 'modifiers'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await db.update(schema.menuItems)
    .set(updates)
    .where(and(eq(schema.menuItems.id, itemId), eq(schema.menuItems.tenantId, tenantId)));

  return c.json({ success: true });
});

menu.delete('/:slug/menu/items/:itemId', authMiddleware, requireRole('admin'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const itemId = c.req.param('itemId')!;

  await db.delete(schema.menuItems)
    .where(and(eq(schema.menuItems.id, itemId), eq(schema.menuItems.tenantId, tenantId)));

  return c.json({ success: true });
});

export default menu;
