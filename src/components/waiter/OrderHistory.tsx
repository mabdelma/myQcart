import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Search, Filter } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem, Table } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { OrderDetails } from '../shared/OrderDetails';

type OrderWithDetails = Order & {
  items: Array<{
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
  }>;
};

export function OrderHistory() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    avgServiceTime: 0,
    completionRate: 0,
    totalSales: 0
  });
  const { state: authState } = useAuth();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    if (!authState.user) return;

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

      // Get all orders handled by this waiter
      const waiterOrders = allOrders
        .filter(order => order.waiterStaffId === authState.user?.id)
        .map(order => ({
          ...order,
          items: order.items.map(item => ({
            ...item,
            menuItem: menuItemsMap[item.menuItemId]
          }))
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate metrics
      const completedOrders = waiterOrders.filter(order => 
        ['delivered', 'paid'].includes(order.status)
      );

      const totalServiceTime = completedOrders.reduce((sum, order) => {
        const startTime = new Date(order.createdAt).getTime();
        const endTime = new Date(order.updatedAt).getTime();
        return sum + ((endTime - startTime) / 60000);
      }, 0);

      setMetrics({
        totalOrders: waiterOrders.length,
        avgServiceTime: completedOrders.length > 0 
          ? totalServiceTime / completedOrders.length 
          : 0,
        completionRate: waiterOrders.length > 0
          ? (completedOrders.length / waiterOrders.length) * 100
          : 0,
        totalSales: completedOrders.reduce((sum, order) => sum + order.total, 0)
      });

      setOrders(waiterOrders);
      setTables(tablesMap);
      setError(null);
    } catch (err) {
      console.error('Failed to load order history:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'paid' && !['delivered'].includes(order.status)) return false;
      if (statusFilter === 'active' && ['delivered'].includes(order.status)) return false;
    }
    
    // Time filter
    const orderTime = new Date(order.createdAt).getTime();
    const now = Date.now();
    if (timeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (orderTime < today.getTime()) return false;
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (orderTime < weekAgo.getTime()) return false;
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      if (orderTime < monthAgo.getTime()) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const table = tables[order.tableId];
      const tableMatch = table && table.number.toString().includes(query);
      const itemsMatch = order.items.some(item => 
        item.menuItem.name.toLowerCase().includes(query)
      );
      return tableMatch || itemsMatch;
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#5C4033]">Order History</h2>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-xl font-bold text-[#5C4033]">{metrics.totalOrders}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Avg Service Time</p>
              <p className="text-xl font-bold text-[#5C4033]">
                {metrics.avgServiceTime.toFixed(1)} min
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-xl font-bold text-[#5C4033]">
                {metrics.completionRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-bold text-[#5C4033]">
                ${metrics.totalSales.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Refresh History
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search orders by table or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="active">Active</option>
            </select>
          </div>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          const orderAge = Math.floor(
            (Date.now() - new Date(order.createdAt).getTime()) / 60000
          );
          const table = tables[order.tableId];

          return (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Table {table?.number || '?'}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">
                        {orderAge} min ago
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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

                <div className="space-y-2 mb-4">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.menuItem.id} className="flex justify-between items-center">
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
                  {order.items.length > 3 && (
                    <div className="text-sm text-gray-500 italic">
                      +{order.items.length - 3} more items...
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between font-medium">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
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

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' || timeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Your order history will appear here'}
          </p>
        </div>
      )}
    </div>
  );
}