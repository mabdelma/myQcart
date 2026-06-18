import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import {
  applyPromoCode,
  createCampaign,
  getCampaigns,
  updateCampaign,
  deleteCampaign,
} from './promoService.js';
import { db } from '../db/index.js';

describe('promoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('applyPromoCode', () => {
    const baseCampaign = {
      id: 'campaign-1',
      tenantId: 'tenant-1',
      name: 'SUMMER10',
      type: 'percentage' as const,
      value: 10,
      isActive: true,
      usageCount: 0,
      usageLimit: 100,
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      daysOfWeek: null,
      timeStart: null,
      timeEnd: null,
      minOrderAmount: null,
      maxDiscount: null,
      createdAt: '2025-01-01',
    };

    it('successfully applies a percentage discount', async () => {
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 100, total: 120, notes: null };
      db.__setQueryQueue([[baseCampaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'SUMMER10');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(10);
        expect(result.data.newTotal).toBe(110);
        expect(result.status).toBe(200);
      }
      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('caps percentage discount at maxDiscount', async () => {
      const campaign = { ...baseCampaign, value: 50, maxDiscount: 20 };
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 100, total: 120, notes: null };
      db.__setQueryQueue([[campaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'HALFOFF');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(20);
        expect(result.data.newTotal).toBe(100);
      }
    });

    it('applies fixed discount capped at order subtotal', async () => {
      const campaign = { ...baseCampaign, type: 'fixed' as const, value: 15 };
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 10, total: 12, notes: null };
      db.__setQueryQueue([[campaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'FIXED15');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(10);
        expect(result.data.newTotal).toBe(2);
      }
    });

    it('returns error for invalid promo code', async () => {
      db.__setQueryData([]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'INVALID');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Invalid promo code');
        expect(result.status).toBe(404);
      }
    });

    it('returns error when usage limit reached', async () => {
      const campaign = { ...baseCampaign, usageCount: 100, usageLimit: 100 };
      db.__setQueryData([campaign]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'LIMITED');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Promo code usage limit reached');
        expect(result.status).toBe(400);
      }
    });

    it('returns error when promo not yet active', async () => {
      const campaign = { ...baseCampaign, startDate: '2026-06-01', endDate: '2026-12-31' };
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      db.__setQueryData([campaign]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'FUTURE');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Promo code not yet active');
        expect(result.status).toBe(400);
      }
    });

    it('returns error when promo has expired', async () => {
      const campaign = { ...baseCampaign, startDate: '2025-01-01', endDate: '2025-01-31' };
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      db.__setQueryData([campaign]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'EXPIRED');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Promo code has expired');
        expect(result.status).toBe(400);
      }
    });

    it('returns error when promo not valid on current day', async () => {
      const campaign = { ...baseCampaign, daysOfWeek: '0,2,3,4,5,6' };
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-16T12:00:00Z'));
      db.__setQueryData([campaign]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'NOMON');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Promo code not valid today');
        expect(result.status).toBe(400);
      }
    });

    it('returns error when promo not valid at current time', async () => {
      const campaign = { ...baseCampaign, timeStart: '09:00', timeEnd: '12:00' };
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-16T14:30:00Z'));
      db.__setQueryData([campaign]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'NOTIME');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Promo code not valid at this time');
        expect(result.status).toBe(400);
      }
    });

    it('returns error when order not found', async () => {
      db.__setQueryQueue([[baseCampaign], []]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'SUMMER10');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Order not found');
        expect(result.status).toBe(404);
      }
    });

    it('returns error when minimum order not met', async () => {
      const campaign = { ...baseCampaign, minOrderAmount: 50 };
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 30, total: 36, notes: null };
      db.__setQueryQueue([[campaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'MINFAIL');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Minimum order amount of 50 required');
        expect(result.status).toBe(400);
      }
    });

    it('applies buy_x_get_y discount correctly', async () => {
      const campaign = { ...baseCampaign, type: 'buy_x_get_y' as const, value: 10 };
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 100, total: 120, notes: null };
      db.__setQueryQueue([[campaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'BOGO');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(10);
        expect(result.data.newTotal).toBe(110);
      }
    });

    it('applies happy_hour discount correctly', async () => {
      const campaign = { ...baseCampaign, type: 'happy_hour' as const, value: 15 };
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 100, total: 120, notes: null };
      db.__setQueryQueue([[campaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'HAPPY');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(15);
        expect(result.data.newTotal).toBe(105);
      }
    });

    it('appends promo note to existing order notes', async () => {
      const order = { id: 'order-1', tenantId: 'tenant-1', subtotal: 100, total: 120, notes: 'Extra napkins' };
      db.__setQueryQueue([[baseCampaign], [order]]);

      const result = await applyPromoCode('tenant-1', 'order-1', 'SUMMER10');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.discountAmount).toBe(10);
      }
    });
  });

  describe('createCampaign', () => {
    it('creates a campaign and returns its id', async () => {
      const result = await createCampaign('tenant-1', { name: 'SUMMER20', type: 'percentage', value: 20 });

      expect(db.insert).toHaveBeenCalledOnce();
      expect(result.id).toBe('mock-uuid');
    });

    it('accepts optional campaign fields', async () => {
      const result = await createCampaign('tenant-1', {
        name: 'FALL15', type: 'percentage', value: 15,
        minOrderAmount: 30, maxDiscount: 10,
        startDate: '2025-09-01', endDate: '2025-11-30',
        daysOfWeek: '1,2,3,4,5', timeStart: '10:00', timeEnd: '22:00',
        usageLimit: 50,
      });

      expect(db.insert).toHaveBeenCalledOnce();
      expect(result.id).toBe('mock-uuid');
    });
  });

  describe('getCampaigns', () => {
    it('returns campaigns for tenant', async () => {
      const campaigns = [{ id: 'c1', name: 'SUMMER10' }, { id: 'c2', name: 'FALL15' }];
      db.__setQueryData(campaigns);

      const result = await getCampaigns('tenant-1');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(campaigns);
    });

    it('returns empty array when no campaigns', async () => {
      db.__setQueryData([]);

      const result = await getCampaigns('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateCampaign', () => {
    it('updates campaign fields', async () => {
      await updateCampaign('campaign-1', 'tenant-1', { value: 15, isActive: false });

      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('deleteCampaign', () => {
    it('deletes usages then campaign', async () => {
      await deleteCampaign('campaign-1', 'tenant-1');

      expect(db.delete).toHaveBeenCalledTimes(2);
    });
  });
});
