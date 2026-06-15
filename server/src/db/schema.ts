import { pgTable, text, integer, doublePrecision, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  currency: text('currency').notNull().default('USD'),
  timezone: text('timezone').notNull().default('UTC'),
  logoUrl: text('logo_url'),
  coverImage: text('cover_image'),
  primaryColor: text('primary_color').default('#8B4513'),
  taxRate: doublePrecision('tax_rate').default(0),
  serviceCharge: doublePrecision('service_charge').default(0),
  isActive: boolean('is_active').notNull().default(true),
  stripeAccountId: text('stripe_account_id'),
  createdAt: text('created_at').notNull().default(sql`now()`),
  updatedAt: text('updated_at').notNull().default(sql`now()`),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  // Nullable: a platform-level super_admin belongs to no single tenant.
  tenantId: text('tenant_id').references(() => tenants.id),
  role: text('role', { enum: ['super_admin', 'admin', 'manager', 'waiter', 'kitchen', 'cashier'] }).notNull().default('waiter'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  isActive: boolean('is_active').notNull().default(true),
  resetToken: text('reset_token'),
  resetTokenExpiry: text('reset_token_expiry'),
  joinedAt: text('joined_at').notNull().default(sql`now()`),
  lastActive: text('last_active').notNull().default(sql`now()`),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const menuCategories = pgTable('menu_categories', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['main', 'sub'] }).notNull().default('main'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  categoryId: text('category_id').notNull().references(() => menuCategories.id),
  subCategoryId: text('sub_category_id'),
  name: text('name').notNull(),
  description: text('description'),
  price: doublePrecision('price').notNull(),
  imageUrl: text('image_url'),
  imageData: text('image_data'),
  available: boolean('available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  modifiers: text('modifiers'),
});

export const tables = pgTable('tables', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  number: integer('number').notNull(),
  capacity: integer('capacity').notNull().default(2),
  status: text('status', { enum: ['available', 'occupied', 'reserved', 'closed'] }).notNull().default('available'),
  qrToken: text('qr_token').notNull().unique(),
  qrImage: text('qr_image'),
  xPos: doublePrecision('x_pos'),
  yPos: doublePrecision('y_pos'),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  tableId: text('table_id').notNull().references(() => tables.id),
  serverId: text('server_id'),
  customerName: text('customer_name'),
  status: text('status', { enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] }).notNull().default('pending'),
  itemCount: integer('item_count').notNull().default(0),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  tax: doublePrecision('tax').notNull().default(0),
  serviceCharge: doublePrecision('service_charge').notNull().default(0),
  total: doublePrecision('total').notNull().default(0),
  paymentStatus: text('payment_status', { enum: ['unpaid', 'paid', 'refunded'] }).notNull().default('unpaid'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`now()`),
  updatedAt: text('updated_at').notNull().default(sql`now()`),
  completedAt: text('completed_at'),
});

export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  menuItemId: text('menu_item_id').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
  modifiers: text('modifiers'),
  notes: text('notes'),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderId: text('order_id').notNull().references(() => orders.id),
  amount: doublePrecision('amount').notNull(),
  tip: doublePrecision('tip').default(0),
  method: text('method', { enum: ['card', 'wallet', 'cash', 'crypto'] }).notNull(),
  status: text('status', { enum: ['pending', 'paid', 'failed', 'refunded'] }).notNull().default('pending'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripePaymentLinkId: text('stripe_payment_link_id'),
  receiptUrl: text('receipt_url'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const demoRequests = pgTable('demo_requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  restaurant: text('restaurant').notNull(),
  phone: text('phone'),
  size: text('size'),
  message: text('message'),
  status: text('status', { enum: ['pending', 'contacted', 'converted', 'closed'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const paymentLinks = pgTable('payment_links', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderId: text('order_id').references(() => orders.id),
  amount: doublePrecision('amount').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'paid', 'expired', 'cancelled'] }).notNull().default('active'),
  token: text('token').notNull().unique(),
  stripeLinkId: text('stripe_link_id'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().default(sql`now()`),
  expiresAt: text('expires_at'),
});
