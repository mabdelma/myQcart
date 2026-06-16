import { describe, it, expect, vi, beforeEach } from 'vitest';

import { exportOrders, exportPayments, exportMenuItems } from './exportService.js';
import { db } from '../db/index.js';

describe('exportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportOrders', () => {
    it('returns CSV with headers and data when no date filters given', async () => {
      db.__setQueryQueue([
        [{ id: 'order-1', tenantId: 'tenant-1', tableId: 'table-1', status: 'delivered', customerName: 'John', subtotal: 25, tax: 2, serviceCharge: 1.25, total: 28.25, paymentStatus: 'paid', createdAt: '2025-01-01' }],
        [{ id: 'oi-1', orderId: 'order-1', name: 'Burger', quantity: 2, unitPrice: 10 }],
        [{ id: 'table-1', number: 5 }],
      ]);

      const csv = await exportOrders('tenant-1');

      expect(csv).toContain('orderId,tableNumber,customerName,status,item,quantity,unitPrice,lineTotal,subtotal,tax,serviceCharge,total,paymentStatus,createdAt');
      expect(csv).toContain('order-1');
      expect(csv).toContain('5');
      expect(csv).toContain('John');
      expect(csv).toContain('Burger');
      expect(csv).toContain('28.25');
    });

    it('applies date range filters when startDate and endDate are provided', async () => {
      db.__setQueryQueue([
        [{ id: 'order-2', tenantId: 'tenant-1', tableId: 'table-2', status: 'pending', customerName: null, subtotal: 15, tax: 1.2, serviceCharge: 0.75, total: 16.95, paymentStatus: 'unpaid', createdAt: '2025-06-01' }],
        [{ id: 'oi-2', orderId: 'order-2', name: 'Salad', quantity: 1, unitPrice: 15 }],
        [{ id: 'table-2', number: 3 }],
      ]);

      const csv = await exportOrders('tenant-1', '2025-06-01', '2025-06-30');

      expect(csv).toContain('orderId');
      expect(csv).toContain('Salad');
    });

    it('returns only header when the order has no items', async () => {
      db.__setQueryQueue([
        [{ id: 'order-3', tenantId: 'tenant-1', tableId: 'table-3', status: 'cancelled', customerName: null, subtotal: 0, tax: 0, serviceCharge: 0, total: 0, paymentStatus: 'unpaid', createdAt: '2025-01-01' }],
        [],
        [{ id: 'table-3', number: 7 }],
      ]);

      const csv = await exportOrders('tenant-1');

      expect(csv).toBe('orderId,tableNumber,customerName,status,item,quantity,unitPrice,lineTotal,subtotal,tax,serviceCharge,total,paymentStatus,createdAt');
    });
  });

  describe('exportPayments', () => {
    it('returns CSV with payment headers and data rows', async () => {
      const mockPayments = [
        { id: 'pay-1', tenantId: 'tenant-1', orderId: 'order-1', amount: 25, tip: 3, method: 'card', status: 'paid', createdAt: '2025-01-01' },
      ];
      db.__setQueryData(mockPayments);

      const csv = await exportPayments('tenant-1');

      expect(csv).toContain('paymentId,orderId,amount,tip,total,method,status,createdAt');
      expect(csv).toContain('pay-1,order-1,25.00,3.00,28.00,card,paid');
    });

    it('applies date range filters', async () => {
      db.__setQueryData([]);

      const csv = await exportPayments('tenant-1', '2025-01-01', '2025-01-31');

      expect(csv).toContain('paymentId,orderId,amount,tip,total,method,status,createdAt');
    });
  });

  describe('exportMenuItems', () => {
    it('returns CSV with menu items and their category names', async () => {
      const mockItems = [
        { id: 'mi-1', name: 'Burger', categoryName: 'Mains', price: 12.5, available: true, sortOrder: 1 },
        { id: 'mi-2', name: 'Fries', categoryName: 'Sides', price: 5, available: true, sortOrder: 2 },
      ];
      db.__setQueryData(mockItems);

      const csv = await exportMenuItems('tenant-1');

      expect(csv).toContain('id,name,category,price,available,sortOrder');
      expect(csv).toContain('Burger,Mains,12.50,Yes,1');
      expect(csv).toContain('Fries,Sides,5.00,Yes,2');
    });

    it('handles null category name from leftJoin', async () => {
      const mockItems = [
        { id: 'mi-3', name: 'Special', categoryName: null, price: 20, available: false, sortOrder: 3 },
      ];
      db.__setQueryData(mockItems);

      const csv = await exportMenuItems('tenant-1');

      expect(csv).toContain('Special,,20.00,No,3');
    });
  });
});
