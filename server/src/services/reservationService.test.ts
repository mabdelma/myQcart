import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-reservation-id'),
}));

import { createReservation, getReservations, updateReservationStatus } from './reservationService.js';
import { db } from '../db/index.js';

describe('reservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReservation', () => {
    it('returns error if tenant not found', async () => {
      db.__setQueryData([]);

      const result = await createReservation('tenant-1', {
        customerName: 'John',
        partySize: 4,
        date: '2026-06-18',
        time: '19:00',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Tenant not found');
        expect(result.status).toBe(404);
      }
    });

    it('creates a reservation successfully', async () => {
      db.__setQueryData([{ id: 'tenant-1', taxRate: 0.08, serviceCharge: 0.05 }]);

      const result = await createReservation('tenant-1', {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        partySize: 4,
        date: '2026-06-18',
        time: '19:00',
        duration: 90,
        specialRequests: 'Window seat please',
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.id).toBe('mock-reservation-id');
        expect(result.status).toBe(201);
      }
    });
  });

  describe('getReservations', () => {
    it('returns reservations for a tenant', async () => {
      const mockReservations = [
        { id: 'res-1', tenantId: 'tenant-1', customerName: 'John', partySize: 4, date: '2026-06-18', time: '19:00', status: 'confirmed' },
      ];
      db.__setQueryData(mockReservations);

      const result = await getReservations('tenant-1');
      expect(result.data).toEqual(mockReservations);
    });
  });

  describe('updateReservationStatus', () => {
    it('returns error if reservation not found', async () => {
      db.__setQueryData([]);

      const result = await updateReservationStatus('tenant-1', 'non-existent', 'confirmed');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Reservation not found');
        expect(result.status).toBe(404);
      }
    });

    it('updates status successfully', async () => {
      db.__setQueryData([{ id: 'res-1', tenantId: 'tenant-1', status: 'pending' }]);

      const result = await updateReservationStatus('tenant-1', 'res-1', 'confirmed');
      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.success).toBe(true);
      }
    });
  });
});
