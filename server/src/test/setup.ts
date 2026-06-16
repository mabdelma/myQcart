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
    modifierGroups: 'modifierGroups',
    modifierOptions: 'modifierOptions',
    menuItemModifiers: 'menuItemModifiers',
    promoCampaigns: 'promoCampaigns',
    promoCodeUsages: 'promoCodeUsages',
    stockItems: 'stockItems',
    stockMovements: 'stockMovements',
    menuItemIngredients: 'menuItemIngredients',
    customers: 'customers',
    webhookIntegrations: 'webhookIntegrations',
    subscriptionPlans: 'subscriptionPlans',
    tenantSubscriptions: 'tenantSubscriptions',
    printers: 'printers',
    printJobs: 'printJobs',
  };

  let queryQueue: unknown[] = [];

  function nextData(): unknown {
    if (queryQueue.length > 0) {
      return queryQueue.shift();
    }
    return [];
  }

  const simpleQueryResult = {
    then: (resolve: (v: unknown) => void) => resolve(nextData()),
    catch: () => {},
    finally: () => {},
  };

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
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    $inferSelect: {},
    __setQueryData: (data: unknown) => { queryQueue = [data]; },
    __setQueryQueue: (queue: unknown[]) => { queryQueue = [...queue]; },
    limit: vi.fn().mockReturnValue(simpleQueryResult),
    orderBy: vi.fn().mockReturnValue(simpleQueryResult),
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
