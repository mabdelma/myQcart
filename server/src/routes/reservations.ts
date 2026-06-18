import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  createReservation,
  getReservations,
  getReservationDetail,
  updateReservationStatus,
  assignTable,
  updateReservation,
  deleteReservation,
} from '../services/reservationService.js';

const reservations = new Hono();

const createReservationSchema = z.object({
  tableId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  partySize: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  duration: z.number().int().positive().optional().default(90),
  notes: z.string().optional().or(z.literal('')),
  specialRequests: z.string().optional().or(z.literal('')),
  source: z.enum(['web', 'phone', 'walk_in', 'staff']).optional().default('web'),
});

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'cancelled', 'no_show']),
});

const assignTableSchema = z.object({
  tableId: z.string().min(1),
});

// Public: create reservation from customer-facing page
reservations.post('/:slug/reservations', resolveTenant, zValidator('json', createReservationSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const input = c.req.valid('json');
  const result = await createReservation(tenantId, input);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

// Auth: list reservations with optional date/status filter
reservations.get('/:slug/reservations', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const date = c.req.query('date');
  const status = c.req.query('status');
  const result = await getReservations(tenantId, date || undefined, status || undefined);
  return c.json(result.data);
});

// Auth: get single reservation detail
reservations.get('/:slug/reservations/:reservationId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const reservationId = c.req.param('reservationId')!;
  const result = await getReservationDetail(tenantId, reservationId);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

// Auth: update reservation status
reservations.patch('/:slug/reservations/:reservationId/status', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', statusUpdateSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const reservationId = c.req.param('reservationId')!;
  const { status } = c.req.valid('json');
  const result = await updateReservationStatus(tenantId, reservationId, status);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

// Auth: assign table to reservation
reservations.post('/:slug/reservations/:reservationId/assign-table', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', assignTableSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const reservationId = c.req.param('reservationId')!;
  const { tableId } = c.req.valid('json');
  const result = await assignTable(tenantId, reservationId, tableId);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

// Auth: update reservation details
reservations.put('/:slug/reservations/:reservationId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', createReservationSchema.partial()), async (c) => {
  const tenantId = c.get('tenantId');
  const reservationId = c.req.param('reservationId')!;
  const input = c.req.valid('json');
  const result = await updateReservation(tenantId, reservationId, input);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

// Auth: delete reservation
reservations.delete('/:slug/reservations/:reservationId', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const reservationId = c.req.param('reservationId')!;
  const result = await deleteReservation(tenantId, reservationId);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data);
});

export default reservations;
