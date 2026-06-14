export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  coverImage?: string;
  primaryColor?: string;
  taxRate: number;
  serviceCharge: number;
  isActive: boolean;
  stripeAccountId?: string;
}

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'waiter' | 'kitchen' | 'cashier';
  avatar?: string;
  isActive: boolean;
  joinedAt: string;
  lastActive: string;
}

export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  type: 'main' | 'sub';
  parentId?: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  subCategoryId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  modifiers?: string;
}

export interface TableData {
  id: string;
  tenantId: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'closed';
  qrToken: string;
  xPos?: number;
  yPos?: number;
}

export interface Order {
  id: string;
  tenantId: string;
  tableId: string;
  serverId?: string;
  customerName?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  itemCount: number;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: string;
  notes?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  amount: number;
  tip: number;
  method: 'card' | 'wallet' | 'cash' | 'crypto';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  receiptUrl?: string;
  createdAt: string;
}

export interface PaymentLink {
  id: string;
  tenantId: string;
  orderId?: string;
  amount: number;
  description?: string;
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  token: string;
  createdAt: string;
  expiresAt?: string;
}

export interface AnalyticsSummary {
  todaysSales: number;
  totalSales: number;
  averagePreparationTime: number;
  activeTables: number;
  totalTables: number;
  delayedOrders: number;
  pendingOrders: number;
  popularItems: { name: string; quantity: number }[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface FinancialAnalytics {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  paymentMethods: Record<string, number>;
}

export interface ApiError {
  error: string;
}

// ── Super-admin / platform ──────────────────────────────────────────────────
export interface PlatformAnalytics {
  tenants: number;
  activeTenants: number;
  users: number;
  orders: number;
  revenue: number;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  currency: string;
  createdAt: string;
}

export interface TenantWithStats extends Tenant {
  stats: { users: number; orders: number; revenue: number };
}
