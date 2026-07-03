import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPurchaseOrder, suggestReorder, receivePurchaseOrder } from './procurementService.js';
import { db } from '../db/index.js';

vi.mock('./inventoryService.js', () => ({
  getLowStockItems: vi.fn(),
  recordStockMovement: vi.fn().mockResolvedValue(undefined),
}));
import { getLowStockItems } from './inventoryService.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

describe('procurementService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockDb.__setQueryQueue([]); });

  describe('createPurchaseOrder', () => {
    it('rejects an empty order', async () => {
      const r = await createPurchaseOrder('t1', { items: [] });
      expect('error' in r).toBe(true);
    });

    it('computes the total from qty x unit cost', async () => {
      const r = await createPurchaseOrder('t1', { items: [
        { name: 'Tomatoes', quantity: 10, unitCost: 1.5 },
        { name: 'Oil', quantity: 2, unitCost: 8 },
      ] });
      expect('error' in r).toBe(false);
      if (!('error' in r)) expect(r.data.total).toBe(31); // 15 + 16
    });

    it('drops blank/zero-qty lines', async () => {
      const r = await createPurchaseOrder('t1', { items: [
        { name: 'Good', quantity: 3, unitCost: 2 },
        { name: '', quantity: 5, unitCost: 9 },
        { name: 'Zero', quantity: 0, unitCost: 9 },
      ] });
      if (!('error' in r)) expect(r.data.total).toBe(6);
    });
  });

  describe('suggestReorder', () => {
    it('tops each low item up to 2x its minimum', async () => {
      vi.mocked(getLowStockItems).mockResolvedValue([
        { id: 's1', name: 'Flour', unit: 'kg', minStock: 10, currentStock: 2, costPerUnit: 3 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      const s = await suggestReorder('t1');
      expect(s[0]).toMatchObject({ stockItemId: 's1', quantity: 18, unitCost: 3 }); // ceil(10*2 - 2)
    });
  });

  describe('receivePurchaseOrder', () => {
    it('404s an unknown PO', async () => {
      mockDb.__setQueryQueue([[]]);
      const r = await receivePurchaseOrder('t1', 'po-x');
      expect('error' in r && r.status).toBe(404);
    });

    it('refuses to receive twice', async () => {
      mockDb.__setQueryQueue([[{ id: 'po1', status: 'received' }]]);
      const r = await receivePurchaseOrder('t1', 'po1');
      expect('error' in r && r.error).toMatch(/already/i);
    });
  });
});
