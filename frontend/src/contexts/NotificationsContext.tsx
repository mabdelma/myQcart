import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getDB } from '../lib/db';
import type { Order } from '../lib/db/schema';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
}

type NotificationsAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'CLEAR_ALL' };

const NotificationsContext = createContext<{
  state: NotificationsState;
  dispatch: React.Dispatch<NotificationsAction>;
} | null>(null);

function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, read: true })),
        unreadCount: 0
      };
    
    case 'CLEAR_ALL':
      return {
        notifications: [],
        unreadCount: 0
      };
    
    default:
      return state;
  }
}

export function NotificationsProvider({ 
  children,
  role
}: { 
  children: React.ReactNode;
  role: 'admin' | 'kitchen' | 'waiter';
}) {
  const [state, dispatch] = useReducer(notificationsReducer, {
    notifications: [],
    unreadCount: 0
  });

  useEffect(() => {
    const checkForUpdates = async () => {
      const db = await getDB();
      const orders = await db.getAll('orders');
      const tables = await db.getAll('tables');
      
      // Process orders based on role
      orders.forEach(order => {
        const table = tables.find(t => t.id === order.tableId);
        const tableNumber = table?.number || '?';
        
        switch (role) {
          case 'kitchen':
            if (order.status === 'pending') {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: crypto.randomUUID(),
                  message: `New order from Table ${tableNumber}`,
                  type: 'info',
                  createdAt: new Date(),
                  read: false
                }
              });
            }
            break;
          
          case 'waiter':
            if (order.status === 'ready') {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: crypto.randomUUID(),
                  message: `Order for Table ${tableNumber} is ready for delivery`,
                  type: 'success',
                  createdAt: new Date(),
                  read: false
                }
              });
            }
            break;
          
          case 'admin':
            // Admin gets all notifications
            if (order.status === 'pending') {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: crypto.randomUUID(),
                  message: `New order from Table ${tableNumber}`,
                  type: 'info',
                  createdAt: new Date(),
                  read: false
                }
              });
            } else if (order.status === 'ready') {
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  id: crypto.randomUUID(),
                  message: `Order for Table ${tableNumber} is ready`,
                  type: 'success',
                  createdAt: new Date(),
                  read: false
                }
              });
            }
            break;
        }
      });
    };

    // Check for updates every 30 seconds
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <NotificationsContext.Provider value={{ state, dispatch }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}