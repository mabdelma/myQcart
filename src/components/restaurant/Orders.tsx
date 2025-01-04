import React, { useState, useEffect } from 'react';
import { Package, Clock } from 'lucide-react';
import { getDB } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import type { Order, MenuItem } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { state: authState } = useAuth();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const db = await getDB();
      const [allOrders, allMenuItems] = await Promise.all([
        db.getAll('orders'),
        db.getAll('menu_items')
      ]);

      // Create a lookup map for menu items
      const menuItemsMap = Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      );

      setOrders(allOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setMenuItems(menuItemsMap);
      setError(null);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[#5C4033]">Your Orders</h2>
        <button
          onClick={() => loadOrders()}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Refresh Orders
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your order history will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${
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
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const menuItem = menuItems[item.menuItemId];
                    return menuItem ? (
                      <div key={item.id} className="py-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center">
                              <span className="text-gray-600">{menuItem.name}</span>
                              <span className="text-sm text-gray-400 mx-2">×</span>
                              <span className="text-gray-900">{item.quantity}</span>
                            </div>
                            {item.notes && (
                              <div className="mt-1 text-sm text-gray-600 italic">
                                "{item.notes}"
                              </div>
                            )}
                          </div>
                          <span className="text-gray-600">
                            ${(menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}