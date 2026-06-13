import { db, schema } from './index.js';

import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

async function seed() {
  const [existing] = await db.select().from(schema.tenants).limit(1);
  if (existing) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding demo data...');

  const tenantId = uuid();
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: 'Demo Cafe',
    slug: 'demo-cafe',
    email: 'hello@democafe.com',
    phone: '+1-555-0100',
    address: '123 Main Street, Cityville',
    currency: 'USD',
    timezone: 'America/New_York',
    primaryColor: '#8B4513',
    taxRate: 0.08,
    serviceCharge: 0.05,
  });

  const passwordHash = await bcrypt.hash('pass123', 12);
  await db.insert(schema.users).values({
    id: uuid(),
    tenantId,
    name: 'Restaurant Owner',
    email: 'owner@demo.com',
    passwordHash,
    role: 'admin',
  });

  const cat1Id = uuid();
  const cat2Id = uuid();
  await db.insert(schema.menuCategories).values([
    { id: cat1Id, tenantId, name: 'Main Courses', type: 'main', sortOrder: 0 },
    { id: cat2Id, tenantId, name: 'Beverages', type: 'main', sortOrder: 1 },
  ]);

  await db.insert(schema.menuItems).values([
    {
      id: uuid(), tenantId, categoryId: cat1Id,
      name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, and special sauce',
      price: 12.99, available: true, sortOrder: 0,
    },
    {
      id: uuid(), tenantId, categoryId: cat1Id,
      name: 'Margherita Pizza', description: 'Fresh mozzarella, tomato sauce, and basil',
      price: 14.99, available: true, sortOrder: 1,
    },
    {
      id: uuid(), tenantId, categoryId: cat2Id,
      name: 'Fresh Lemonade', description: 'House-made lemonade with mint',
      price: 4.99, available: true, sortOrder: 0,
    },
    {
      id: uuid(), tenantId, categoryId: cat2Id,
      name: 'Espresso', description: 'Double shot espresso',
      price: 3.49, available: true, sortOrder: 1,
    },
  ]);

  const qrToken = crypto.randomBytes(16).toString('hex');
  await db.insert(schema.tables).values({
    id: uuid(), tenantId, number: 1, capacity: 4, qrToken,
  });

  console.log(`Seeded tenant: demo-cafe (ID: ${tenantId})`);
  console.log('Admin login: owner@demo.com / pass123');
  console.log(`Table QR token: ${qrToken}`);
}

seed()
  .then(() => { process.exit(0); })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
