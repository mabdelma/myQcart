import React, { useEffect, useState } from 'react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem, Payment, Table } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { 
  Clock, TrendingUp, DollarSign, Users, AlertTriangle 
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { RevenueChart } from './charts/RevenueChart';
import { OrdersTimeline } from './charts/OrdersTimeline';
import { FinancialInsights } from './finance/FinancialInsights';

interface AnalyticsData {
  totalSales: number;
  todaysSales: number;
  averagePreparationTime: number;
  popularItems: { name: string; count: number }[];
  recentOrders: Order[];
  activeTables: number;
  totalTables: number;
  paymentMethods: {
    card: number;
    cash: number;
    wallet: number;
  };
  delayedOrders: number;
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  
  const defaultAnalytics: AnalyticsData = {
    totalSales: 0,
    todaysSales: 0,
    averagePreparationTime: 0,
    popularItems: [] as { name: string; count: number }[],
    recentOrders: [] as Order[],
    activeTables: 0,
    totalTables: 0,
    paymentMethods: {
      card: 0,
      cash: 0,
      wallet: 0
    },
    delayedOrders: 0
  };

  useEffect(() => {
    loadAnalytics();
    // Refresh analytics every 5 minutes
    const interval = setInterval(loadAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      const db = await getDB();
      const [orders, menuItems, payments, tables] = await Promise.all([
        db.getAll('orders'),
        db.getAll('menu_items'),
        db.getAll('payments'),
        db.getAll('tables')
      ]);

      // Calculate total sales
      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      
      // Calculate today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysSales = orders
        .filter(order => new Date(order.createdAt) >= today)
        .reduce((sum, order) => sum + order.total, 0);

      // Calculate average preparation time
      const prepTimes = orders.map(order => {
        const created = new Date(order.createdAt).getTime();
        const updated = new Date(order.updatedAt).getTime();
        return (updated - created) / 1000 / 60; // minutes
      });
      const avgPrepTime = prepTimes.length > 0 
        ? prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length 
        : 0;

      // Calculate active and total tables
      const activeTables = tables.filter(table => table.status === 'occupied').length;
      const totalTables = tables.length;

      // Calculate payment methods distribution
      const paymentMethods = payments.reduce((acc, payment) => ({
        ...acc,
        [payment.method]: acc[payment.method as keyof typeof acc] + 1
      }), { card: 0, cash: 0, wallet: 0 });

      // Calculate delayed orders
      const delayedOrders = orders.filter(order => {
        const orderAge = (Date.now() - new Date(order.createdAt).getTime()) / 1000 / 60;
        return orderAge > 15 && order.status !== 'delivered' && order.status !== 'paid';
      }).length;
      // Calculate popular items
      const itemCounts = new Map<string, number>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const count = itemCounts.get(item.menuItemId) || 0;
          itemCounts.set(item.menuItemId, count + item.quantity);
        });
      });

      const popularItems = await Promise.all(
        Array.from(itemCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(async ([id, count]) => {
            const item = menuItems.find(item => item.id === id);
            return { name: item?.name || 'Unknown', count };
          })
      );

      setAnalytics({
        totalSales,
        todaysSales,
        averagePreparationTime: avgPrepTime,
        popularItems,
        recentOrders: orders.slice(-5),
        activeTables,
        totalTables,
        paymentMethods,
        delayedOrders
      });
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function resetAnalytics() {
    if (!confirm('Are you sure you want to reset all analytics data? This cannot be undone.')) {
      return;
    }
    
    setResetting(true);
    try {
      const db = await getDB();
      // Clear both orders and payments
      await Promise.all([
        db.clear('orders'),
        db.clear('payments')
      ]);
      setAnalytics(defaultAnalytics);
    } catch (err) {
      setError('Failed to reset analytics data');
      console.error(err);
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">Real-time overview of your restaurant's performance</p>
        </div>
        <button
          onClick={resetAnalytics}
          disabled={resetting}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {resetting ? 'Resetting...' : 'Reset Analytics'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Revenue"
          value={`$${analytics.todaysSales.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Active Tables"
          value={`${analytics.activeTables}/${analytics.totalTables}`}
          icon={Users}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Avg Prep Time"
          value={`${analytics.averagePreparationTime.toFixed(1)} min`}
          icon={Clock}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title="Delayed Orders"
          value={analytics.delayedOrders.toString()}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
        />
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
          <RevenueChart />
        </div>
      </div>

      {/* Financial Insights */}
      <FinancialInsights />
    </div>
  );
}