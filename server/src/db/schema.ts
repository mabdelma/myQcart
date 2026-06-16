import { pgTable, text, integer, doublePrecision, boolean, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tenantGroups = pgTable('tenant_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

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
  accentColor: text('accent_color').default('#5C4033'),
  faviconUrl: text('favicon_url'),
  customDomain: text('custom_domain'),
  taxRate: doublePrecision('tax_rate').default(0),
  serviceCharge: doublePrecision('service_charge').default(0),
  groupId: text('group_id').references(() => tenantGroups.id),
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
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpiry: text('verification_token_expiry'),
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

export const stockItems = pgTable('stock_items', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('units'),
  currentStock: doublePrecision('current_stock').notNull().default(0),
  minStock: doublePrecision('min_stock').notNull().default(0),
  costPerUnit: doublePrecision('cost_per_unit').default(0),
  createdAt: text('created_at').notNull().default(sql`now()`),
  updatedAt: text('updated_at').notNull().default(sql`now()`),
});

export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  stockItemId: text('stock_item_id').notNull().references(() => stockItems.id),
  type: text('type', { enum: ['in', 'out', 'adjustment'] }).notNull(),
  quantity: doublePrecision('quantity').notNull(),
  reason: text('reason'),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const menuItemIngredients = pgTable('menu_item_ingredients', {
  id: text('id').primaryKey(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  stockItemId: text('stock_item_id').notNull().references(() => stockItems.id),
  quantity: doublePrecision('quantity').notNull().default(1),
});

export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: doublePrecision('price').notNull().default(0),
  maxMenus: integer('max_menus').default(-1),
  maxTables: integer('max_tables').default(-1),
  maxStaff: integer('max_staff').default(-1),
  features: text('features'),
});

export const tenantSubscriptions = pgTable('tenant_subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  planId: text('plan_id').notNull().references(() => subscriptionPlans.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status', { enum: ['active', 'past_due', 'canceled', 'trial'] }).notNull().default('trial'),
  trialEndsAt: text('trial_ends_at'),
  currentPeriodStart: text('current_period_start'),
  currentPeriodEnd: text('current_period_end'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const modifierGroups = pgTable('modifier_groups', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  selectionType: text('selection_type', { enum: ['single', 'multiple'] }).notNull().default('single'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const modifierOptions = pgTable('modifier_options', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => modifierGroups.id),
  name: text('name').notNull(),
  priceAdjustment: doublePrecision('price_adjustment').notNull().default(0),
  maxSelectable: integer('max_selectable').default(1),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const menuItemModifiers = pgTable('menu_item_modifiers', {
  id: text('id').primaryKey(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  modifierGroupId: text('modifier_group_id').notNull().references(() => modifierGroups.id),
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
  paymentStatus: text('payment_status', { enum: ['unpaid', 'partially_paid', 'paid', 'refunded'] }).notNull().default('unpaid'),
  paidAmount: doublePrecision('paid_amount').notNull().default(0),
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

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  totalVisits: integer('total_visits').notNull().default(0),
  totalSpent: doublePrecision('total_spent').notNull().default(0),
  lastVisit: text('last_visit'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const webhookIntegrations = pgTable('webhook_integrations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  provider: text('provider', { enum: ['delivery', 'accounting', 'custom'] }).notNull(),
  url: text('url').notNull(),
  secret: text('secret'),
  events: text('events').notNull().default('order_created,payment_completed'),
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: text('last_triggered_at'),
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

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: text('details'),
  ip: text('ip'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tenantId: text('tenant_id').references(() => tenants.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const printers = pgTable('printers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['thermal', 'laser', 'network', 'browser'] }).notNull().default('browser'),
  address: text('address'),
  port: integer('port'),
  isActive: boolean('is_active').notNull().default(true),
  autoPrint: boolean('auto_print').notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const printJobs = pgTable('print_jobs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  orderId: text('order_id').notNull().references(() => orders.id),
  printerId: text('printer_id').references(() => printers.id),
  type: text('type', { enum: ['kot', 'receipt', 'bill'] }).notNull().default('kot'),
  status: text('status', { enum: ['pending', 'printed', 'failed'] }).notNull().default('pending'),
  content: text('content'),
  error: text('error'),
  printedAt: text('printed_at'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const promoCampaigns = pgTable('promo_campaigns', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['percentage', 'fixed', 'buy_x_get_y', 'happy_hour'] }).notNull(),
  value: doublePrecision('value').notNull().default(0),
  minOrderAmount: doublePrecision('min_order_amount').default(0),
  maxDiscount: doublePrecision('max_discount'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  daysOfWeek: text('days_of_week'),
  timeStart: text('time_start'),
  timeEnd: text('time_end'),
  isActive: boolean('is_active').notNull().default(true),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const promoCodeUsages = pgTable('promo_code_usages', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => promoCampaigns.id),
  orderId: text('order_id').notNull().references(() => orders.id),
  discountAmount: doublePrecision('discount_amount').notNull().default(0),
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

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});

export const loyaltySummary = pgTable('loyalty_summary', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id).unique(),
  points: integer('points').notNull().default(0),
  lifetimePoints: integer('lifetime_points').notNull().default(0),
  tier: text('tier', { enum: ['bronze', 'silver', 'gold', 'platinum'] }).notNull().default('bronze'),
  updatedAt: text('updated_at').notNull().default(sql`now()`),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  type: text('type', { enum: ['earn', 'redeem'] }).notNull(),
  amount: integer('amount').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`now()`),
});
