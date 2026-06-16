import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function getStockItems(tenantId: string) {
  return db.select().from(schema.stockItems).where(eq(schema.stockItems.tenantId, tenantId)).orderBy(schema.stockItems.name);
}

export async function createStockItem(tenantId: string, data: { name: string; unit?: string; currentStock?: number; minStock?: number; costPerUnit?: number }) {
  const id = uuid();
  await db.insert(schema.stockItems).values({ id, tenantId, ...data });
  return { id };
}

export async function updateStockItem(itemId: string, tenantId: string, data: Partial<{ name: string; unit: string; currentStock: number; minStock: number; costPerUnit: number }>) {
  await db.update(schema.stockItems).set({ ...data, updatedAt: new Date().toISOString() }).where(and(eq(schema.stockItems.id, itemId), eq(schema.stockItems.tenantId, tenantId)));
}

export async function deleteStockItem(itemId: string, tenantId: string) {
  await db.delete(schema.menuItemIngredients).where(eq(schema.menuItemIngredients.stockItemId, itemId));
  await db.delete(schema.stockMovements).where(eq(schema.stockMovements.stockItemId, itemId));
  await db.delete(schema.stockItems).where(and(eq(schema.stockItems.id, itemId), eq(schema.stockItems.tenantId, tenantId)));
}

export async function recordStockMovement(tenantId: string, data: { stockItemId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reason?: string; referenceType?: string; referenceId?: string }) {
  const movementId = uuid();
  await db.insert(schema.stockMovements).values({ id: movementId, tenantId, ...data });
  const adjustment = data.type === 'out' ? -data.quantity : data.quantity;
  const [item] = await db.select().from(schema.stockItems).where(eq(schema.stockItems.id, data.stockItemId)).limit(1);
  const newStock = Math.max(0, (item?.currentStock || 0) + adjustment);
  await db.update(schema.stockItems).set({
    currentStock: newStock,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.stockItems.id, data.stockItemId));
  return { id: movementId };
}

export async function getStockMovements(tenantId: string, stockItemId?: string) {
  const conditions = [eq(schema.stockMovements.tenantId, tenantId)];
  if (stockItemId) conditions.push(eq(schema.stockMovements.stockItemId, stockItemId));
  return db.select().from(schema.stockMovements).where(and(...conditions)).orderBy(schema.stockMovements.createdAt);
}

export async function getLowStockItems(tenantId: string) {
  return db
    .select()
    .from(schema.stockItems)
    .where(and(eq(schema.stockItems.tenantId, tenantId), sql`${schema.stockItems.currentStock} <= ${schema.stockItems.minStock}`))
    .orderBy(schema.stockItems.name);
}

export async function linkIngredient(menuItemId: string, stockItemId: string, quantity: number) {
  const id = uuid();
  await db.insert(schema.menuItemIngredients).values({ id, menuItemId, stockItemId, quantity });
  return { id };
}

export async function unlinkIngredient(menuItemId: string, stockItemId: string) {
  await db.delete(schema.menuItemIngredients).where(and(eq(schema.menuItemIngredients.menuItemId, menuItemId), eq(schema.menuItemIngredients.stockItemId, stockItemId)));
}

export async function getMenuItemIngredients(menuItemId: string) {
  return db
    .select()
    .from(schema.menuItemIngredients)
    .innerJoin(schema.stockItems, eq(schema.menuItemIngredients.stockItemId, schema.stockItems.id))
    .where(eq(schema.menuItemIngredients.menuItemId, menuItemId));
}
