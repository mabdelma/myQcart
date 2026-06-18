import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';

export async function applyPromoCode(tenantId: string, orderId: string, code: string) {
  const [campaign] = await db
    .select()
    .from(schema.promoCampaigns)
    .where(and(
      eq(schema.promoCampaigns.tenantId, tenantId),
      eq(schema.promoCampaigns.isActive, true),
      sql`lower(${schema.promoCampaigns.name}) = lower(${code})`,
    ))
    .limit(1);

  if (!campaign) return { error: 'Invalid promo code', status: 404 as const };

  if (campaign.usageLimit && campaign.usageCount >= campaign.usageLimit) {
    return { error: 'Promo code usage limit reached', status: 400 as const };
  }

  if (campaign.startDate && new Date(campaign.startDate) > new Date()) {
    return { error: 'Promo code not yet active', status: 400 as const };
  }
  if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
    return { error: 'Promo code has expired', status: 400 as const };
  }

  if (campaign.daysOfWeek) {
    const allowedDays = campaign.daysOfWeek.split(',').map(Number);
    const today = new Date().getDay();
    if (!allowedDays.includes(today)) {
      return { error: 'Promo code not valid today', status: 400 as const };
    }
  }

  if (campaign.timeStart && campaign.timeEnd) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = campaign.timeStart.split(':').map(Number);
    const [endH, endM] = campaign.timeEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return { error: 'Promo code not valid at this time', status: 400 as const };
    }
  }

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);
  if (!order) return { error: 'Order not found', status: 404 as const };

  if (campaign.minOrderAmount && order.subtotal < campaign.minOrderAmount) {
    return { error: `Minimum order amount of ${campaign.minOrderAmount} required`, status: 400 as const };
  }

  let discountAmount = 0;
  if (campaign.type === 'percentage') {
    discountAmount = order.subtotal * (campaign.value / 100);
    if (campaign.maxDiscount) discountAmount = Math.min(discountAmount, campaign.maxDiscount);
  } else if (campaign.type === 'fixed') {
    discountAmount = Math.min(campaign.value, order.subtotal);
  } else if (campaign.type === 'buy_x_get_y') {
    discountAmount = Math.min(campaign.value, order.subtotal);
  } else if (campaign.type === 'happy_hour') {
    discountAmount = order.subtotal * (campaign.value / 100);
    if (campaign.maxDiscount) discountAmount = Math.min(discountAmount, campaign.maxDiscount);
  } else {
    return { error: 'Promo type not supported for manual apply', status: 400 as const };
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  const usageId = uuid();
  await db.insert(schema.promoCodeUsages).values({
    id: usageId, campaignId: campaign.id, orderId, discountAmount,
  });

  await db.update(schema.promoCampaigns)
    .set({ usageCount: campaign.usageCount + 1 })
    .where(eq(schema.promoCampaigns.id, campaign.id));

  const newTotal = order.total - discountAmount;
  await db.update(schema.orders)
    .set({
      total: Math.max(0, newTotal),
      notes: order.notes ? `${order.notes} | Promo: ${code} (-${discountAmount})` : `Promo: ${code} (-${discountAmount})`,
    })
    .where(eq(schema.orders.id, orderId));

  logger.info({ tenantId, orderId, code, discountAmount }, 'Promo code applied');
  return { data: { discountAmount, newTotal: Math.max(0, newTotal) }, status: 200 as const };
}

export async function createCampaign(tenantId: string, data: {
  name: string; type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'happy_hour'; value: number;
  minOrderAmount?: number; maxDiscount?: number;
  startDate?: string; endDate?: string;
  daysOfWeek?: string; timeStart?: string; timeEnd?: string;
  usageLimit?: number;
}) {
  const id = uuid();
  await db.insert(schema.promoCampaigns).values({ id, tenantId, ...data });
  return { id };
}

export async function getCampaigns(tenantId: string) {
  return db
    .select()
    .from(schema.promoCampaigns)
    .where(eq(schema.promoCampaigns.tenantId, tenantId))
    .orderBy(schema.promoCampaigns.createdAt);
}

export async function updateCampaign(campaignId: string, tenantId: string, data: Partial<typeof schema.promoCampaigns.$inferInsert>) {
  await db.update(schema.promoCampaigns)
    .set(data)
    .where(and(eq(schema.promoCampaigns.id, campaignId), eq(schema.promoCampaigns.tenantId, tenantId)));
}

export async function deleteCampaign(campaignId: string, tenantId: string) {
  await db.delete(schema.promoCodeUsages)
    .where(eq(schema.promoCodeUsages.campaignId, campaignId));
  await db.delete(schema.promoCampaigns)
    .where(and(eq(schema.promoCampaigns.id, campaignId), eq(schema.promoCampaigns.tenantId, tenantId)));
}
