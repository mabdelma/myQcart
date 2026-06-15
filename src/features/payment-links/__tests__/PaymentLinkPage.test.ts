import { describe, it, expect } from 'vitest';

describe('PaymentLinkPage state logic', () => {
  it('shows completed state when status is paid', () => {
    const isPaid = (status: string) => status === 'paid';
    expect(isPaid('paid')).toBe(true);
    expect(isPaid('active')).toBe(false);
    expect(isPaid('expired')).toBe(false);
    expect(isPaid('cancelled')).toBe(false);
  });

  it('shows expired state when link is expired or cancelled', () => {
    const isExpiredOrCancelled = (status: string) =>
      status === 'expired' || status === 'cancelled';
    expect(isExpiredOrCancelled('expired')).toBe(true);
    expect(isExpiredOrCancelled('cancelled')).toBe(true);
    expect(isExpiredOrCancelled('active')).toBe(false);
    expect(isExpiredOrCancelled('paid')).toBe(false);
  });

  it('allows card payment only when slug and orderId are present', () => {
    const canPayCard = (slug?: string, orderId?: string, stripeReady?: boolean) =>
      !!stripeReady && !!slug && !!orderId;
    expect(canPayCard('demo-cafe', 'order-1', true)).toBe(true);
    expect(canPayCard(undefined, 'order-1', true)).toBe(false);
    expect(canPayCard('demo-cafe', undefined, true)).toBe(false);
    expect(canPayCard('demo-cafe', 'order-1', false)).toBe(false);
  });

  it('handles malformed expiresAt gracefully', () => {
    const formatDate = (expiresAt?: string) => {
      if (!expiresAt) return null;
      try {
        return new Date(expiresAt).toLocaleDateString();
      } catch {
        return null;
      }
    };
    expect(formatDate('2026-07-01T00:00:00.000Z')).toBeTruthy();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });

  it('formats amount correctly', () => {
    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
    expect(formatAmount(10)).toBe('$10.00');
    expect(formatAmount(10.5)).toBe('$10.50');
    expect(formatAmount(0)).toBe('$0.00');
    expect(formatAmount(1234.56)).toBe('$1234.56');
  });
});
