import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, AlertTriangle, Check } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem, Table } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { OrderEditDialog } from '../orders/OrderEditDialog';
import { OrderDetails } from '../shared/OrderDetails';

type OrderWithDetails = Order & {
  items: Array<{
    id: string;
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
  }>;
};

export function OrdersList() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const { state: authState } = useAuth();

  async function handleCancelOrder(orderId: string) {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const db = await getDB();
      await db.delete('orders', orderId);
      loadOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setError('Failed to cancel order');
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const db = await getDB();
      const [allOrders, allMenuItems, allTables] = await Promise.all([
        db.getAll('orders'),
        db.getAll('menu_items'),
        db.getAll('tables')
      ]);

      // Create lookup maps
      const menuItemsMap = Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      );
      const tablesMap = Object.fromEntries(
        allTables.map(table => [table.id, table])
      );

      // Transform orders with menu item details
      const ordersWithDetails = allOrders
        .filter(order => order.status !== 'delivered')
        .map(order => ({
          ...order,
          items: order.items.map(item => ({
            ...item,
            menuItem: menuItemsMap[item.menuItemId]
          }))
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(ordersWithDetails);
      setMenuItems(menuItemsMap);
      setTables(tablesMap);
      setError(null);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId: string, status: Order['status']) {
    try {
      const db = await getDB();
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await db.put('orders', {
        ...order,
        status,
        updatedAt: new Date()
      });
      loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#5C4033]">Active Orders</h2>
        <button
          onClick={() => loadOrders()}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Refresh Orders
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => {
          const orderAge = Math.floor(
            (Date.now() - new Date(order.createdAt).getTime()) / 60000
          );
          const isDelayed = orderAge > 15;
          const table = tables[order.tableId];

          return (
            <div
              key={order.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${
                isDelayed ? 'border-red-500' : 'border-[#8B4513]'
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Table {table?.number || '?'}
                    </h3>
                    <div className="mt-2 flex space-x-2">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'preparing'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'ready'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : order.paymentStatus === 'partially'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                      </span>
                    </div>
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
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-gray-600">{item.menuItem.name}</span>
                        <span className="text-sm text-gray-400 mx-2">×</span>
                        <span className="text-gray-900">{item.quantity}</span>
                      </div>
                      <span className="text-gray-600">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between font-medium">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Edit Order
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Cancel Order
                  </button>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    View Details
                  </button>
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      <span className="flex items-center justify-center">
                        <Check className="w-5 h-5 mr-2" />
                        Mark as Delivered
                      </span>
                    </button>
                  )}
                </div>
                {order.paymentStatus === 'paid' && (
                  <div className="text-sm text-green-600 mt-1">
                    Payment Completed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingOrder && (
        <OrderEditDialog
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdate={loadOrders}
        />
      )}

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {orders.length === 0 && (
        <div className="text-center py-12">
          <Check className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            All orders have been delivered
          </p>
        </div>
      )}
    </div>
  );
}