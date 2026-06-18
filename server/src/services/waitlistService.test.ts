import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-waitlist-id'),
}));

import { joinWaitlist, getWaitlist, updateWaitlistStatus } from './waitlistService.js';
import { db } from '../db/index.js';

describe('waitlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('joinWaitlist', () => {
    it('returns error if tenant not found', async () => {
      db.__setQueryData([]);

      const result = await joinWaitlist('tenant-1', {
        customerName: 'John',
        partySize: 4,
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Tenant not found');
        expect(result.status).toBe(404);
      }
    });

    it('joins waitlist successfully', async () => {
      // First query: tenant exists
      // Second query: max position
      db.__setQueryQueue([[{ id: 'tenant-1', taxRate: 0.08 }], [{ maxPos: 3 }]]);

      const result = await joinWaitlist('tenant-1', {
        customerName: 'Jane Doe',
        customerPhone: '+1-555-0000',
        partySize: 2,
        source: 'web',
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.position).toBeGreaterThan(0);
        expect(result.status).toBe(201);
      }
    });
  });

  describe('getWaitlist', () => {
    it('returns entries for a tenant', async () => {
      const mock = [{ id: 'wl-1', customerName: 'John', partySize: 4, status: 'waiting', position: 1 }];
      db.__setQueryData(mock);

      const result = await getWaitlist('tenant-1');
      expect(result.data).toEqual(mock);
    });
  });

  describe('updateWaitlistStatus', () => {
    it('returns error if entry not found', async () => {
      db.__setQueryData([]);

      const result = await updateWaitlistStatus('tenant-1', 'non-existent', 'seated');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Waitlist entry not found');
      }
    });
  });
});
