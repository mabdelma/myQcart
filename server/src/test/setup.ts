import { vi } from 'vitest';

vi.mock('../db/index.js', () => {
  const schema = {
    tenants: 'tenants',
    users: 'users',
    sessions: 'sessions',
    menuCategories: 'menuCategories',
    menuItems: 'menuItems',
    tables: 'tables',
    orders: 'orders',
    orderItems: 'orderItems',
    payments: 'payments',
    paymentLinks: 'paymentLinks',
    demoRequests: 'demoRequests',
  };

  let queryQueue: unknown[] = [];

  function nextData(): unknown {
    if (queryQueue.length > 0) {
      return queryQueue.shift();
    }
    return [];
  }

  const queryResult = {
    then: (resolve: (v: unknown) => void) => resolve(nextData()),
    catch: () => {},
    finally: () => {},
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => queryResult),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $inferSelect: {},
    __setQueryData: (data: unknown) => { queryQueue = [data]; },
    __setQueryQueue: (queue: unknown[]) => { queryQueue = [...queue]; },
  };

  return { db, schema };
});

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/events.js', () => ({
  emitOrderEvent: vi.fn(),
  onOrderEvent: vi.fn(() => vi.fn()),
}));

vi.mock('../lib/mail.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendDemoNotification: vi.fn().mockResolvedValue(undefined),
}));
