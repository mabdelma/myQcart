import { db, schema } from '../db/index.js';
import { eq, and, asc, desc, inArray, lt, gt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { sendEmail, brandedEmailHtml } from '../lib/mail.js';
import { logger } from '../lib/logger.js';
import { createOrder } from './orderService.js';

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
  data: { number: string; type?: string; floor?: string; status?: RoomStatus; rate?: number; notes?: string },
) {
  const id = uuid();
  await db.insert(schema.rooms).values({ id, tenantId, ...data });
  return { id };
}

export async function updateRoom(
  tenantId: string,
  id: string,
  data: Partial<{ number: string; type: string; floor: string; status: RoomStatus; rate: number; guestName: string; notes: string }>,
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
      ratePerNight: schema.roomBookings.ratePerNight,
      total: schema.roomBookings.total,
      notes: schema.roomBookings.notes,
    })
    .from(schema.roomBookings)
    .leftJoin(schema.rooms, eq(schema.roomBookings.roomId, schema.rooms.id))
    .where(eq(schema.roomBookings.tenantId, tenantId))
    .orderBy(desc(schema.roomBookings.checkIn));
}

/** Whole nights between two YYYY-MM-DD dates (>= 1). */
function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut + 'T00:00:00Z').getTime() - new Date(checkIn + 'T00:00:00Z').getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

/** Rooms with no active (booked/checked_in) booking overlapping [checkIn, checkOut). */
export async function availableRooms(tenantId: string, checkIn: string, checkOut: string) {
  const all = await listRooms(tenantId);
  if (!checkIn || !checkOut || checkOut <= checkIn) return all;
  const clashing = await db.select({ roomId: schema.roomBookings.roomId }).from(schema.roomBookings)
    .where(and(
      eq(schema.roomBookings.tenantId, tenantId),
      inArray(schema.roomBookings.status, ['booked', 'checked_in']),
      lt(schema.roomBookings.checkIn, checkOut),
      gt(schema.roomBookings.checkOut, checkIn),
    ));
  const taken = new Set(clashing.map((c) => c.roomId));
  return all.filter((r) => !taken.has(r.id));
}

export async function createBooking(
  tenantId: string,
  data: { roomId: string; guestName: string; guestEmail?: string; guestPhone?: string; checkIn: string; checkOut: string; notes?: string },
) {
  // Room must belong to this tenant.
  const room = await db.select({ id: schema.rooms.id, number: schema.rooms.number, rate: schema.rooms.rate }).from(schema.rooms)
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

  const ratePerNight = room[0].rate || 0;
  const total = ratePerNight * nightsBetween(data.checkIn, data.checkOut);
  const id = uuid();
  await db.insert(schema.roomBookings).values({ id, tenantId, ...data, ratePerNight, total });
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

// ── Guest folio (room charge + posted extras → one bill) ────────────────────

/** Full folio for a booking: room charge, posted line items, and the grand total. */
export async function getFolio(tenantId: string, bookingId: string) {
  const [b] = await db
    .select({
      id: schema.roomBookings.id,
      guestName: schema.roomBookings.guestName,
      roomNumber: schema.rooms.number,
      checkIn: schema.roomBookings.checkIn,
      checkOut: schema.roomBookings.checkOut,
      status: schema.roomBookings.status,
      roomCharge: schema.roomBookings.total,
    })
    .from(schema.roomBookings)
    .leftJoin(schema.rooms, eq(schema.roomBookings.roomId, schema.rooms.id))
    .where(and(eq(schema.roomBookings.id, bookingId), eq(schema.roomBookings.tenantId, tenantId)));
  if (!b) return { error: 'booking not found' as const };
  const items = await db.select().from(schema.folioItems)
    .where(and(eq(schema.folioItems.bookingId, bookingId), eq(schema.folioItems.tenantId, tenantId)))
    .orderBy(asc(schema.folioItems.createdAt));
  const roomCharge = Number(b.roomCharge || 0);
  const extras = +items.reduce((s, i) => s + Number(i.amount || 0), 0).toFixed(2);
  return {
    booking: { id: b.id, guestName: b.guestName, roomNumber: b.roomNumber, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status },
    roomCharge, items, extras, grandTotal: +(roomCharge + extras).toFixed(2),
  };
}

export async function addFolioItem(tenantId: string, bookingId: string, data: { description: string; amount: number }) {
  const [b] = await db.select({ id: schema.roomBookings.id }).from(schema.roomBookings)
    .where(and(eq(schema.roomBookings.id, bookingId), eq(schema.roomBookings.tenantId, tenantId)));
  if (!b) return { error: 'booking not found' as const };
  const id = uuid();
  await db.insert(schema.folioItems).values({ id, tenantId, bookingId, description: data.description, amount: data.amount });
  return { id };
}

export async function deleteFolioItem(tenantId: string, id: string) {
  await db.delete(schema.folioItems).where(and(eq(schema.folioItems.id, id), eq(schema.folioItems.tenantId, tenantId)));
  return { success: true };
}

// ── Room service (guest orders from the in-room menu, posted to their folio) ──

/** The active (checked-in) stay for a room, or null. */
export async function activeStay(tenantId: string, roomId: string) {
  const [b] = await db
    .select({ bookingId: schema.roomBookings.id, guestName: schema.roomBookings.guestName, roomNumber: schema.rooms.number })
    .from(schema.roomBookings)
    .leftJoin(schema.rooms, eq(schema.roomBookings.roomId, schema.rooms.id))
    .where(and(
      eq(schema.roomBookings.tenantId, tenantId),
      eq(schema.roomBookings.roomId, roomId),
      eq(schema.roomBookings.status, 'checked_in'),
    ));
  return b || null;
}

/** Place a room-service order for a room's active stay and post it to the folio. */
export async function placeRoomServiceOrder(
  tenantId: string,
  roomId: string,
  items: { menuItemId: string; name: string; quantity: number; unitPrice: number }[],
) {
  const stay = await activeStay(tenantId, roomId);
  if (!stay) return { error: 'no active stay for this room' as const };
  const result = await createOrder(tenantId, {
    orderType: 'takeout',
    customerName: `Room ${stay.roomNumber} — ${stay.guestName}`,
    items,
  });
  if ('error' in result) return { error: result.error };
  const total = Number(result.data.total || 0);
  const n = items.reduce((s, i) => s + i.quantity, 0);
  await addFolioItem(tenantId, stay.bookingId, { description: `Room service (${n} item${n > 1 ? 's' : ''})`, amount: total });
  return { orderId: result.data.id, total };
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
