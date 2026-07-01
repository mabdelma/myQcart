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
  notes: z.string().optional(),
});
const statusSchema = z.object({
  status: z.enum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved']),
  guestName: z.string().optional(),
});

hotel.get('/:slug/rooms', ...adminMgr, async (c) => c.json(await svc.listRooms(c.get('tenantId'))));
hotel.get('/:slug/rooms/stats', ...adminMgr, async (c) => c.json(await svc.roomStats(c.get('tenantId'))));
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

export default hotel;
