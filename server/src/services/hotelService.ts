import { db, schema } from '../db/index.js';
import { eq, and, asc, desc, inArray, lt, gt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { sendEmail, brandedEmailHtml } from '../lib/mail.js';
import { logger } from '../lib/logger.js';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const room = await db.select({ id: schema.rooms.id, number: schema.rooms.number }).from(schema.rooms)
    .where(and(eq(schema.rooms.id, data.roomId), eq(schema.rooms.tenantId, tenantId)));
  if (room.length === 0) return { error: 'room not found' as const };
  if (data.checkOut <= data.checkIn) return { error: 'check-out must be after check-in' as const };

  // Conflict detection: reject overlapping active bookings for the same room.
  // Half-open ranges [checkIn, checkOut) overlap when start < otherEnd && end > otherStart.
  const clashes = await db.select({ id: schema.roomBookings.id }).from(schema.roomBookings)
    .where(and(
      eq(schema.roomBookings.tenantId, tenantId),
      eq(schema.roomBookings.roomId, data.roomId),
      inArray(schema.roomBookings.status, ['booked', 'checked_in']),
      lt(schema.roomBookings.checkIn, data.checkOut),
      gt(schema.roomBookings.checkOut, data.checkIn),
    ));
  if (clashes.length > 0) return { error: 'those dates overlap an existing booking for this room' as const };

  const id = uuid();
  await db.insert(schema.roomBookings).values({ id, tenantId, ...data });
  // Mark the room reserved (unless already occupied) so the board reflects the hold.
  await db.update(schema.rooms).set({ status: 'reserved', guestName: data.guestName, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.rooms.id, data.roomId), eq(schema.rooms.tenantId, tenantId), eq(schema.rooms.status, 'available')));

  if (data.guestEmail) void sendBookingConfirmation(tenantId, data.guestEmail, data.guestName, room[0].number, data.checkIn, data.checkOut);
  return { id };
}

/** Fire-and-forget guest confirmation email; failures are logged, never block the booking. */
async function sendBookingConfirmation(tenantId: string, to: string, guestName: string, roomNumber: string, checkIn: string, checkOut: string) {
  try {
    const [tenant] = await db.select({ name: schema.tenants.name, primaryColor: schema.tenants.primaryColor })
      .from(schema.tenants).where(eq(schema.tenants.id, tenantId));
    const name = tenant?.name || 'Qlisted';
    const content = `
      <h2 style="margin:0 0 12px">Booking confirmed</h2>
      <p>Hi ${escapeHtml(guestName)}, your reservation at <strong>${escapeHtml(name)}</strong> is confirmed.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 16px 4px 0;color:#666">Room</td><td style="padding:4px 0"><strong>${escapeHtml(roomNumber)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Check-in</td><td style="padding:4px 0"><strong>${escapeHtml(checkIn)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Check-out</td><td style="padding:4px 0"><strong>${escapeHtml(checkOut)}</strong></td></tr>
      </table>
      <p>We look forward to hosting you.</p>`;
    await sendEmail({ to, subject: `Booking confirmed — ${name}`, html: brandedEmailHtml(content, name, tenant?.primaryColor) });
  } catch (e) {
    logger.warn({ err: e }, 'booking confirmation email failed');
  }
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
