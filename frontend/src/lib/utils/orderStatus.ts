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
  customizations?: {
    name: string;
    selected: string;
    price?: number;
  }[];
  notes?: string;
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

export async function updateOrderStatus(params: {
  orderId: string;
  status: Order['status'];
  userId: string;
  userRole: User['role'];
}): Promise<void> {
  const { orderId, status, userId, userRole } = params;
  const db = await getDB();

  try {
    const order = await db.get('orders', orderId);
    
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    // Validate status transition based on role
    const validTransition = validateStatusTransition(order.status, status, userRole);
    if (!validTransition) {
      console.error('Invalid status transition:', {
        from: order.status,
        to: status,
        role: userRole
      });
      return;
    }

    const updatedOrder = {
      ...order,
      status,
      updatedAt: new Date()
    };

    // Update staff assignment based on role
    switch (userRole) {
      case 'kitchen':
        updatedOrder.kitchenStaffId = userId;
        break;
      case 'waiter':
        updatedOrder.waiterStaffId = userId;
        break;
      case 'cashier':
        updatedOrder.cashierId = userId;
        break;
    }

    await db.put('orders', updatedOrder);
    
    // Update staff metrics after status change
    await updateStaffMetrics(userId);
  } catch (error) {
    console.error('Failed to update order status:', {
      orderId,
      status,
      userId,
      userRole,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

function validateStatusTransition(
  currentStatus: Order['status'],
  newStatus: Order['status'],
  userRole: User['role']
): boolean {
  const validTransitions: Record<User['role'], Record<Order['status'], Order['status'][]>> = {
    kitchen: {
      pending: ['preparing'],
      preparing: ['ready'],
      ready: [],
      delivered: []
    },
    waiter: {
      pending: [],
      preparing: [],
      ready: ['delivered'],
      delivered: []
    },
    cashier: {
      pending: [],
      preparing: [],
      ready: [],
      delivered: ['paid']
    },
    admin: {
      pending: ['preparing', 'ready', 'delivered'],
      preparing: ['ready', 'delivered'],
      ready: ['delivered'],
      delivered: ['paid']
    },
    customer: {}
  };

  return validTransitions[userRole][currentStatus]?.includes(newStatus) ?? false;
}