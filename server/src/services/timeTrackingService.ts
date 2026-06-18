import { sql, eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { timeEntries, users } from '../db/schema.js';

export async function clockIn(tenantId: string, userId: string, notes?: string) {
  const active = await getActiveEntry(tenantId, userId);
  if (active) throw new Error('Already clocked in');

  const [entry] = await db.insert(timeEntries).values({
    id: uuidv4(),
    tenantId,
    userId,
    clockIn: new Date().toISOString(),
    notes,
  }).returning();
  return entry;
}

export async function clockOut(tenantId: string, userId: string, notes?: string) {
  const active = await getActiveEntry(tenantId, userId);
  if (!active) throw new Error('Not clocked in');

  const clockOut = new Date().toISOString();
  const totalHours = (new Date(clockOut).getTime() - new Date(active.clockIn).getTime()) / 3600000;

  const [entry] = await db.update(timeEntries)
    .set({ clockOut, totalHours: Math.round(totalHours * 100) / 100, notes: notes ?? active.notes, updatedAt: sql`now()` })
    .where(eq(timeEntries.id, active.id))
    .returning();
  return entry;
}

async function getActiveEntry(tenantId: string, userId: string) {
  const [entry] = await db.select().from(timeEntries)
    .where(and(eq(timeEntries.tenantId, tenantId), eq(timeEntries.userId, userId), isNull(timeEntries.clockOut)));
  return entry || null;
}

export async function getActiveShifts(tenantId: string) {
  const entries = await db.select({
    id: timeEntries.id,
    clockIn: timeEntries.clockIn,
    notes: timeEntries.notes,
    userId: timeEntries.userId,
    userName: users.name,
    userRole: users.role,
  }).from(timeEntries)
    .innerJoin(users, eq(users.id, timeEntries.userId))
    .where(and(eq(timeEntries.tenantId, tenantId), isNull(timeEntries.clockOut)))
    .orderBy(timeEntries.clockIn);
  return entries;
}

export async function getTimesheet(tenantId: string, userId?: string, startDate?: string, endDate?: string) {
  const conditions = [eq(timeEntries.tenantId, tenantId)];
  if (userId) conditions.push(eq(timeEntries.userId, userId));
  if (startDate) conditions.push(sql`${timeEntries.clockIn} >= ${startDate}`);
  if (endDate) conditions.push(sql`${timeEntries.clockIn} <= ${endDate}`);

  const entries = await db.select({
    id: timeEntries.id,
    clockIn: timeEntries.clockIn,
    clockOut: timeEntries.clockOut,
    totalHours: timeEntries.totalHours,
    notes: timeEntries.notes,
    userId: timeEntries.userId,
    userName: users.name,
    userRole: users.role,
  }).from(timeEntries)
    .innerJoin(users, eq(users.id, timeEntries.userId))
    .where(and(...conditions))
    .orderBy(timeEntries.clockIn);

  return entries;
}
