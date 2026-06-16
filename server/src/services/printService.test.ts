import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('net', () => {
  const mockSocket = {
    connect: vi.fn().mockReturnThis(),
    write: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    setTimeout: vi.fn(),
  };
  const Socket = vi.fn(() => mockSocket);
  return { default: { Socket }, Socket };
});

import { createKotPrintJob, getPrintJobs, reprintJob } from './printService.js';
import { db } from '../db/index.js';

describe('printService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createKotPrintJob', () => {
    it('returns null when order is not found', async () => {
      db.__setQueryData([]);

      const result = await createKotPrintJob('tenant-1', 'non-existent');

      expect(result).toBeNull();
    });

    it('returns null when no auto-print printers are active', async () => {
      db.__setQueryQueue([
        [{ id: 'order-1', tenantId: 'tenant-1', tableId: 'table-1', status: 'pending', customerName: 'John', notes: null, createdAt: '2025-01-01' }],
        [{ id: 'table-1', number: 5 }],
        [{ id: 'tenant-1', name: 'Test Cafe' }],
        [{ id: 'oi-1', orderId: 'order-1', name: 'Burger', quantity: 1, unitPrice: 10, modifiers: null, notes: null }],
        [],
      ]);

      const result = await createKotPrintJob('tenant-1', 'order-1');

      expect(result).toBeNull();
    });

    it('creates print jobs and executes them for browser printers', async () => {
      db.__setQueryQueue([
        [{ id: 'order-1', tenantId: 'tenant-1', tableId: 'table-1', status: 'pending', customerName: 'John', notes: null, createdAt: '2025-01-01' }],
        [{ id: 'table-1', number: 5 }],
        [{ id: 'tenant-1', name: 'Test Cafe' }],
        [{ id: 'oi-1', orderId: 'order-1', name: 'Burger', quantity: 2, unitPrice: 10, modifiers: null, notes: null }],
        [{ id: 'printer-1', tenantId: 'tenant-1', type: 'browser', autoPrint: true, isActive: true, name: 'KOT Printer' }],
        [{ id: 'mock-uuid', tenantId: 'tenant-1', orderId: 'order-1', printerId: 'printer-1', content: 'KOT content', status: 'pending' }],
        [{ id: 'printer-1', type: 'browser', name: 'KOT Printer' }],
        [],
      ]);

      const result = await createKotPrintJob('tenant-1', 'order-1');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('getPrintJobs', () => {
    it('returns all print jobs for a tenant', async () => {
      const mockJobs = [
        { id: 'job-1', tenantId: 'tenant-1', orderId: 'order-1', status: 'pending' },
      ];
      db.__setQueryData(mockJobs);

      const result = await getPrintJobs('tenant-1');

      expect(result).toEqual(mockJobs);
    });

    it('filters by orderId when provided', async () => {
      const mockJobs = [
        { id: 'job-1', tenantId: 'tenant-1', orderId: 'order-1', status: 'pending' },
      ];
      db.__setQueryData(mockJobs);

      const result = await getPrintJobs('tenant-1', 'order-1');

      expect(result).toEqual(mockJobs);
    });
  });

  describe('reprintJob', () => {
    it('returns 404 error when job is not found', async () => {
      db.__setQueryData([]);

      const result = await reprintJob('non-existent', 'tenant-1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Print job not found');
        expect(result.status).toBe(404);
      }
    });

    it('resets job to pending and re-executes it for browser printer', async () => {
      db.__setQueryQueue([
        [{ id: 'mock-uuid', tenantId: 'tenant-1', orderId: 'order-1', printerId: 'printer-1', status: 'failed', error: 'Previous error', content: 'KOT content', type: 'kot' }],
        [],
        [{ id: 'mock-uuid', tenantId: 'tenant-1', orderId: 'order-1', printerId: 'printer-1', status: 'pending', content: 'KOT content' }],
        [{ id: 'printer-1', type: 'browser', name: 'KOT Printer' }],
        [],
      ]);

      const result = await reprintJob('mock-uuid', 'tenant-1');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.id).toBe('mock-uuid');
        expect(result.status).toBe(200);
      }
    });
  });
});
