import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { seedInitialData } from './seed';
import type { User, MenuItem, Table, MenuCategory, Order, Payment } from './schema';

export interface QCartDB extends DBSchema {
  menu_categories: {
    key: string;
    value: MenuCategory;
    indexes: { 'by-type': string; 'by-parent': string; 'by-order': number };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-email': string };
  };
  tables: {
    key: string;
    value: Table;
    indexes: { 'by-number': number };
  };
  menu_items: {
    key: string;
    value: MenuItem;
    indexes: { 'by-main-category': string; 'by-sub-category': string };
  };
  orders: {
    key: string;
    value: Order;
    indexes: { 'by-table': string; 'by-status': string };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { 'by-order': string };
  };
}

let db: IDBPDatabase<QCartDB> | null = null;
let dbInitPromise: Promise<IDBPDatabase<QCartDB>> | null = null;

const STORES = {
  users: { keyPath: 'id', indexes: [{ name: 'by-email', keyPath: 'email', options: { unique: true } }] },
  menu_categories: {
    keyPath: 'id',
    indexes: [
      { name: 'by-type', keyPath: 'type' },
      { name: 'by-parent', keyPath: 'parentId' },
      { name: 'by-order', keyPath: 'order' }
    ]
  },
  tables: { keyPath: 'id', indexes: [{ name: 'by-number', keyPath: 'number', options: { unique: true } }] },
  menu_items: {
    keyPath: 'id',
    indexes: [
      { name: 'by-main-category', keyPath: 'mainCategoryId' },
      { name: 'by-sub-category', keyPath: 'subCategoryId' }
    ]
  },
  orders: {
    keyPath: 'id',
    indexes: [
      { name: 'by-table', keyPath: 'tableId' },
      { name: 'by-status', keyPath: 'status' }
    ]
  },
  payments: { keyPath: 'id', indexes: [{ name: 'by-order', keyPath: 'orderId' }] }
};

async function createDatabase(): Promise<IDBPDatabase<QCartDB>> {
  return openDB<QCartDB>('qcart-v1', 1, {
    async upgrade(database, oldVersion, newVersion, transaction) {
      // Create all stores and their indexes
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: config.keyPath });
          
          // Create indexes
          if (config.indexes) {
            for (const index of config.indexes) {
              store.createIndex(index.name, index.keyPath, index.options);
            }
          }
        }
      }
      
      // Seed initial data
      await seedInitialData(database);
    },
    blocked() {
      console.warn('Database blocked: another version is open');
    },
    blocking() {
      console.warn('Database blocking: closing older version');
      db?.close();
      db = null;
    },
    terminated() {
      console.warn('Database terminated');
      db = null;
      dbInitPromise = null;
    }
  });
}

export async function initDB(): Promise<IDBPDatabase<QCartDB>> {
  if (!dbInitPromise) {
    dbInitPromise = createDatabase()
      .then(async (database) => {
        db = database;
        return database;
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
        dbInitPromise = null;
        throw error;
      });
  }
  return dbInitPromise;
}

export async function getDB(): Promise<IDBPDatabase<QCartDB>> {
  if (!db) {
    db = await initDB();
  }
  return db;
}