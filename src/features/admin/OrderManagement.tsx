import { useState, useEffect } from 'react';
import { Clock, Check, ChefHat, Ban, FileDown } from 'lucide-react';
import { orderApi, invoiceApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Order } from '../../lib/api/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Check,
  delivered: Check,
  cancelled: Ban,
};

export function OrderManagement() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    orderApi.list(slug, filter || undefined)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, filter]);

  async function updateStatus(orderId: string, status: string) {
    if (!slug) return;
    try {
      await orderApi.updateStatus(slug, orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as Order['status'] } : o));
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  }

  if (!slug) return <div className="p-4 text-gray-500">Loading tenant...</div>;
  if (loading) return <div className="p-4 text-gray-500">Loading orders...</div>;

  const filters = ['', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
              filter === f ? 'bg-[#8B4513] text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const StatusIcon = statusIcons[order.status] || Clock;
          return (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    Order #{order.id.slice(0, 8)}
                    {order.customerName && <span className="text-gray-500 ml-2">- {order.customerName}</span>}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {order.orderType === 'dine_in' ? `Table ${order.tableId?.slice(0, 8) || '?'}` : order.orderType === 'takeout' ? 'Takeout' : 'Delivery'} · {order.itemCount} items
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${statusColors[order.status]}`}>
                    <StatusIcon className="w-4 h-4 mr-1" />
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">${order.total.toFixed(2)}</span>
                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button onClick={() => updateStatus(order.id, 'preparing')}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateStatus(order.id, 'ready')}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">
                      Mark Delivered
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'preparing') && (
                    <button onClick={() => updateStatus(order.id, 'cancelled')}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => invoiceApi.download(slug!, order.id)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 flex items-center gap-1"
                    title="Download Invoice">
                    <FileDown className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <p className="text-center text-gray-500 py-12">No orders found.</p>
      )}
    </div>
  );
}
