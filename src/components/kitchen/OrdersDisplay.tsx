import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, AlertTriangle, ChefHat } from 'lucide-react';
import { getDB } from '../../lib/db';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OrderDetails } from './OrderDetails';
import { ErrorMessage } from '../ui/ErrorMessage';
import { updateStaffMetrics } from '../../lib/utils/staffMetrics';
import type { Order, MenuItem, Table } from '../../lib/db/schema';

type OrderWithItems = Order & {
  items: Array<{
    id: string;
    menuItem: MenuItem;
    quantity: number;
  }>;
};

type OrderStatus = 'pending' | 'preparing' | 'ready';

export function OrdersDisplay() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time');
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const { state: authState } = useAuth();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const db = await getDB();
      const [allOrders, allMenuItems, allTables, currentUser] = await Promise.all([
        db.getAll('orders'),
        db.getAll('menu_items'),
        db.getAll('tables'),
        db.get('users', authState.user?.id || '')
      ]);

      if (!currentUser) {
        throw new Error('User not found');
      }
      // Create a lookup map for menu items
      const menuItemsMap = Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      );
      
      // Create a lookup map for tables
      const tablesMap = Object.fromEntries(
        allTables.map(table => [table.id, table])
      );

      // Filter and transform orders
      const activeOrders = allOrders
        .filter(order => {
          // Show orders that are either:
          // 1. Not delivered
          // 2. Not assigned to any kitchen staff yet or assigned to this kitchen staff
          return (order.status !== 'delivered' && 
                 (!order.kitchenStaffId || order.kitchenStaffId === currentUser.id));
        })
        .map(order => ({
          ...order,
          items: order.items
            .map(item => {
              const menuItem = menuItemsMap[item.menuItemId];
              if (!menuItem) return null;
              return {
                ...item,
                menuItem
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
        }))
        .sort((a, b) => {
          if (sortBy === 'priority') {
            // Priority sorting: pending first, then by time
            if (a.status !== b.status) {
              return a.status === 'pending' ? -1 : 1;
            }
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      setOrders(activeOrders);
      setMenuItems(menuItemsMap);
      setTables(tablesMap);
      setError(null);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!authState.user) {
      setError('You must be logged in to update orders');
      return;
    }
    
    if (authState.user.role !== 'kitchen') {
      setError('Only kitchen staff can update order status');
      return;
    }

    try {
      const db = await getDB();

      const existingOrder = orders.find(o => o.id === orderId);
      if (!existingOrder) {
        throw new Error('Order not found');
      }
      
      // Assign kitchen staff when starting preparation
      if (status === 'preparing' && !existingOrder.kitchenStaffId) { 
        existingOrder.kitchenStaffId = authState.user.id;
      } else if (existingOrder.kitchenStaffId && existingOrder.kitchenStaffId !== authState.user.id) {
        throw new Error('This order is assigned to another kitchen staff member');
      }
      
      const updatedOrder = {
        ...existingOrder,
        kitchenStaffId: existingOrder.kitchenStaffId || authState.user.id,
        waiterStaffId: existingOrder.waiterStaffId || null,
        status,
        updatedAt: new Date(),
        completedAt: status === 'ready' ? new Date() : existingOrder.completedAt
      };
      
      await db.put('orders', updatedOrder);
      
      // Update staff metrics when order is ready
      if (status === 'ready') {
        await updateStaffMetrics(authState.user.id, updatedOrder);
      }
      
      loadOrders();
      setError(null);
    } catch (error) {
      console.error('Failed to update order status:', error);
      setError('Failed to update order status. Please try again.');
    }
  }

  function getOrderAge(createdAt: Date) {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return minutes;
  }

  function getStatusColor(status: OrderStatus) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#5C4033]">Active Orders</h2>
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'priority')}
            className="rounded-md border-gray-300 text-[#5C4033] focus:border-[#8B4513] focus:ring-[#8B4513]"
          >
            <option value="time">Sort by Time</option>
            <option value="priority">Sort by Priority</option>
          </select>
          <button
            onClick={() => loadOrders()}
            className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
          >
            Refresh Orders
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => {
          const orderAge = getOrderAge(order.createdAt);
          const isDelayed = orderAge > 15;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${
                isDelayed ? 'border-red-500' : 'border-[#8B4513]'
              }`}
            >
              <div 
                className="p-4"
                onClick={(e) => {
                  // Only show details if not clicking buttons
                  if (!(e.target as HTMLElement).closest('button')) {
                    setSelectedOrder(order);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Order #{order.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Table {tables[order.tableId]?.number || '?'}
                    </p>
                    <div className="flex items-center mt-1">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">
                        {orderAge} min ago
                      </span>
                      {isDelayed && (
                        <span className="ml-2 flex items-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Delayed
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getStatusColor(order.status as OrderStatus)
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item) => {
                    const menuItem = menuItems[item.menuItemId];
                    return menuItem ? (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-6 h-6 flex items-center justify-center bg-[#F5DEB3] text-[#8B4513] rounded-full text-sm font-medium">
                            {item.quantity}
                          </span>
                          <span className="ml-2 text-gray-900">{menuItem.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, 'preparing');
                      }}
                      className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-md hover:bg-[#5C4033]"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateOrderStatus(order.id, 'ready');
                      }}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Mark as Ready
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {orders.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            New orders will appear here automatically
          </p>
        </div>
      )}
    </div>
  );
}