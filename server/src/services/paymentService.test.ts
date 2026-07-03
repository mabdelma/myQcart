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

import { createPaymentIntent, recordCashPayment, createPaymentLink, reconcilePaymentLink } from './paymentService.js';
import { db } from '../db/index.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

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
      const orderData = { id: 'order-1', total: 25, paymentStatus: 'unpaid', paidAmount: 0, tenantId: 'tenant-1', tableId: null, subtotal: 0, tax: 0, tip: 0, createdAt: '', updatedAt: '' };
      db.__setQueryQueue([[orderData], [], [orderData], []]);

      const result = await recordCashPayment('tenant-1', 'order-1', 25, 3);

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.status).toBe('paid');
      }
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

  describe('reconcilePaymentLink', () => {
    it('settles the folio when a folio link is paid', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'pl1', tenantId: 't1', stripeLinkId: 'pl_x', status: 'active', bookingId: 'b1', kind: 'folio', amount: 120 }],
        [], // paymentLinks update
        [], // roomBookings update
      ]);
      await reconcilePaymentLink('pl_x');
      // last db.set call is the booking update
      expect(mockDb.set.mock.calls.at(-1)?.[0].folioPaidAt).toBeTruthy();
    });

    it('records the deposit when a deposit link is paid', async () => {
      mockDb.__setQueryQueue([
        [{ id: 'pl2', tenantId: 't1', stripeLinkId: 'pl_y', status: 'active', bookingId: 'b1', kind: 'deposit', amount: 80 }],
        [], [],
      ]);
      await reconcilePaymentLink('pl_y');
      expect(mockDb.set.mock.calls.at(-1)?.[0].depositAmount).toBe(80);
    });

    it('is idempotent — does nothing for an already-paid link', async () => {
      mockDb.__setQueryQueue([[{ id: 'pl3', stripeLinkId: 'pl_z', status: 'paid' }]]);
      await reconcilePaymentLink('pl_z');
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
