import React, { createContext, useContext, useReducer } from 'react';
import type { MenuItem } from '../lib/db/schema';

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
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Don't add unavailable items
      if (!action.payload.available) {
        return state;
      }
      
      const existingItem = state.items.find(item => item.menuItem.id === action.payload.id);
      const quantity = action.quantity || 1;
      
      if (existingItem) {
        return {
          ...state,
          tableId: action.tableId || state.tableId,
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
        tableId: action.tableId || state.tableId,
        items: [...state.items, { 
          menuItem: action.payload, 
          quantity, 
          comment: action.comment || undefined 
        }],
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

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}