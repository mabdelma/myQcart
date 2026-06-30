import { db, schema } from '../db/index.js';
import { eq, and, gte, lt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Shifts for the 7-day window starting at weekStart (YYYY-MM-DD), with staff names. */
export async function listShifts(tenantId: string, weekStart: string) {
  const end = addDays(weekStart, 7);
  return db
    .select({
      id: schema.shifts.id,
      userId: schema.shifts.userId,
      userName: schema.users.name,
      date: schema.shifts.date,
      startTime: schema.shifts.startTime,
      endTime: schema.shifts.endTime,
      role: schema.shifts.role,
      notes: schema.shifts.notes,
    })
    .from(schema.shifts)
    .leftJoin(schema.users, eq(schema.shifts.userId, schema.users.id))
    .where(and(eq(schema.shifts.tenantId, tenantId), gte(schema.shifts.date, weekStart), lt(schema.shifts.date, end)));
}

export async function createShift(tenantId: string, data: { userId: string; date: string; startTime: string; endTime: string; role?: string; notes?: string }) {
  const id = uuid();
  await db.insert(schema.shifts).values({ id, tenantId, ...data });
  return { id };
}

export async function updateShift(tenantId: string, id: string, data: Partial<{ userId: string; date: string; startTime: string; endTime: string; role: string; notes: string }>) {
  await db.update(schema.shifts).set(data).where(and(eq(schema.shifts.id, id), eq(schema.shifts.tenantId, tenantId)));
  return { success: true };
}

export async function deleteShift(tenantId: string, id: string) {
  await db.delete(schema.shifts).where(and(eq(schema.shifts.id, id), eq(schema.shifts.tenantId, tenantId)));
  return { success: true };
}
