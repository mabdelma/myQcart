import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function getCustomers(tenantId: string) {
  return db.select().from(schema.customers).where(eq(schema.customers.tenantId, tenantId)).orderBy(schema.customers.createdAt);
}

export async function findOrCreateCustomer(tenantId: string, data: { name: string; email?: string; phone?: string }) {
  let [customer] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.tenantId, tenantId), eq(schema.customers.email, data.email || '')))
    .limit(1);

  if (!customer && data.phone) {
    [customer] = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.tenantId, tenantId), eq(schema.customers.phone, data.phone)))
      .limit(1);
  }

  if (!customer) {
    const id = uuid();
    await db.insert(schema.customers).values({ id, tenantId, ...data });
    [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  }

  return customer!;
}

export async function recordCustomerVisit(customerId: string, orderTotal: number) {
  await db.update(schema.customers)
    .set({
      totalVisits: sql`${schema.customers.totalVisits} + 1`,
      totalSpent: sql`${schema.customers.totalSpent} + ${orderTotal}`,
      lastVisit: new Date().toISOString(),
      loyaltyPoints: sql`${schema.customers.loyaltyPoints} + ${Math.floor(orderTotal)}`,
    })
    .where(eq(schema.customers.id, customerId));
}

export async function updateCustomer(customerId: string, tenantId: string, data: Partial<{ name: string; email: string; phone: string; notes: string }>) {
  await db.update(schema.customers).set(data).where(and(eq(schema.customers.id, customerId), eq(schema.customers.tenantId, tenantId)));
}
