import { sql, eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { giftCards, giftCardRedemptions, orders } from '../db/schema.js';

export async function createGiftCard(tenantId: string, data: {
  code: string;
  initialBalance: number;
  expiresAt?: string;
}) {
  const [gc] = await db.insert(giftCards).values({
    id: uuidv4(),
    tenantId,
    code: data.code,
    initialBalance: data.initialBalance,
    currentBalance: data.initialBalance,
    expiresAt: data.expiresAt,
  }).returning();
  return gc;
}

export async function getGiftCards(tenantId: string) {
  return db.select().from(giftCards)
    .where(eq(giftCards.tenantId, tenantId))
    .orderBy(giftCards.createdAt);
}

export async function getGiftCardByCode(tenantId: string, code: string) {
  const [gc] = await db.select().from(giftCards)
    .where(and(eq(giftCards.tenantId, tenantId), eq(giftCards.code, code)));
  return gc || null;
}

export async function redeemGiftCard(tenantId: string, code: string, orderId: string) {
  const gc = await getGiftCardByCode(tenantId, code);
  if (!gc) throw new Error('Gift card not found');
  if (!gc.isActive) throw new Error('Gift card is deactivated');
  if (gc.expiresAt && new Date(gc.expiresAt) < new Date()) throw new Error('Gift card has expired');
  if (gc.currentBalance <= 0) throw new Error('Gift card has no balance');

  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
  if (!order) throw new Error('Order not found');

  const remaining = order.total - order.paidAmount;
  const amount = Math.min(gc.currentBalance, remaining);
  if (amount <= 0) throw new Error('Order is already fully paid');

  await db.insert(giftCardRedemptions).values({
    id: uuidv4(),
    tenantId,
    giftCardId: gc.id,
    orderId,
    amount,
  });

  const newBalance = gc.currentBalance - amount;
  await db.update(giftCards)
    .set({ currentBalance: newBalance, updatedAt: sql`now()` })
    .where(eq(giftCards.id, gc.id));

  const newPaid = order.paidAmount + amount;
  const paymentStatus = newPaid >= order.total ? 'paid' : 'partially_paid';
  await db.update(orders)
    .set({ paidAmount: newPaid, paymentStatus, updatedAt: sql`now()` })
    .where(eq(orders.id, orderId));

  return { redeemed: amount, newBalance, remainingOrderBalance: order.total - newPaid };
}

export async function deactivateGiftCard(tenantId: string, id: string) {
  const [gc] = await db.update(giftCards)
    .set({ isActive: false, updatedAt: sql`now()` })
    .where(and(eq(giftCards.id, id), eq(giftCards.tenantId, tenantId)))
    .returning();
  return gc;
}

export async function getRedemptions(tenantId: string, giftCardId: string) {
  return db.select().from(giftCardRedemptions)
    .where(and(eq(giftCardRedemptions.tenantId, tenantId), eq(giftCardRedemptions.giftCardId, giftCardId)))
    .orderBy(giftCardRedemptions.createdAt);
}
