import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import {
  pointsToCurrency,
  redeemPointsForOrder,
  POINTS_TO_CURRENCY,
} from './loyaltyService.js';
import { db } from '../db/index.js';

describe('loyaltyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pointsToCurrency', () => {
    it('converts points to currency at the configured rate', () => {
      expect(pointsToCurrency(100)).toBe(100 * POINTS_TO_CURRENCY);
      expect(pointsToCurrency(100)).toBe(5);
    });

    it('rounds to cents', () => {
      // 33 * 0.05 = 1.65 exactly; 7 * 0.05 = 0.35
      expect(pointsToCurrency(33)).toBe(1.65);
      expect(pointsToCurrency(7)).toBe(0.35);
    });

    it('returns 0 for 0 points', () => {
      expect(pointsToCurrency(0)).toBe(0);
    });
  });

  describe('redeemPointsForOrder', () => {
    const summary = { id: 'loyalty-1', tenantId: 'tenant-1', points: 500, lifetimePoints: 500 };
    const order = {
      id: 'order-1', tenantId: 'tenant-1', total: 120,
      discountAmount: 0, discountReason: null, paymentStatus: 'unpaid',
    };

    it('redeems points and applies the discount to the order', async () => {
      db.__setQueryQueue([[summary], [order]]);

      const result = await redeemPointsForOrder('tenant-1', 'order-1', 100);

      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.discountApplied).toBe(5); // 100 pts * 0.05
        expect(result.data.pointsRedeemed).toBe(100);
        expect(result.data.remainingPoints).toBe(400);
        expect(result.data.newTotal).toBe(115);
      }
      // one loyalty transaction inserted; summary + order updated
      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('rejects non-positive points', async () => {
      const result = await redeemPointsForOrder('tenant-1', 'order-1', 0);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Points must be a positive integer');
      // no DB work attempted
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('returns 404 when no loyalty balance exists', async () => {
      db.__setQueryData([]);
      const result = await redeemPointsForOrder('tenant-1', 'order-1', 50);
      expect(result.status).toBe(404);
      expect(result.error).toBe('No loyalty balance found');
    });

    it('rejects redemption beyond available points', async () => {
      db.__setQueryQueue([[{ ...summary, points: 30 }]]);
      const result = await redeemPointsForOrder('tenant-1', 'order-1', 100);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Insufficient points');
    });

    it('returns 404 when the order is missing', async () => {
      db.__setQueryQueue([[summary], []]);
      const result = await redeemPointsForOrder('tenant-1', 'order-1', 100);
      expect(result.status).toBe(404);
      expect(result.error).toBe('Order not found');
    });

    it('rejects redemption against an already-paid order', async () => {
      db.__setQueryQueue([[summary], [{ ...order, paymentStatus: 'paid' }]]);
      const result = await redeemPointsForOrder('tenant-1', 'order-1', 100);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Order already paid');
    });

    it('caps the discount at the order total and only charges the points needed', async () => {
      // 500 pts -> $25 requested, but order total is only $10 -> cap at $10 (200 pts)
      db.__setQueryQueue([[summary], [{ ...order, total: 10 }]]);

      const result = await redeemPointsForOrder('tenant-1', 'order-1', 500);

      expect(result.status).toBe(200);
      if (result.data) {
        expect(result.data.discountApplied).toBe(10);
        expect(result.data.pointsRedeemed).toBe(200); // ceil(10 / 0.05)
        expect(result.data.remainingPoints).toBe(300); // 500 - 200
        expect(result.data.newTotal).toBe(0);
      }
    });
  });
});
