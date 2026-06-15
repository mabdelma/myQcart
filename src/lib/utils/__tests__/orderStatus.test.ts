import { describe, it, expect } from 'vitest';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid';
type UserRole = 'customer' | 'waiter' | 'kitchen' | 'admin' | 'cashier';

function canTransitionTo(current: OrderStatus, next: OrderStatus, role: UserRole): boolean {
  const validTransitions: Record<UserRole, Record<OrderStatus, OrderStatus[]>> = {
    kitchen: {
      pending: ['preparing'],
      preparing: ['ready'],
      ready: [],
      delivered: [],
      paid: [],
    },
    waiter: {
      pending: [],
      preparing: [],
      ready: ['delivered'],
      delivered: [],
      paid: [],
    },
    cashier: {
      pending: [],
      preparing: [],
      ready: [],
      delivered: ['paid'],
      paid: [],
    },
    admin: {
      pending: ['preparing', 'ready', 'delivered'],
      preparing: ['ready', 'delivered'],
      ready: ['delivered'],
      delivered: ['paid'],
      paid: [],
    },
    customer: {
      pending: [],
      preparing: [],
      ready: [],
      delivered: [],
      paid: [],
    },
  };

  return validTransitions[role]?.[current]?.includes(next) ?? false;
}

describe('canTransitionTo / validateStatusTransition', () => {
  describe('kitchen role', () => {
    it('allows pending → preparing', () => {
      expect(canTransitionTo('pending', 'preparing', 'kitchen')).toBe(true);
    });

    it('allows preparing → ready', () => {
      expect(canTransitionTo('preparing', 'ready', 'kitchen')).toBe(true);
    });

    it('rejects pending → ready (skip preparing)', () => {
      expect(canTransitionTo('pending', 'ready', 'kitchen')).toBe(false);
    });

    it('rejects ready → delivered', () => {
      expect(canTransitionTo('ready', 'delivered', 'kitchen')).toBe(false);
    });
  });

  describe('waiter role', () => {
    it('allows ready → delivered', () => {
      expect(canTransitionTo('ready', 'delivered', 'waiter')).toBe(true);
    });

    it('rejects pending → preparing', () => {
      expect(canTransitionTo('pending', 'preparing', 'waiter')).toBe(false);
    });

    it('rejects preparing → ready', () => {
      expect(canTransitionTo('preparing', 'ready', 'waiter')).toBe(false);
    });
  });

  describe('cashier role', () => {
    it('allows delivered → paid', () => {
      expect(canTransitionTo('delivered', 'paid', 'cashier')).toBe(true);
    });

    it('rejects ready → paid', () => {
      expect(canTransitionTo('ready', 'paid', 'cashier')).toBe(false);
    });

    it('rejects pending → paid', () => {
      expect(canTransitionTo('pending', 'paid', 'cashier')).toBe(false);
    });
  });

  describe('admin role', () => {
    it('allows pending → preparing', () => {
      expect(canTransitionTo('pending', 'preparing', 'admin')).toBe(true);
    });

    it('allows pending → ready', () => {
      expect(canTransitionTo('pending', 'ready', 'admin')).toBe(true);
    });

    it('allows pending → delivered', () => {
      expect(canTransitionTo('pending', 'delivered', 'admin')).toBe(true);
    });

    it('allows preparing → ready', () => {
      expect(canTransitionTo('preparing', 'ready', 'admin')).toBe(true);
    });

    it('allows delivered → paid', () => {
      expect(canTransitionTo('delivered', 'paid', 'admin')).toBe(true);
    });
  });

  describe('invalid / edge-case transitions', () => {
    it('rejects self-transition', () => {
      expect(canTransitionTo('pending', 'pending', 'kitchen')).toBe(false);
    });

    it('rejects customer role transitions', () => {
      expect(canTransitionTo('pending', 'preparing', 'customer')).toBe(false);
    });

    it('rejects reverse transition', () => {
      expect(canTransitionTo('ready', 'preparing', 'kitchen')).toBe(false);
    });

    it('rejects unknown status for role', () => {
      expect(canTransitionTo('delivered', 'paid', 'kitchen')).toBe(false);
    });
  });
});
