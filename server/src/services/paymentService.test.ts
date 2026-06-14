import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_mock',
        client_secret: 'pi_secret_mock',
        status: 'requires_payment_method',
      }),
    },
    paymentLinks: {
      create: vi.fn().mockResolvedValue({ id: 'pl_mock' }),
    },
    prices: {
      create: vi.fn().mockResolvedValue({ id: 'price_mock' }),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }));
  return { default: MockStripe, MockStripe };
});

import { createPaymentIntent, recordCashPayment, createPaymentLink } from './paymentService.js';
import { db } from '../db/index.js';

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('createPaymentIntent', () => {
    it('returns error if order not found', async () => {
      db.__setQueryData([]);

      const result = await createPaymentIntent('tenant-1', 'order-1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Order not found');
        expect(result.status).toBe(404);
      }
    });

    it('returns error if order already paid', async () => {
      db.__setQueryData([{ id: 'order-1', total: 25, paymentStatus: 'paid' }]);

      const result = await createPaymentIntent('tenant-1', 'order-1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Order already paid');
        expect(result.status).toBe(400);
      }
    });

    it('processes mock payment when Stripe not configured', async () => {
      db.__setQueryData([{ id: 'order-1', total: 25, paymentStatus: 'unpaid' }]);

      const result = await createPaymentIntent('tenant-1', 'order-1', 5);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.status).toBe('paid');
        expect(result.data.mock).toBe(true);
        expect(result.data.amount).toBe(3000);
      }
    });

    it('includes tip in amount calculation', async () => {
      db.__setQueryData([{ id: 'order-1', total: 25, paymentStatus: 'unpaid' }]);

      const result = await createPaymentIntent('tenant-1', 'order-1', 5);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.amount).toBe(3000);
      }
    });
  });

  describe('recordCashPayment', () => {
    it('records cash payment and marks order as paid', async () => {
      const result = await recordCashPayment('tenant-1', 'order-1', 25, 3);

      expect(result.status).toBe('paid');
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('createPaymentLink', () => {
    it('creates payment link without Stripe', async () => {
      const result = await createPaymentLink('tenant-1', 'order-1', 50, 'Dinner payment');

      expect(result.token).toBeTruthy();
      expect(result.url).toBe(`/pay/${result.token}`);
    });
  });
});
