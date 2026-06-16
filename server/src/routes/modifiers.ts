import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  getModifierGroups, getMenuItemModifiers,
  createModifierGroup, updateModifierGroup, deleteModifierGroup,
  addModifierOption, updateModifierOption, deleteModifierOption,
  linkMenuItemModifier, unlinkMenuItemModifier,
} from '../services/modifierService.js';

const modifiers = new Hono();

const groupSchema = z.object({
  name: z.string().min(1),
  selectionType: z.enum(['single', 'multiple']).optional().default('single'),
  isRequired: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

const optionSchema = z.object({
  name: z.string().min(1),
  priceAdjustment: z.number().optional().default(0),
  maxSelectable: z.number().int().positive().optional().default(1),
  sortOrder: z.number().int().optional().default(0),
});

modifiers.get('/:slug/modifier-groups', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const groups = await getModifierGroups(tenantId);
  return c.json({ data: groups });
});

modifiers.post('/:slug/modifier-groups', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', groupSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = c.req.valid('json');
  const result = await createModifierGroup(tenantId, body);
  return c.json({ data: result }, 201);
});

modifiers.put('/:slug/modifier-groups/:groupId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', groupSchema.partial()), async (c) => {
  const tenantId = c.get('tenantId');
  const groupId = c.req.param('groupId')!;
  const body = c.req.valid('json');
  await updateModifierGroup(groupId, tenantId, body);
  return c.json({ success: true });
});

modifiers.delete('/:slug/modifier-groups/:groupId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const groupId = c.req.param('groupId')!;
  await deleteModifierGroup(groupId, tenantId);
  return c.json({ success: true });
});

modifiers.post('/:slug/modifier-groups/:groupId/options', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', optionSchema), async (c) => {
  const groupId = c.req.param('groupId')!;
  const body = c.req.valid('json');
  const result = await addModifierOption(groupId, body);
  return c.json({ data: result }, 201);
});

modifiers.put('/:slug/modifier-options/:optionId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', optionSchema.partial()), async (c) => {
  const optionId = c.req.param('optionId')!;
  const body = c.req.valid('json');
  await updateModifierOption(optionId, body);
  return c.json({ success: true });
});

modifiers.delete('/:slug/modifier-options/:optionId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const optionId = c.req.param('optionId')!;
  await deleteModifierOption(optionId);
  return c.json({ success: true });
});

modifiers.post('/:slug/menu-items/:menuItemId/modifiers/:groupId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const groupId = c.req.param('groupId')!;
  const result = await linkMenuItemModifier(menuItemId, groupId);
  return c.json({ data: result }, 201);
});

modifiers.delete('/:slug/menu-items/:menuItemId/modifiers/:groupId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const groupId = c.req.param('groupId')!;
  await unlinkMenuItemModifier(menuItemId, groupId);
  return c.json({ success: true });
});

modifiers.get('/:slug/menu-items/:menuItemId/modifiers', resolveTenant, async (c) => {
  const menuItemId = c.req.param('menuItemId')!;
  const result = await getMenuItemModifiers(menuItemId);
  return c.json({ data: result });
});

export default modifiers;
