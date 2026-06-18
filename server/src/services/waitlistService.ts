import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';

export interface JoinWaitlistInput {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  notes?: string;
  source?: 'web' | 'staff';
}

export async function joinWaitlist(tenantId: string, input: JoinWaitlistInput) {
  const [existingTenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!existingTenant) {
    return { error: 'Tenant not found', status: 404 as const };
  }

  const id = uuid();

  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`coalesce(max(position), 0)` })
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.tenantId, tenantId), eq(schema.waitlistEntries.status, 'waiting')));

  const position = (maxPos || 0) + 1;

  const waitingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.tenantId, tenantId), eq(schema.waitlistEntries.status, 'waiting')));

  const estimatedWaitMinutes = Math.max(5, (waitingCount[0]?.count || 0) * 15);

  await db.insert(schema.waitlistEntries).values({
    id,
    tenantId,
    customerName: input.customerName,
    customerPhone: input.customerPhone || null,
    customerEmail: input.customerEmail || null,
    partySize: input.partySize,
    notes: input.notes || null,
    source: input.source || 'web',
    position,
    estimatedWaitMinutes,
  });

  logger.info({ tenantId, waitlistId: id, position, partySize: input.partySize }, 'Customer joined waitlist');
  return { data: { id, position, estimatedWaitMinutes }, status: 201 as const };
}

export async function getWaitlist(tenantId: string, status?: string) {
  const conditions = [eq(schema.waitlistEntries.tenantId, tenantId)];
  if (status) {
    conditions.push(eq(schema.waitlistEntries.status, status as typeof schema.waitlistEntries.$inferSelect.status));
  }

  const data = await db
    .select()
    .from(schema.waitlistEntries)
    .where(and(...conditions))
    .orderBy(schema.waitlistEntries.position);
  return { data, status: 200 as const };
}

export async function updateWaitlistStatus(tenantId: string, entryId: string, status: string) {
  const [existing] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.id, entryId), eq(schema.waitlistEntries.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    return { error: 'Waitlist entry not found', status: 404 as const };
  }

  const validStatuses = ['waiting', 'notified', 'seated', 'cancelled', 'expired'] as const;
  if (!validStatuses.includes(status as typeof validStatuses[number])) {
    return { error: 'Invalid status', status: 400 as const };
  }

  const updates: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (status === 'notified') updates.notifiedAt = new Date().toISOString();
  if (status === 'seated') updates.seatedAt = new Date().toISOString();

  await db.update(schema.waitlistEntries)
    .set(updates)
    .where(eq(schema.waitlistEntries.id, entryId));

  // If someone was seated or cancelled, recalculate positions
  if (['seated', 'cancelled', 'expired'].includes(status)) {
    await recalculatePositions(tenantId);
  }

  logger.info({ tenantId, entryId, status }, 'Waitlist status updated');
  return { data: { success: true }, status: 200 as const };
}

async function recalculatePositions(tenantId: string) {
  const waiting = await db
    .select()
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.tenantId, tenantId), eq(schema.waitlistEntries.status, 'waiting')))
    .orderBy(schema.waitlistEntries.position);

  for (let i = 0; i < waiting.length; i++) {
    const newPos = i + 1;
    if (waiting[i].position !== newPos) {
      await db.update(schema.waitlistEntries)
        .set({ position: newPos })
        .where(eq(schema.waitlistEntries.id, waiting[i].id));
    }
  }
}

export async function deleteWaitlistEntry(tenantId: string, entryId: string) {
  const [existing] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.id, entryId), eq(schema.waitlistEntries.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    return { error: 'Waitlist entry not found', status: 404 as const };
  }

  await db.delete(schema.waitlistEntries)
    .where(and(eq(schema.waitlistEntries.id, entryId), eq(schema.waitlistEntries.tenantId, tenantId)));

  await recalculatePositions(tenantId);

  logger.info({ tenantId, entryId }, 'Waitlist entry deleted');
  return { data: { success: true }, status: 200 as const };
}
