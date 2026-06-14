import { api } from './client';
import type { Tenant, User, MenuCategory, MenuItem, TableData, Order, OrderWithItems, OrderItem, Payment, PaymentLink, AnalyticsSummary, RevenueDataPoint, FinancialAnalytics, PlatformAnalytics, TenantSummary, TenantWithStats } from './types';

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }, { skipAuth: true }),
  register: (data: { tenantSlug: string; name: string; email: string; password: string; role?: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data, { skipAuth: true }),
  me: () => api.get<{ user: User; tenant: Tenant | null }>('/auth/me'),
};

// Super-admin / platform (all require a super_admin token)
export const adminApi = {
  platformAnalytics: () => api.get<PlatformAnalytics>('/admin/analytics'),
  listTenants: () => api.get<TenantSummary[]>('/admin/tenants'),
  getTenant: (tenantId: string) => api.get<TenantWithStats>(`/admin/tenants/${tenantId}`),
  setTenantStatus: (tenantId: string, isActive: boolean) =>
    api.put<{ success: boolean }>(`/admin/tenants/${tenantId}/status`, { isActive }),
};

// Tenants
export const tenantApi = {
  get: (slug: string) => api.get<Tenant>(`/tenants/${slug}`, { skipAuth: true }),
  create: (data: { name: string; slug: string; email: string; phone?: string; adminName: string; adminPassword: string }) =>
    api.post<{ tenant: Tenant; admin: User }>('/tenants', data, { skipAuth: true }),
  updateSettings: (slug: string, data: Partial<Tenant>) =>
    api.put<{ success: boolean }>(`/tenants/${slug}/settings`, data),
};

// Menu
export const menuApi = {
  getFullMenu: (slug: string) =>
    api.get<{ categories: MenuCategory[]; items: MenuItem[] }>(`/r/${slug}/menu`, { skipAuth: true }),
  createCategory: (slug: string, data: { name: string; type?: string; parentId?: string; sortOrder?: number }) =>
    api.post<MenuCategory>(`/r/${slug}/menu/categories`, data),
  updateCategory: (slug: string, categoryId: string, data: Partial<MenuCategory>) =>
    api.put<{ success: boolean }>(`/r/${slug}/menu/categories/${categoryId}`, data),
  deleteCategory: (slug: string, categoryId: string) =>
    api.delete<{ success: boolean }>(`/r/${slug}/menu/categories/${categoryId}`),
  createItem: (slug: string, data: { categoryId: string; name: string; price: number; description?: string; imageUrl?: string; available?: boolean; sortOrder?: number; modifiers?: string }) =>
    api.post<MenuItem>(`/r/${slug}/menu/items`, data),
  updateItem: (slug: string, itemId: string, data: Partial<MenuItem>) =>
    api.put<{ success: boolean }>(`/r/${slug}/menu/items/${itemId}`, data),
  deleteItem: (slug: string, itemId: string) =>
    api.delete<{ success: boolean }>(`/r/${slug}/menu/items/${itemId}`),
  reorderItems: (slug: string, items: { id: string; sortOrder: number }[]) =>
    api.put<{ success: boolean }>(`/r/${slug}/menu/reorder`, { items }),
  reorderCategories: (slug: string, categories: { id: string; sortOrder: number }[]) =>
    api.put<{ success: boolean }>(`/r/${slug}/menu/categories/reorder`, { categories }),
};

// Tables
export const tableApi = {
  resolve: (qrToken: string) =>
    api.get<TableData & { tenantSlug: string; tenantName: string }>(`/r/resolve/${qrToken}`, { skipAuth: true }),
  getByQr: (slug: string, qrToken: string) =>
    api.get<TableData>(`/r/${slug}/table/${qrToken}`, { skipAuth: true }),
  list: (slug: string) =>
    api.get<TableData[]>(`/r/${slug}/tables`),
  create: (slug: string, data: { number: number; capacity?: number; xPos?: number; yPos?: number }) =>
    api.post<TableData>(`/r/${slug}/tables`, data),
  update: (slug: string, tableId: string, data: Partial<TableData>) =>
    api.put<{ success: boolean }>(`/r/${slug}/tables/${tableId}`, data),
  delete: (slug: string, tableId: string) =>
    api.delete<{ success: boolean }>(`/r/${slug}/tables/${tableId}`),
};

// Orders
export const orderApi = {
  create: (slug: string, data: { tableId: string; customerName?: string; items: { menuItemId: string; name: string; quantity: number; unitPrice: number; notes?: string; modifiers?: string }[]; notes?: string }) =>
    api.post<{ id: string; items: OrderItem[]; subtotal: number; tax: number; serviceCharge: number; total: number }>(`/r/${slug}/orders`, data, { skipAuth: true }),
  getForTable: (slug: string, tableId: string) =>
    api.get<Order[]>(`/r/${slug}/table/${tableId}/orders`, { skipAuth: true }),
  list: (slug: string, status?: string) =>
    api.get<Order[]>(`/r/${slug}/orders${status ? `?status=${status}` : ''}`),
  getDetail: (slug: string, orderId: string) =>
    api.get<OrderWithItems>(`/r/${slug}/orders/${orderId}`),
  updateStatus: (slug: string, orderId: string, status: string) =>
    api.patch<{ success: boolean }>(`/r/${slug}/orders/${orderId}/status`, { status }),
  getByServer: (slug: string, serverId: string) =>
    api.get<Order[]>(`/r/${slug}/orders/server/${serverId}`),
};

// Users / Staff management
export const userApi = {
  list: (slug: string) =>
    api.get<User[]>(`/r/${slug}/users`),
  create: (slug: string, data: { name: string; email: string; password: string; role: string; phone?: string }) =>
    api.post<User>(`/r/${slug}/users`, data),
  update: (slug: string, userId: string, data: Partial<User>) =>
    api.put<{ success: boolean }>(`/r/${slug}/users/${userId}`, data),
  updateStatus: (slug: string, userId: string, isActive: boolean) =>
    api.patch<{ success: boolean }>(`/r/${slug}/users/${userId}/status`, { isActive }),
  delete: (slug: string, userId: string) =>
    api.delete<{ success: boolean }>(`/r/${slug}/users/${userId}`),
};

// Payments
export const paymentApi = {
  createIntent: (slug: string, data: { orderId: string; tip?: number }) =>
    api.post<{ clientSecret: string; paymentId: string; amount: number }>(`/r/${slug}/payments/create-intent`, data, { skipAuth: true }),
  recordCash: (slug: string, data: { orderId: string; amount: number; tip?: number }) =>
    api.post<Payment>(`/r/${slug}/payments/cash`, data, { skipAuth: true }),
  list: (slug: string) =>
    api.get<Payment[]>(`/r/${slug}/payments`),
  getPaymentLink: (token: string) =>
    api.get<PaymentLink>(`/payment-links/${token}`, { skipAuth: true }),
};

// Analytics
export const analyticsApi = {
  summary: (slug: string) =>
    api.get<AnalyticsSummary>(`/r/${slug}/analytics/summary`),
  revenue: (slug: string) =>
    api.get<{ daily: RevenueDataPoint[] }>(`/r/${slug}/analytics/revenue`),
  financial: (slug: string) =>
    api.get<FinancialAnalytics>(`/r/${slug}/analytics/financial`),
};

export const uploadApi = {
  image: (slug: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ url: string; filename: string }>(`/r/${slug}/upload`, formData);
  },
};
