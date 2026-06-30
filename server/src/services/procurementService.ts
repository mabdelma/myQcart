import { db, schema } from '../db/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { recordStockMovement, getLowStockItems } from './inventoryService.js';

// ── Suppliers ───────────────────────────────────────────────────────────────
export async function listSuppliers(tenantId: string) {
  return db.select().from(schema.suppliers).where(eq(schema.suppliers.tenantId, tenantId)).orderBy(schema.suppliers.name);
}

export async function createSupplier(tenantId: string, data: { name: string; email?: string; phone?: string; notes?: string }) {
  const id = uuid();
  await db.insert(schema.suppliers).values({ id, tenantId, name: data.name, email: data.email, phone: data.phone, notes: data.notes });
  return { id };
}

export async function updateSupplier(tenantId: string, id: string, data: Partial<{ name: string; email: string; phone: string; notes: string }>) {
  await db.update(schema.suppliers).set(data).where(and(eq(schema.suppliers.id, id), eq(schema.suppliers.tenantId, tenantId)));
  return { success: true };
}

export async function deleteSupplier(tenantId: string, id: string) {
  await db.delete(schema.suppliers).where(and(eq(schema.suppliers.id, id), eq(schema.suppliers.tenantId, tenantId)));
  return { success: true };
}

// ── Purchase orders ─────────────────────────────────────────────────────────
type POItemInput = { stockItemId?: string | null; name: string; quantity: number; unitCost: number };

export async function listPurchaseOrders(tenantId: string) {
  const pos = await db.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.tenantId, tenantId)).orderBy(desc(schema.purchaseOrders.createdAt));
  const out = [];
  for (const po of pos) {
    const items = await db.select().from(schema.purchaseOrderItems).where(eq(schema.purchaseOrderItems.poId, po.id));
    out.push({ ...po, items });
  }
  return out;
}

export async function createPurchaseOrder(tenantId: string, data: { supplierId?: string | null; notes?: string; items: POItemInput[] }) {
  const items = (data.items || []).filter((i) => i.name && i.quantity > 0);
  if (items.length === 0) return { error: 'Add at least one item', status: 400 as const };
  const id = uuid();
  const total = +items.reduce((s, it) => s + it.quantity * it.unitCost, 0).toFixed(2);
  await db.insert(schema.purchaseOrders).values({ id, tenantId, supplierId: data.supplierId || null, status: 'ordered', total, notes: data.notes });
  for (const it of items) {
    await db.insert(schema.purchaseOrderItems).values({ id: uuid(), poId: id, stockItemId: it.stockItemId || null, name: it.name, quantity: it.quantity, unitCost: it.unitCost });
  }
  return { data: { id, total }, status: 201 as const };
}

/** Mark a PO received — adds each line's quantity to its linked stock item. */
export async function receivePurchaseOrder(tenantId: string, poId: string) {
  const [po] = await db.select().from(schema.purchaseOrders).where(and(eq(schema.purchaseOrders.id, poId), eq(schema.purchaseOrders.tenantId, tenantId))).limit(1);
  if (!po) return { error: 'Purchase order not found', status: 404 as const };
  if (po.status === 'received') return { error: 'Already received', status: 400 as const };
  const items = await db.select().from(schema.purchaseOrderItems).where(eq(schema.purchaseOrderItems.poId, poId));
  for (const it of items) {
    if (it.stockItemId) {
      await recordStockMovement(tenantId, { stockItemId: it.stockItemId, type: 'in', quantity: it.quantity, reason: 'Purchase order received', referenceType: 'purchase_order', referenceId: poId });
    }
  }
  await db.update(schema.purchaseOrders).set({ status: 'received', receivedAt: new Date().toISOString() }).where(eq(schema.purchaseOrders.id, poId));
  return { data: { success: true }, status: 200 as const };
}

export async function cancelPurchaseOrder(tenantId: string, poId: string) {
  await db.update(schema.purchaseOrders).set({ status: 'cancelled' })
    .where(and(eq(schema.purchaseOrders.id, poId), eq(schema.purchaseOrders.tenantId, tenantId), sql`${schema.purchaseOrders.status} <> 'received'`));
  return { success: true };
}

/** Auto-reorder: turn low-stock items into suggested PO lines (top up to 2x min). */
export async function suggestReorder(tenantId: string) {
  const low = await getLowStockItems(tenantId);
  return low.map((s) => ({
    stockItemId: s.id,
    name: s.name,
    unit: s.unit,
    quantity: Math.max(1, Math.ceil(Number(s.minStock) * 2 - Number(s.currentStock))),
    unitCost: Number(s.costPerUnit || 0),
  }));
}
