import type { IDBPDatabase } from 'idb';
import type { SmartWaiterDB } from './index';
import type { User, MenuItem, Table, MenuCategory } from './schema';

export async function seedInitialData(db: IDBPDatabase<QCartDB>): Promise<void> {
  try {
    // Prepare seed data
    const mainCategories: MenuCategory[] = [
      { id: '1', name: 'Food Menu', type: 'main', order: 0 },
      { id: '2', name: 'Beverage Menu', type: 'main', order: 1 }
    ];
    
    const subCategories: MenuCategory[] = [
      { id: '3', name: 'Appetizers', type: 'sub', parentId: '1', order: 0 },
      { id: '4', name: 'Main Courses', type: 'sub', parentId: '1', order: 1 },
      { id: '5', name: 'Soft Drinks', type: 'sub', parentId: '2', order: 0 },
      { id: '6', name: 'Hot Drinks', type: 'sub', parentId: '2', order: 1 }
    ];
    
    const adminUser: User = {
      id: '1',
      name: 'Admin User',
      email: 'admin@qcart.com',
      role: 'admin',
      joinedAt: new Date(),
      lastActive: new Date()
    };
    
    // Add demo staff accounts
    const demoStaff = [
      {
        id: '2',
        name: 'Cashier Staff',
        email: 'cashier@qcart.com',
        role: 'cashier',
        joinedAt: new Date(),
        lastActive: new Date()
      },
      {
        id: '3',
        name: 'Kitchen Staff',
        email: 'kitchen@qcart.com',
        role: 'kitchen',
        joinedAt: new Date(),
        lastActive: new Date()
      },
      {
        id: '4',
        name: 'Waiter Staff',
        email: 'waiter@qcart.com',
        role: 'waiter',
        joinedAt: new Date(),
        lastActive: new Date()
      }
    ];

    const menuItems: MenuItem[] = [
      {
        id: 'truffle-pasta',
        name: 'Truffle Pasta',
        description: 'Fresh handmade pasta with black truffle and parmesan cream sauce',
        price: 24.99,
        mainCategoryId: '1',
        subCategoryId: '4',
        image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800',
        available: true
      },
      {
        id: 'wagyu-burger',
        name: 'Wagyu Burger',
        description: 'Premium wagyu beef patty with caramelized onions and special sauce',
        price: 28.99,
        mainCategoryId: '1',
        subCategoryId: '4',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
        available: true
      },
      {
        id: 'seafood-risotto',
        name: 'Seafood Risotto',
        description: 'Creamy arborio rice with fresh seafood and saffron',
        price: 32.99,
        mainCategoryId: '1',
        subCategoryId: '4',
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800',
        available: true
      },
      {
        id: 'caesar-salad',
        name: 'Caesar Salad',
        description: 'Crisp romaine lettuce, parmesan, croutons, and house-made dressing',
        price: 16.99,
        mainCategoryId: '1',
        subCategoryId: '3',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
        available: true
      }
    ];
    
    const tables: Table[] = [
      {
        id: '1',
        number: 1,
        capacity: 4,
        status: 'available',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=table/1'
      },
      {
        id: '2',
        number: 2,
        capacity: 2,
        status: 'available',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=table/2'
      }
    ];

    // Add categories
    await Promise.all([
      db.add('menu_categories', mainCategories[0]),
      db.add('menu_categories', mainCategories[1]),
      ...subCategories.map(cat => db.add('menu_categories', cat))
    ]);

    // Add users
    await Promise.all([
      db.add('users', adminUser),
      ...demoStaff.map(staff => db.add('users', staff))
    ]);

    // Add menu items and tables
    await Promise.all([
      ...menuItems.map(item => db.add('menu_items', item)),
      ...tables.map(table => db.add('tables', table))
    ]);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}