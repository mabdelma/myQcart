import { describe, it, expect } from 'vitest';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

describe('OrdersPage status display', () => {
  it('returns correct color class for each status', () => {
    expect(statusColors.pending).toBe('bg-yellow-100 text-yellow-800');
    expect(statusColors.preparing).toBe('bg-blue-100 text-blue-800');
    expect(statusColors.ready).toBe('bg-green-100 text-green-800');
    expect(statusColors.delivered).toBe('bg-gray-100 text-gray-800');
    expect(statusColors.cancelled).toBe('bg-red-100 text-red-800');
  });

  it('marks orders as payable when ready/delivered and unpaid', () => {
    const isPayable = (status: string, paymentStatus: string) =>
      (status === 'ready' || status === 'delivered') && paymentStatus !== 'paid';
    expect(isPayable('ready', 'unpaid')).toBe(true);
    expect(isPayable('delivered', 'unpaid')).toBe(true);
    expect(isPayable('pending', 'unpaid')).toBe(false);
    expect(isPayable('preparing', 'unpaid')).toBe(false);
    expect(isPayable('ready', 'paid')).toBe(false);
    expect(isPayable('delivered', 'paid')).toBe(false);
  });
});
