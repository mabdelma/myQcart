import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBooking, getFolio, availableRooms, settleFolio, folioPayLink } from './hotelService.js';
import { db } from '../db/index.js';

// Stub the cross-service calls hotelService makes so the tests stay unit-scoped.
vi.mock('./paymentService.js', () => ({
  createPaymentLink: vi.fn().mockResolvedValue({ id: 'link1', token: 'tok', url: '/pay/tok' }),
}));
vi.mock('./orderService.js', () => ({
  createOrder: vi.fn().mockResolvedValue({ data: { id: 'order1', total: 40 }, status: 201 }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

describe('hotelService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockDb.__setQueryQueue([]); });

  describe('createBooking — conflict detection', () => {
    const base = { roomId: 'r1', guestName: 'Alex', checkIn: '2026-07-10', checkOut: '2026-07-12' };

    it('rejects a range that overlaps an existing active booking', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'r1', number: '101', rate: 100 }], // room lookup
        [{ id: 'existing' }],                     // an overlapping booking exists
      ]);
      const res = await createBooking('t1', base);
      expect('error' in res).toBe(true);
      if ('error' in res) expect(res.error).toMatch(/overlap/i);
    });

    it('rejects check-out on or before check-in', async () => {
      mockDb.__setQueryQueue([[{ id: 'r1', number: '101', rate: 100 }]]);
      const res = await createBooking('t1', { ...base, checkOut: '2026-07-10' });
      expect('error' in res && res.error).toMatch(/check-out/i);
    });

    it('rejects an unknown room', async () => {
      mockDb.__setQueryQueue([[]]); // room lookup returns nothing
      const res = await createBooking('t1', base);
      expect('error' in res && res.error).toMatch(/room not found/i);
    });

    it('creates the booking when there is no clash', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'r1', number: '101', rate: 100 }], // room lookup
        [],                                        // no overlapping bookings
        [],                                        // room status update
      ]);
      const res = await createBooking('t1', base);
      expect('error' in res).toBe(false);
      if (!('error' in res)) expect(res.id).toBeTruthy();
      // 2 nights * 100 => stored total 200
      const insertArgs = mockDb.values.mock.calls.at(-1)?.[0];
      expect(insertArgs.ratePerNight).toBe(100);
      expect(insertArgs.total).toBe(200);
    });
  });

  describe('getFolio — bill math', () => {
    it('sums the room charge and extras into the grand total', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'b1', guestName: 'Alex', roomNumber: '101', checkIn: '2026-07-10', checkOut: '2026-07-12', status: 'checked_in', roomCharge: 200, paidAt: null }],
        [{ id: 'f1', description: 'Minibar', amount: 12 }, { id: 'f2', description: 'Spa', amount: 40 }],
      ]);
      const folio = await getFolio('t1', 'b1');
      expect('error' in folio).toBe(false);
      if (!('error' in folio)) {
        expect(folio.roomCharge).toBe(200);
        expect(folio.extras).toBe(52);
        expect(folio.grandTotal).toBe(252);
      }
    });
  });

  describe('availableRooms', () => {
    it('excludes rooms with an overlapping active booking', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'r1', number: '101' }, { id: 'r2', number: '102' }, { id: 'r3', number: '103' }], // all rooms (listRooms)
        [{ roomId: 'r2' }],                                                                       // r2 is taken
      ]);
      const free = await availableRooms('t1', '2026-07-10', '2026-07-12');
      expect(free.map((r) => r.id)).toEqual(['r1', 'r3']);
    });

    it('returns all rooms when the date range is invalid', async () => {
      mockDb.__setQueryQueue([[{ id: 'r1' }, { id: 'r2' }]]);
      const free = await availableRooms('t1', '2026-07-12', '2026-07-10');
      expect(free.length).toBe(2);
    });
  });

  describe('folio settlement', () => {
    it('settleFolio marks the booking paid', async () => {
      mockDb.__setQueryQueue([[{ id: 'b1' }], []]);
      const res = await settleFolio('t1', 'b1');
      expect('error' in res).toBe(false);
      const setArgs = mockDb.set.mock.calls.at(-1)?.[0];
      expect(setArgs.folioPaidAt).toBeTruthy();
    });

    it('folioPayLink refuses a zero-total folio', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'b1', guestName: 'Alex', roomNumber: '101', checkIn: '2026-07-10', checkOut: '2026-07-12', status: 'checked_in', roomCharge: 0, paidAt: null }],
        [],
      ]);
      const res = await folioPayLink('t1', 'b1');
      expect('error' in res && res.error).toMatch(/nothing to charge/i);
    });
  });
});
