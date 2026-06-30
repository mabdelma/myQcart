import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';
const STATUSES: RoomStatus[] = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];

/** All rooms for a property, ordered by floor then number. */
export async function listRooms(tenantId: string) {
  return db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.tenantId, tenantId))
    .orderBy(asc(schema.rooms.floor), asc(schema.rooms.number));
}

export async function createRoom(
  tenantId: string,
  data: { number: string; type?: string; floor?: string; status?: RoomStatus; notes?: string },
) {
  const id = uuid();
  await db.insert(schema.rooms).values({ id, tenantId, ...data });
  return { id };
}

export async function updateRoom(
  tenantId: string,
  id: string,
  data: Partial<{ number: string; type: string; floor: string; status: RoomStatus; guestName: string; notes: string }>,
) {
  await db
    .update(schema.rooms)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.rooms.id, id), eq(schema.rooms.tenantId, tenantId)));
  return { success: true };
}

/** Housekeeping / front-desk status change. Clearing the room (available) drops the guest name. */
export async function setRoomStatus(tenantId: string, id: string, status: RoomStatus, guestName?: string) {
  if (!STATUSES.includes(status)) return { error: 'invalid status' as const };
  const patch: Record<string, string | null> = { status, updatedAt: new Date().toISOString() };
  if (status === 'available') patch.guestName = null;
  else if (guestName !== undefined) patch.guestName = guestName;
  await db.update(schema.rooms).set(patch).where(and(eq(schema.rooms.id, id), eq(schema.rooms.tenantId, tenantId)));
  return { success: true };
}

export async function deleteRoom(tenantId: string, id: string) {
  await db.delete(schema.rooms).where(and(eq(schema.rooms.id, id), eq(schema.rooms.tenantId, tenantId)));
  return { success: true };
}

/** Occupancy summary for the front-desk header / dashboard. */
export async function roomStats(tenantId: string) {
  const all = await db.select({ status: schema.rooms.status }).from(schema.rooms).where(eq(schema.rooms.tenantId, tenantId));
  const by: Record<RoomStatus, number> = { available: 0, occupied: 0, cleaning: 0, maintenance: 0, reserved: 0 };
  for (const r of all) by[r.status as RoomStatus]++;
  const total = all.length;
  const occupancy = total ? Math.round((by.occupied / total) * 100) : 0;
  return { total, occupancy, ...by };
}
