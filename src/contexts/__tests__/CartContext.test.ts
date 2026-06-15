import { describe, it, expect } from 'vitest';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  comment?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  tableId?: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: MenuItem; quantity: number; comment?: string; tableId?: string }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_COMMENT'; payload: { id: string; comment: string } }
  | { type: 'CLEAR_CART' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      if (!action.payload.available) return state;
      const existingItem = state.items.find(item => item.menuItem.id === action.payload.id);
      const quantity = action.quantity || 1;
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.menuItem.id === action.payload.id
              ? { ...item, quantity: item.quantity + quantity, comment: action.comment || item.comment }
              : item
          ),
          total: state.total + (action.payload.price * quantity)
        };
      }
      return {
        ...state,
        items: [...state.items, { menuItem: action.payload, quantity, comment: action.comment }],
        total: state.total + (action.payload.price * quantity)
      };
    }
    case 'REMOVE_ITEM': {
      const item = state.items.find(item => item.menuItem.id === action.payload);
      if (!item) return state;
      return {
        ...state,
        items: state.items.filter(item => item.menuItem.id !== action.payload),
        total: state.total - (item.menuItem.price * item.quantity)
      };
    }
    case 'UPDATE_QUANTITY': {
      const item = state.items.find(item => item.menuItem.id === action.payload.id);
      if (!item) return state;
      const quantityDiff = action.payload.quantity - item.quantity;
      return {
        ...state,
        items: state.items.map(item =>
          item.menuItem.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        total: state.total + (item.menuItem.price * quantityDiff)
      };
    }
    case 'SET_COMMENT': {
      return {
        ...state,
        items: state.items.map(item =>
          item.menuItem.id === action.payload.id
            ? { ...item, comment: action.payload.comment || undefined }
            : item
        ),
      };
    }
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    default:
      return state;
  }
}

const burger: MenuItem = { id: '1', name: 'Burger', price: 10.99, available: true };
const pizza: MenuItem = { id: '2', name: 'Pizza', price: 14.99, available: true };

describe('cartReducer', () => {
  it('returns initial state for CLEAR_CART', () => {
    const state = cartReducer({ items: [ { menuItem: burger, quantity: 1 } ], total: 10.99 }, { type: 'CLEAR_CART' });
    expect(state.items).toHaveLength(0);
    expect(state.total).toBe(0);
  });

  it('adds an item to empty cart', () => {
    const state = cartReducer({ items: [], total: 0 }, { type: 'ADD_ITEM', payload: burger, quantity: 1 });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].menuItem.id).toBe('1');
    expect(state.total).toBe(10.99);
  });

  it('increments quantity when adding same item', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1 }], total: 10.99 };
    const state = cartReducer(initial, { type: 'ADD_ITEM', payload: burger, quantity: 2 });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(state.total).toBe(32.97);
  });

  it('ignores unavailable items', () => {
    const unavailable: MenuItem = { ...burger, available: false };
    const state = cartReducer({ items: [], total: 0 }, { type: 'ADD_ITEM', payload: unavailable, quantity: 1 });
    expect(state.items).toHaveLength(0);
  });

  it('removes an item', () => {
    const initial = { items: [{ menuItem: burger, quantity: 2 }], total: 21.98 };
    const state = cartReducer(initial, { type: 'REMOVE_ITEM', payload: '1' });
    expect(state.items).toHaveLength(0);
    expect(state.total).toBe(0);
  });

  it('updates item quantity', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1 }], total: 10.99 };
    const state = cartReducer(initial, { type: 'UPDATE_QUANTITY', payload: { id: '1', quantity: 3 } });
    expect(state.items[0].quantity).toBe(3);
    expect(state.total).toBe(32.97);
  });

  it('handles multiple items', () => {
    let state = cartReducer({ items: [], total: 0 }, { type: 'ADD_ITEM', payload: burger, quantity: 1 });
    state = cartReducer(state, { type: 'ADD_ITEM', payload: pizza, quantity: 1 });
    expect(state.items).toHaveLength(2);
    expect(state.total).toBe(25.98);
    state = cartReducer(state, { type: 'REMOVE_ITEM', payload: '1' });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].menuItem.id).toBe('2');
    expect(state.total).toBe(14.99);
  });

  it('does nothing when removing non-existent item', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1 }], total: 10.99 };
    const state = cartReducer(initial, { type: 'REMOVE_ITEM', payload: '999' });
    expect(state).toEqual(initial);
  });

  it('sets comment on existing item', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1 }], total: 10.99 };
    const state = cartReducer(initial, { type: 'SET_COMMENT', payload: { id: '1', comment: 'No onions' } });
    expect(state.items[0].comment).toBe('No onions');
    expect(state.total).toBe(10.99);
  });

  it('clears comment when empty string', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1, comment: 'No onions' }], total: 10.99 };
    const state = cartReducer(initial, { type: 'SET_COMMENT', payload: { id: '1', comment: '' } });
    expect(state.items[0].comment).toBeUndefined();
  });

  it('does nothing for SET_COMMENT on non-existent item', () => {
    const initial = { items: [{ menuItem: burger, quantity: 1 }], total: 10.99 };
    const state = cartReducer(initial, { type: 'SET_COMMENT', payload: { id: '999', comment: 'Test' } });
    expect(state).toEqual(initial);
  });
});
