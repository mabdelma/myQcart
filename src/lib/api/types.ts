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
  accentColor?: string;
  faviconUrl?: string;
  customDomain?: string;
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
  type: string;
  parentId?: string;
  sortOrder: number;
  translations?: Record<string, { name?: string }>;
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
  taxCategoryId?: string;
  taxExempt?: boolean;
  translations?: Record<string, { name?: string; description?: string }>;
}

export interface TaxCategory {
  id: string;
  tenantId: string;
  name: string;
  rate: number;
  isDefault: boolean;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardRedemption {
  id: string;
  tenantId: string;
  giftCardId: string;
  orderId: string;
  amount: number;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  notes?: string;
  userId: string;
  userName?: string;
  userRole?: string;
}

export interface ConnectAccountStatus {
  connected: boolean;
  account: {
    id: string;
    email: string | null;
    country: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  } | null;
}

export interface PayoutInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string;
  created?: string;
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
  tableId?: string;
  serverId?: string;
  customerName?: string;
  customerPhone?: string;
  orderType: 'dine_in' | 'takeout' | 'delivery';
  deliveryAddress?: string;
  deliveryFee: number;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  itemCount: number;
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
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
  isComp?: boolean;
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

export interface PaymentLinkResponse {
  id: string;
  orderId?: string;
  amount: number;
  description?: string;
  tenantName?: string;
  tenantSlug?: string;
  tenantLogo?: string;
  status: string;
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

export interface ModifierGroup {
  id: string;
  tenantId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceAdjustment: number;
  maxSelectable: number;
  sortOrder: number;
}

// ── Super-admin / platform ──────────────────────────────────────────────────
export interface PlatformAnalytics {
  tenants: number;
  activeTenants: number;
  users: number;
  orders: number;
  revenue: number;
  customers: number;
  tables: number;
  menuItems: number;
  monthlyGrowth: number;
}

export interface TenantUsage {
  users: number;
  orders: number;
  revenue: number;
  customers: number;
  tables: number;
  menuItems: number;
  storageEstimate: string;
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

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  isActive: boolean;
  joinedAt: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  restaurant: string;
  phone: string | null;
  size: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

export interface TenantWithStats extends Tenant {
  stats: { users: number; orders: number; revenue: number; customers: number; tables: number; menuItems: number; storageEstimate: string };
}

export interface HourlyTrafficPoint {
  hour: number;
  orderCount: number;
  revenue: number;
}

export interface PeakHour {
  dayOfWeek: number;
  hour: number;
  orderCount: number;
}

export interface CategoryPerformanceItem {
  categoryId: string;
  categoryName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface TrendingItem {
  id: string;
  name: string;
  price: number;
  recentOrders: number;
}

export interface RecommendationItem {
  id: string;
  name: string;
  price: number;
  orderCount: number;
}

export interface ModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'happy_hour';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string;
  timeStart?: string;
  timeEnd?: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  createdAt: string;
}

export interface Reservation {
  id: string;
  tenantId: string;
  tableId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize: number;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  notes?: string;
  specialRequests?: string;
  source: 'web' | 'phone' | 'walk_in' | 'staff';
  depositAmount?: number;
  depositPaymentId?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired';
  estimatedWaitMinutes?: number;
  notifiedAt?: string;
  seatedAt?: string;
  notes?: string;
  source: 'web' | 'staff';
  position?: number;
  createdAt: string;
}

export interface CampaignInput {
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'happy_hour';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string;
  timeStart?: string;
  timeEnd?: string;
  usageLimit?: number;
  isActive?: boolean;
}

export interface PnLReport {
  start: string | null;
  end: string | null;
  grossRevenue: number;
  tips: number;
  refunds: number;
  netRevenue: number;
  tax: number;
  serviceCharge: number;
  cogs: number;
  grossProfit: number;
  orderCount: number;
  avgOrderValue: number;
  byMethod: { method: string; amount: number; count: number }[];
}
