import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, AlertTriangle, ChefHat } from 'lucide-react';
import { orderApi, tableApi, menuApi } from '../../lib/api';
import type { Order, TableData, MenuItem, MenuCategory } from '../../lib/api/types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OrderDetails } from './OrderDetails';
import { ErrorMessage } from '../ui/ErrorMessage';

interface OrderWithItems extends Order {
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

type OrderStatus = 'pending' | 'preparing' | 'ready';

export function OrdersDisplay() {
  const { state: authState } = useAuth();
  const slug = authState.tenant?.slug;
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [tables, setTables] = useState<Record<string, TableData>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time');

  const loadOrders = useCallback(async () => {
    if (!slug) return;
    try {
      const [allOrders, allTables, menuData] = await Promise.all([
        orderApi.list(slug),
        tableApi.list(slug),
        menuApi.getFullMenu(slug),
      ]);

      const tablesMap = Object.fromEntries(allTables.map((t) => [t.id, t]));
      const menuItemsMap = Object.fromEntries(menuData.items.map((i) => [i.id, i]));

      const orderDetails = await Promise.all(
        allOrders
          .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
          .map(async (o) => {
            try {
              return await orderApi.getDetail(slug, o.id);
            } catch {
              return null;
            }
          })
      );

      const activeOrders = orderDetails
        .filter((od): od is OrderWithItems => od !== null)
        .sort((a, b) => {
          if (sortBy === 'priority') {
            if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      setOrders(activeOrders);
      setTables(tablesMap);
      setError(null);
    } catch {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [slug, sortBy]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    if (!slug) return;
    try {
      await orderApi.updateStatus(slug, orderId, status);
      await loadOrders();
    } catch {
      setError('Failed to update order status');
    }
  }

  function getOrderAge(createdAt: string) {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  }

  if (!slug) return <div className="p-4 text-gray-500">Loading...</div>;
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#5C4033]">Active Orders</h2>
        <div className="flex items-center space-x-4">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'time' | 'priority')}
            className="rounded-md border-gray-300 text-[#5C4033] focus:border-[#8B4513] focus:ring-[#8B4513]">
            <option value="time">Sort by Time</option>
            <option value="priority">Sort by Priority</option>
          </select>
          <button onClick={loadOrders}
            className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]">Refresh Orders</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => {
          const orderAge = getOrderAge(order.createdAt);
          const isDelayed = orderAge > 15;
          return (
            <div key={order.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${isDelayed ? 'border-red-500' : 'border-[#8B4513]'}`}>
              <div className="p-4" onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) setSelectedOrder(order); }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-500">Table {tables[order.tableId]?.number || '?'}</p>
                    <div className="flex items-center mt-1">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">{orderAge} min ago</span>
                      {isDelayed && <span className="ml-2 flex items-center text-red-600"><AlertTriangle className="w-4 h-4 mr-1" />Delayed</span>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {(order as any).items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-[#F5DEB3] text-[#8B4513] rounded-full text-sm font-medium">{item.quantity}</span>
                        <span className="ml-2 text-gray-900">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'preparing'); }}
                      className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-md hover:bg-[#5C4033]">Start Preparing</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Mark as Ready</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedOrder && <OrderDetails order={selectedOrder as any} onClose={() => setSelectedOrder(null)} />}

      {orders.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
          <p className="mt-1 text-sm text-gray-500">New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
}
