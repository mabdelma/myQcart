import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';

function escapeCsv(val: unknown): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCsv).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(','));
  return [header, ...body].join('\n');
}

export async function exportOrders(tenantId: string, startDate?: string, endDate?: string): Promise<string> {
  const conditions = [eq(schema.orders.tenantId, tenantId)];
  if (startDate) conditions.push(sql`${schema.orders.createdAt}::timestamp >= ${startDate}::timestamp`);
  if (endDate) conditions.push(sql`${schema.orders.createdAt}::timestamp <= ${endDate}::timestamp + INTERVAL '1 day'`);

  const orders = await db
    .select()
    .from(schema.orders)
    .where(and(...conditions))
    .orderBy(schema.orders.createdAt);

  const rows = [];
  for (const order of orders) {
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    const [table] = order.tableId
      ? await db.select().from(schema.tables).where(eq(schema.tables.id, order.tableId)).limit(1)
      : [null];
    for (const item of items) {
      rows.push({
        orderId: order.id,
        tableNumber: table?.number || '',
        customerName: order.customerName || '',
        status: order.status,
        item: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: (item.unitPrice * item.quantity).toFixed(2),
        subtotal: order.subtotal.toFixed(2),
        tax: order.tax.toFixed(2),
        serviceCharge: order.serviceCharge.toFixed(2),
        total: order.total.toFixed(2),
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      });
    }
  }

  const columns = ['orderId', 'tableNumber', 'customerName', 'status', 'item', 'quantity', 'unitPrice', 'lineTotal', 'subtotal', 'tax', 'serviceCharge', 'total', 'paymentStatus', 'createdAt'];
  return toCsv(rows, columns);
}

export async function exportPayments(tenantId: string, startDate?: string, endDate?: string): Promise<string> {
  const conditions = [eq(schema.payments.tenantId, tenantId), eq(schema.payments.status, 'paid')];
  if (startDate) conditions.push(sql`${schema.payments.createdAt}::timestamp >= ${startDate}::timestamp`);
  if (endDate) conditions.push(sql`${schema.payments.createdAt}::timestamp <= ${endDate}::timestamp + INTERVAL '1 day'`);

  const payments = await db
    .select()
    .from(schema.payments)
    .where(and(...conditions))
    .orderBy(schema.payments.createdAt);

  const rows = payments.map((p) => ({
    paymentId: p.id,
    orderId: p.orderId,
    amount: p.amount.toFixed(2),
    tip: (p.tip || 0).toFixed(2),
    total: (p.amount + (p.tip || 0)).toFixed(2),
    method: p.method,
    status: p.status,
    createdAt: p.createdAt,
  }));

  return toCsv(rows, ['paymentId', 'orderId', 'amount', 'tip', 'total', 'method', 'status', 'createdAt']);
}

export async function exportMenuItems(tenantId: string): Promise<string> {
  const items = await db
    .select({
      id: schema.menuItems.id,
      name: schema.menuItems.name,
      categoryName: schema.menuCategories.name,
      price: schema.menuItems.price,
      available: schema.menuItems.available,
      sortOrder: schema.menuItems.sortOrder,
    })
    .from(schema.menuItems)
    .leftJoin(schema.menuCategories, eq(schema.menuItems.categoryId, schema.menuCategories.id))
    .where(eq(schema.menuItems.tenantId, tenantId))
    .orderBy(schema.menuItems.sortOrder);

  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.categoryName || '',
    price: i.price.toFixed(2),
    available: i.available ? 'Yes' : 'No',
    sortOrder: i.sortOrder,
  }));

  return toCsv(rows, ['id', 'name', 'category', 'price', 'available', 'sortOrder']);
}
