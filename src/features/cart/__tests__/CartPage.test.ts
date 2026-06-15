import { describe, it, expect } from 'vitest';

interface CartItem {
  menuItem: { id: string; name: string; price: number };
  quantity: number;
  comment?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
}

function calcTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
}

function isCartEmpty(state: CartState): boolean {
  return state.items.length === 0 && state.total === 0;
}

describe('CartPage logic', () => {
  it('calculates total from items', () => {
    const items: CartItem[] = [
      { menuItem: { id: '1', name: 'Burger', price: 10.99 }, quantity: 2 },
      { menuItem: { id: '2', name: 'Fries', price: 4.99 }, quantity: 1 },
    ];
    expect(calcTotal(items)).toBe(26.97);
  });

  it('returns 0 for empty cart', () => {
    expect(calcTotal([])).toBe(0);
  });

  it('detects empty cart', () => {
    expect(isCartEmpty({ items: [], total: 0 })).toBe(true);
    expect(isCartEmpty({ items: [{ menuItem: { id: '1', name: 'Burger', price: 10 }, quantity: 1 }], total: 10 })).toBe(false);
  });
});
