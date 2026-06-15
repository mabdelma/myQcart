import { describe, it, expect } from 'vitest';

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
      return { notifications: [], unreadCount: 0 };
    default:
      return state;
  }
}

const now = new Date();
const notif = (id: string, overrides?: Partial<Notification>): Notification => ({
  id,
  message: 'Test notification',
  type: 'info',
  createdAt: now,
  read: false,
  ...overrides,
});

describe('notificationsReducer', () => {
  it('has correct initial state', () => {
    const initial: NotificationsState = { notifications: [], unreadCount: 0 };
    expect(initial.notifications).toHaveLength(0);
    expect(initial.unreadCount).toBe(0);
  });

  it('adds notification with ADD_NOTACTION', () => {
    const initial: NotificationsState = { notifications: [], unreadCount: 0 };
    const state = notificationsReducer(initial, { type: 'ADD_NOTIFICATION', payload: notif('1') });
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('1');
    expect(state.notifications[0].read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('prepends new notifications', () => {
    const initial: NotificationsState = { notifications: [notif('old')], unreadCount: 0 };
    const state = notificationsReducer(initial, { type: 'ADD_NOTIFICATION', payload: notif('new') });
    expect(state.notifications).toHaveLength(2);
    expect(state.notifications[0].id).toBe('new');
    expect(state.notifications[1].id).toBe('old');
    expect(state.unreadCount).toBe(1);
  });

  it('marks a notification as read with MARK_AS_READ', () => {
    const initial: NotificationsState = { notifications: [notif('1'), notif('2')], unreadCount: 2 };
    const state = notificationsReducer(initial, { type: 'MARK_AS_READ', payload: '1' });
    expect(state.notifications[0].read).toBe(true);
    expect(state.notifications[1].read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('does not go below 0 unreadCount on MARK_AS_READ', () => {
    const initial: NotificationsState = { notifications: [notif('1', { read: true })], unreadCount: 0 };
    const state = notificationsReducer(initial, { type: 'MARK_AS_READ', payload: '1' });
    expect(state.unreadCount).toBe(0);
  });

  it('marks all as read with MARK_ALL_AS_READ', () => {
    const initial: NotificationsState = {
      notifications: [notif('1'), notif('2'), notif('3')],
      unreadCount: 3
    };
    const state = notificationsReducer(initial, { type: 'MARK_ALL_AS_READ' });
    expect(state.notifications.every(n => n.read)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('clears all notifications with CLEAR_ALL', () => {
    const initial: NotificationsState = {
      notifications: [notif('1'), notif('2')],
      unreadCount: 2
    };
    const state = notificationsReducer(initial, { type: 'CLEAR_ALL' });
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });
});
