import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function getModifierGroups(tenantId: string) {
  const groups = await db
    .select()
    .from(schema.modifierGroups)
    .where(eq(schema.modifierGroups.tenantId, tenantId))
    .orderBy(schema.modifierGroups.sortOrder);

  const result = [];
  for (const group of groups) {
    const options = await db
      .select()
      .from(schema.modifierOptions)
      .where(eq(schema.modifierOptions.groupId, group.id))
      .orderBy(schema.modifierOptions.sortOrder);
    result.push({ ...group, options });
  }
  return result;
}

export async function getMenuItemModifiers(menuItemId: string) {
  const links = await db
    .select()
    .from(schema.menuItemModifiers)
    .where(eq(schema.menuItemModifiers.menuItemId, menuItemId))
    .orderBy(schema.menuItemModifiers.sortOrder);

  const result = [];
  for (const link of links) {
    const [group] = await db
      .select()
      .from(schema.modifierGroups)
      .where(eq(schema.modifierGroups.id, link.modifierGroupId))
      .limit(1);
    if (group) {
      const options = await db
        .select()
        .from(schema.modifierOptions)
        .where(eq(schema.modifierOptions.groupId, group.id))
        .orderBy(schema.modifierOptions.sortOrder);
      result.push({ ...group, options });
    }
  }
  return result;
}

export async function createModifierGroup(tenantId: string, data: { name: string; selectionType?: 'single' | 'multiple'; isRequired?: boolean; sortOrder?: number }) {
  const id = uuid();
  await db.insert(schema.modifierGroups).values({ id, tenantId, ...data });
  return { id };
}

export async function updateModifierGroup(groupId: string, tenantId: string, data: Partial<{ name: string; selectionType: 'single' | 'multiple'; isRequired: boolean; sortOrder: number }>) {
  await db.update(schema.modifierGroups).set(data).where(and(eq(schema.modifierGroups.id, groupId), eq(schema.modifierGroups.tenantId, tenantId)));
}

export async function deleteModifierGroup(groupId: string, tenantId: string) {
  await db.delete(schema.modifierOptions).where(eq(schema.modifierOptions.groupId, groupId));
  await db.delete(schema.menuItemModifiers).where(eq(schema.menuItemModifiers.modifierGroupId, groupId));
  await db.delete(schema.modifierGroups).where(and(eq(schema.modifierGroups.id, groupId), eq(schema.modifierGroups.tenantId, tenantId)));
}

export async function addModifierOption(groupId: string, data: { name: string; priceAdjustment?: number; maxSelectable?: number; sortOrder?: number }) {
  const id = uuid();
  await db.insert(schema.modifierOptions).values({ id, groupId, ...data });
  return { id };
}

export async function updateModifierOption(optionId: string, data: Partial<{ name: string; priceAdjustment: number; maxSelectable: number; sortOrder: number }>) {
  await db.update(schema.modifierOptions).set(data).where(eq(schema.modifierOptions.id, optionId));
}

export async function deleteModifierOption(optionId: string) {
  await db.delete(schema.modifierOptions).where(eq(schema.modifierOptions.id, optionId));
}

export async function linkMenuItemModifier(menuItemId: string, modifierGroupId: string) {
  const id = uuid();
  await db.insert(schema.menuItemModifiers).values({ id, menuItemId, modifierGroupId });
  return { id };
}

export async function unlinkMenuItemModifier(menuItemId: string, modifierGroupId: string) {
  await db.delete(schema.menuItemModifiers)
    .where(and(eq(schema.menuItemModifiers.menuItemId, menuItemId), eq(schema.menuItemModifiers.modifierGroupId, modifierGroupId)));
}
