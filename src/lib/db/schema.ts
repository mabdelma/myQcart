// Database schema and types for IndexedDB
export interface User {
  id: string;
  role: 'customer' | 'waiter' | 'kitchen' | 'admin' | 'cashier';
  name: string;
  email: string;
  profileImage?: string;
  bio?: string;
  phoneNumber?: string;
  joinedAt: Date;
  lastActive: Date;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  qrCode: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parentId?: string;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  mainCategoryId: string;
  subCategoryId: string;
  image: string;
  available: boolean;
  customizations?: {
    name: string;
    options: string[];
    price?: number;
  }[];
}

export interface Order {
  id: string;
  tableId: string;
  waiterStaffId?: string;
  kitchenStaffId?: string;
  cashierId?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  items: OrderItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  hasComplaints?: boolean;
  paymentStatus: 'unpaid' | 'partially' | 'paid';
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  notes?: string;
  customizations?: {
    name: string;
    selected: string;
    price?: number;
  }[];
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'card' | 'wallet' | 'crypto';
  status: 'unpaid' | 'paid' | 'failed';
  splits?: {
    userId: string;
    amount: number;
  }[];
  tip?: number;
  createdAt: Date;
}