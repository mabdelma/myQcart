import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import * as svc from '../services/hotelService.js';

const hotel = new Hono();
const adminMgr = [authMiddleware, requireRole('admin', 'manager'), resolveTenant] as const;

const roomSchema = z.object({
  number: z.string().min(1),
  type: z.string().optional(),
  floor: z.string().optional(),
  status: z.enum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved']).optional(),
  rate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
const statusSchema = z.object({
  status: z.enum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved']),
  guestName: z.string().optional(),
});

hotel.get('/:slug/rooms', ...adminMgr, async (c) => c.json(await svc.listRooms(c.get('tenantId'))));
hotel.get('/:slug/rooms/stats', ...adminMgr, async (c) => c.json(await svc.roomStats(c.get('tenantId'))));
hotel.get('/:slug/rooms/available', ...adminMgr, async (c) =>
  c.json(await svc.availableRooms(c.get('tenantId'), c.req.query('checkIn') || '', c.req.query('checkOut') || '')));
hotel.post('/:slug/rooms', ...adminMgr, zValidator('json', roomSchema), async (c) =>
  c.json(await svc.createRoom(c.get('tenantId'), c.req.valid('json')), 201));
hotel.put('/:slug/rooms/:id', ...adminMgr, async (c) =>
  c.json(await svc.updateRoom(c.get('tenantId'), c.req.param('id')!, await c.req.json())));
hotel.post('/:slug/rooms/:id/status', ...adminMgr, zValidator('json', statusSchema), async (c) => {
  const { status, guestName } = c.req.valid('json');
  return c.json(await svc.setRoomStatus(c.get('tenantId'), c.req.param('id')!, status, guestName));
});
hotel.delete('/:slug/rooms/:id', ...adminMgr, async (c) =>
  c.json(await svc.deleteRoom(c.get('tenantId'), c.req.param('id')!)));
hotel.post('/:slug/rooms/:id/regenerate-token', ...adminMgr, async (c) =>
  c.json(await svc.regenerateServiceToken(c.get('tenantId'), c.req.param('id')!)));

// ── Reservations / check-in ─────────────────────────────────────────────────
const bookingSchema = z.object({
  roomId: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  notes: z.string().optional(),
});

hotel.get('/:slug/bookings', ...adminMgr, async (c) => c.json(await svc.listBookings(c.get('tenantId'))));
hotel.post('/:slug/bookings', ...adminMgr, zValidator('json', bookingSchema), async (c) => {
  const b = c.req.valid('json');
  const r = await svc.createBooking(c.get('tenantId'), { ...b, guestEmail: b.guestEmail || undefined });
  return 'error' in r ? c.json(r, 400) : c.json(r, 201);
});
hotel.post('/:slug/bookings/:id/check-in', ...adminMgr, async (c) =>
  c.json(await svc.checkIn(c.get('tenantId'), c.req.param('id')!)));
hotel.post('/:slug/bookings/:id/check-out', ...adminMgr, async (c) =>
  c.json(await svc.checkOut(c.get('tenantId'), c.req.param('id')!)));
hotel.post('/:slug/bookings/:id/cancel', ...adminMgr, async (c) =>
  c.json(await svc.cancelBooking(c.get('tenantId'), c.req.param('id')!)));

// ── Guest folio ─────────────────────────────────────────────────────────────
const folioItemSchema = z.object({ description: z.string().min(1), amount: z.number().nonnegative() });

hotel.get('/:slug/bookings/:id/folio', ...adminMgr, async (c) => {
  const r = await svc.getFolio(c.get('tenantId'), c.req.param('id')!);
  return 'error' in r ? c.json(r, 404) : c.json(r);
});
hotel.post('/:slug/bookings/:id/folio', ...adminMgr, zValidator('json', folioItemSchema), async (c) => {
  const r = await svc.addFolioItem(c.get('tenantId'), c.req.param('id')!, c.req.valid('json'));
  return 'error' in r ? c.json(r, 404) : c.json(r, 201);
});
hotel.delete('/:slug/folio/:id', ...adminMgr, async (c) =>
  c.json(await svc.deleteFolioItem(c.get('tenantId'), c.req.param('id')!)));

// ── Room service (public — a checked-in guest ordering from their room) ──────
const roomServiceSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

hotel.get('/:slug/room/:token/stay', resolveTenant, async (c) => {
  const stay = await svc.activeStay(c.get('tenantId'), c.req.param('token')!);
  return c.json({ active: !!stay, guestName: stay?.guestName ?? null, roomNumber: stay?.roomNumber ?? null });
});
hotel.post('/:slug/room/:token/order', resolveTenant, zValidator('json', roomServiceSchema), async (c) => {
  const r = await svc.placeRoomServiceOrder(c.get('tenantId'), c.req.param('token')!, c.req.valid('json').items);
  return 'error' in r ? c.json(r, 400) : c.json(r, 201);
});

export default hotel;
