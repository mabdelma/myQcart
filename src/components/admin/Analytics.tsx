import { useEffect, useState } from 'react';
import { orderApi, paymentApi, tableApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Order, Payment, TableData } from '../../lib/api/types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Clock, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';
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
  paymentMethods: { card: number; cash: number; wallet: number };
  delayedOrders: number;
}

export function Analytics() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 300000);
    return () => clearInterval(interval);
  }, [slug]);

  async function loadAnalytics() {
    if (!slug) return;
    try {
      const [orders, payments, tables] = await Promise.all([
        orderApi.list(slug),
        paymentApi.list(slug).catch(() => [] as Payment[]),
        tableApi.list(slug),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      const todaysSales = orders
        .filter((o) => new Date(o.createdAt) >= today)
        .reduce((sum, o) => sum + o.total, 0);

      const prepTimes = orders
        .filter((o) => o.status === 'delivered' && o.completedAt)
        .map((o) => (new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime()) / 60000);
      const avgPrepTime = prepTimes.length > 0
        ? prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length
        : 0;

      const activeTables = tables.filter((t) => t.status === 'occupied').length;
      const totalTables = tables.length;

      const paymentMethods = payments.reduce(
        (acc, p) => ({ ...acc, [p.method]: (acc[p.method as keyof typeof acc] || 0) + 1 }),
        { card: 0, cash: 0, wallet: 0 }
      );

      const pendingOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');

      const delayedOrders = pendingOrders.filter((o) => {
        const age = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
        return age > 15;
      }).length;

      const itemCounts = new Map<string, number>();
      const orderDetails = await Promise.all(
        orders.slice(0, 50).map((o) =>
          orderApi.getDetail(slug, o.id).catch(() => null)
        )
      );
      orderDetails.forEach((od) => {
        if (!od?.items) return;
        od.items.forEach((item) => {
          itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.quantity);
        });
      });

      const popularItems = Array.from(itemCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setAnalytics({
        totalSales,
        todaysSales,
        averagePreparationTime: avgPrepTime,
        popularItems,
        recentOrders: orders.slice(-5),
        activeTables,
        totalTables,
        paymentMethods,
        delayedOrders,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
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
      </div>

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

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
          <RevenueChart />
        </div>
      </div>

      <FinancialInsights />
    </div>
  );
}
