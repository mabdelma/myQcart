import React, { useState, useEffect } from 'react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem, Table } from '../../lib/db/schema';
import { OrderStats } from './order/OrderStats';
import { OrderFilters } from './order/OrderFilters';
import { OrderList } from './order/OrderList';
import { OrderDetails } from '../shared/OrderDetails';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    loadOrders();
    // Refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
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

      setOrders(allOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
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

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const db = await getDB();
      await db.delete('orders', orderId);
      loadOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  }

  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter) {
      if (statusFilter === 'paid') {
        if (order.paymentStatus !== 'paid') return false;
      } else if (order.status !== statusFilter) {
        return false;
      }
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      if (paymentFilter !== order.paymentStatus) return false;
    }

    // Time filter
    const orderTime = new Date(order.createdAt).getTime();
    const now = Date.now();
    if (timeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (orderTime < today.getTime()) return false;
    } else if (timeFilter === 'hour') {
      if (orderTime < now - 3600000) return false;
    } else if (timeFilter === 'delayed') {
      const age = (now - orderTime) / 60000;
      if (age <= 15 || order.paymentStatus === 'paid') return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const table = tables[order.tableId];
      const tableMatch = table && table.number.toString().includes(query);
      const itemsMatch = order.items.some(item => {
        const menuItem = menuItems[item.menuItemId];
        return menuItem && menuItem.name.toLowerCase().includes(query);
      });
      if (!tableMatch && !itemsMatch) return false;
    }

    return true;
  });

  // Calculate stats
  const stats = {
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    preparingOrders: orders.filter(o => o.status === 'preparing').length,
    readyOrders: orders.filter(o => o.status === 'ready').length,
    delayedOrders: orders.filter(o => {
      const age = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
      return age > 15 && o.status !== 'delivered' && o.status !== 'paid';
    }).length
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-sm text-gray-500">Track and manage customer orders</p>
        </div>
      </div>

      <OrderStats {...stats} />

      <OrderFilters
        statusFilter={statusFilter}
        timeFilter={timeFilter}
        searchQuery={searchQuery}
        paymentFilter={paymentFilter}
        onStatusFilterChange={setStatusFilter}
        onTimeFilterChange={setTimeFilter}
        onSearchChange={setSearchQuery}
        onPaymentFilterChange={setPaymentFilter}
      />

      <OrderList
        orders={filteredOrders}
        menuItems={menuItems}
        tables={tables}
        onViewDetails={setSelectedOrder}
        onStatusChange={handleStatusChange}
        onCancelOrder={handleCancelOrder}
      />
      
      {selectedOrder && (
        <OrderDetails
          order={{
            ...selectedOrder,
            items: selectedOrder.items.map(item => ({
              ...item,
              menuItem: menuItems[item.menuItemId]
            }))
          }}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}