import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import { createOrder, getOrderDetail, updateOrderStatus } from './orderService.js';
import { db } from '../db/index.js';

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('returns error if table not found', async () => {
      db.__setQueryData([]);

      const result = await createOrder('tenant-1', {
        tableId: 'non-existent',
        items: [{ menuItemId: 'item-1', name: 'Burger', quantity: 1, unitPrice: 10 }],
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Table not found');
        expect(result.status).toBe(404);
      }
    });

    it('creates order successfully', async () => {
      db.__setQueryQueue([
        [{ id: 'table-1', status: 'available' }],
        [{ taxRate: 0.08, serviceCharge: 0.05 }],
      ]);

      const result = await createOrder('tenant-1', {
        tableId: 'table-1',
        customerName: 'John',
        items: [
          { menuItemId: 'item-1', name: 'Burger', quantity: 2, unitPrice: 10 },
          { menuItemId: 'item-2', name: 'Fries', quantity: 1, unitPrice: 5 },
        ],
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.subtotal).toBe(25);
        expect(result.data.tax).toBe(2);
        expect(result.data.serviceCharge).toBe(1.25);
        expect(result.data.total).toBe(28.25);
        expect(result.data.items).toHaveLength(2);
        expect(result.status).toBe(201);
      }
    });

    it('creates order with zero tax and service charge when not configured', async () => {
      db.__setQueryData([{ id: 'table-1', status: 'available' }]);

      const result = await createOrder('tenant-1', {
        tableId: 'table-1',
        items: [{ menuItemId: 'item-1', name: 'Coffee', quantity: 1, unitPrice: 5 }],
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.subtotal).toBe(5);
        expect(result.data.tax).toBe(0);
        expect(result.data.serviceCharge).toBe(0);
        expect(result.data.total).toBe(5);
      }
    });
  });

  describe('getOrderDetail', () => {
    it('returns error if order not found', async () => {
      db.__setQueryData([]);

      const result = await getOrderDetail('tenant-1', 'non-existent');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Order not found');
        expect(result.status).toBe(404);
      }
    });

    it('returns order with items', async () => {
      const mockOrder = { id: 'order-1', tenantId: 'tenant-1', tableId: 'table-1', status: 'pending', total: 25 };
      const mockItems = [
        { id: 'oi-1', orderId: 'order-1', name: 'Burger', quantity: 1, unitPrice: 10 },
      ];

      db.__setQueryQueue([[mockOrder], mockItems]);

      const result = await getOrderDetail('tenant-1', 'order-1');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.id).toBe('order-1');
        expect(result.data.items).toHaveLength(1);
      }
    });
  });

  describe('updateOrderStatus', () => {
    it('updates order status', async () => {
      await updateOrderStatus('tenant-1', 'order-1', 'preparing');
      expect(db.update).toHaveBeenCalled();
    });

    it('sets completedAt when delivered', async () => {
      await updateOrderStatus('tenant-1', 'order-1', 'delivered');
      expect(db.update).toHaveBeenCalled();
    });
  });
});
