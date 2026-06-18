import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function listTaxCategories(tenantId: string) {
  const categories = await db
    .select()
    .from(schema.taxCategories)
    .where(eq(schema.taxCategories.tenantId, tenantId))
    .orderBy(schema.taxCategories.name);
  return { data: categories, status: 200 as const };
}

export async function createTaxCategory(tenantId: string, input: { name: string; rate: number; isDefault?: boolean }) {
  const id = uuid();

  if (input.isDefault) {
    await db.update(schema.taxCategories)
      .set({ isDefault: false })
      .where(eq(schema.taxCategories.tenantId, tenantId));
  }

  await db.insert(schema.taxCategories).values({
    id,
    tenantId,
    name: input.name,
    rate: input.rate,
    isDefault: input.isDefault || false,
  });

  return { data: { id, name: input.name, rate: input.rate, isDefault: input.isDefault || false }, status: 201 as const };
}

export async function updateTaxCategory(tenantId: string, categoryId: string, input: { name?: string; rate?: number; isDefault?: boolean }) {
  const [existing] = await db
    .select()
    .from(schema.taxCategories)
    .where(and(eq(schema.taxCategories.id, categoryId), eq(schema.taxCategories.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    return { error: 'Tax category not found', status: 404 as const };
  }

  if (input.isDefault) {
    await db.update(schema.taxCategories)
      .set({ isDefault: false })
      .where(eq(schema.taxCategories.tenantId, tenantId));
  }

  await db.update(schema.taxCategories)
    .set({ ...input })
    .where(eq(schema.taxCategories.id, categoryId));

  return { data: { ...existing, ...input }, status: 200 as const };
}

export async function deleteTaxCategory(tenantId: string, categoryId: string) {
  const [existing] = await db
    .select()
    .from(schema.taxCategories)
    .where(and(eq(schema.taxCategories.id, categoryId), eq(schema.taxCategories.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    return { error: 'Tax category not found', status: 404 as const };
  }

  await db.update(schema.menuItems)
    .set({ taxCategoryId: null })
    .where(eq(schema.menuItems.taxCategoryId, categoryId));

  await db.delete(schema.taxCategories)
    .where(eq(schema.taxCategories.id, categoryId));

  return { data: { success: true }, status: 200 as const };
}
