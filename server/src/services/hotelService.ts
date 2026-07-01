import { db, schema } from '../db/index.js';
import { eq, and, asc, desc } from 'drizzle-orm';
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

// ── Reservations / check-in ─────────────────────────────────────────────────

/** Bookings for a property, newest check-in first, with the room number joined. */
export async function listBookings(tenantId: string) {
  return db
    .select({
      id: schema.roomBookings.id,
      roomId: schema.roomBookings.roomId,
      roomNumber: schema.rooms.number,
      guestName: schema.roomBookings.guestName,
      guestEmail: schema.roomBookings.guestEmail,
      guestPhone: schema.roomBookings.guestPhone,
      checkIn: schema.roomBookings.checkIn,
      checkOut: schema.roomBookings.checkOut,
      status: schema.roomBookings.status,
      notes: schema.roomBookings.notes,
    })
    .from(schema.roomBookings)
    .leftJoin(schema.rooms, eq(schema.roomBookings.roomId, schema.rooms.id))
    .where(eq(schema.roomBookings.tenantId, tenantId))
    .orderBy(desc(schema.roomBookings.checkIn));
}

export async function createBooking(
  tenantId: string,
  data: { roomId: string; guestName: string; guestEmail?: string; guestPhone?: string; checkIn: string; checkOut: string; notes?: string },
) {
  // Room must belong to this tenant.
  const room = await db.select({ id: schema.rooms.id }).from(schema.rooms)
    .where(and(eq(schema.rooms.id, data.roomId), eq(schema.rooms.tenantId, tenantId)));
  if (room.length === 0) return { error: 'room not found' as const };
  if (data.checkOut <= data.checkIn) return { error: 'check-out must be after check-in' as const };
  const id = uuid();
  await db.insert(schema.roomBookings).values({ id, tenantId, ...data });
  // Mark the room reserved (unless already occupied) so the board reflects the hold.
  await db.update(schema.rooms).set({ status: 'reserved', guestName: data.guestName, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.rooms.id, data.roomId), eq(schema.rooms.tenantId, tenantId), eq(schema.rooms.status, 'available')));
  return { id };
}

async function bookingWithRoom(tenantId: string, id: string) {
  const rows = await db.select().from(schema.roomBookings)
    .where(and(eq(schema.roomBookings.id, id), eq(schema.roomBookings.tenantId, tenantId)));
  return rows[0];
}

/** Check a guest in: booking → checked_in, room → occupied with the guest name. */
export async function checkIn(tenantId: string, id: string) {
  const b = await bookingWithRoom(tenantId, id);
  if (!b) return { error: 'booking not found' as const };
  const now = new Date().toISOString();
  await db.update(schema.roomBookings).set({ status: 'checked_in', updatedAt: now })
    .where(and(eq(schema.roomBookings.id, id), eq(schema.roomBookings.tenantId, tenantId)));
  await db.update(schema.rooms).set({ status: 'occupied', guestName: b.guestName, updatedAt: now })
    .where(and(eq(schema.rooms.id, b.roomId), eq(schema.rooms.tenantId, tenantId)));
  return { success: true };
}

/** Check a guest out: booking → checked_out, room → cleaning (housekeeping), guest cleared. */
export async function checkOut(tenantId: string, id: string) {
  const b = await bookingWithRoom(tenantId, id);
  if (!b) return { error: 'booking not found' as const };
  const now = new Date().toISOString();
  await db.update(schema.roomBookings).set({ status: 'checked_out', updatedAt: now })
    .where(and(eq(schema.roomBookings.id, id), eq(schema.roomBookings.tenantId, tenantId)));
  await db.update(schema.rooms).set({ status: 'cleaning', guestName: null, updatedAt: now })
    .where(and(eq(schema.rooms.id, b.roomId), eq(schema.rooms.tenantId, tenantId)));
  return { success: true };
}

/** Cancel a booking. If the room was only reserved (not occupied), free it back up. */
export async function cancelBooking(tenantId: string, id: string) {
  const b = await bookingWithRoom(tenantId, id);
  if (!b) return { error: 'booking not found' as const };
  const now = new Date().toISOString();
  await db.update(schema.roomBookings).set({ status: 'cancelled', updatedAt: now })
    .where(and(eq(schema.roomBookings.id, id), eq(schema.roomBookings.tenantId, tenantId)));
  await db.update(schema.rooms).set({ status: 'available', guestName: null, updatedAt: now })
    .where(and(eq(schema.rooms.id, b.roomId), eq(schema.rooms.tenantId, tenantId), eq(schema.rooms.status, 'reserved')));
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
