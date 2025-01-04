import React, { useState, useEffect } from 'react';
import { getDB } from '../../../lib/db';
import type { Order, Payment, MenuCategory, MenuItem } from '../../../lib/db/schema';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { ErrorMessage } from '../../ui/ErrorMessage';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

export function RevenueBreakdown() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    paymentMethods: { card: 0, cash: 0, wallet: 0 },
    revenueByCategory: [] as { name: string; amount: number }[]
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const db = await getDB();
      const [orders, payments, categories, menuItems] = await Promise.all([
        db.getAll('orders'),
        db.getAll('payments'),
        db.getAll('menu_categories'),
        db.getAll('menu_items')
      ]);

      // Calculate time ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      // Create menu items lookup
      const menuItemsMap = Object.fromEntries(menuItems.map(item => [item.id, item]));

      // Filter completed payments
      const completedPayments = payments.filter(p => p.status === 'completed');

      // Calculate revenues
      const dailyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= today)
        .reduce((sum, p) => sum + p.amount, 0);

      const weeklyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= weekAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthlyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= monthAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate payment methods distribution
      const paymentMethods = completedPayments.reduce((acc, payment) => ({
        ...acc,
        [payment.method]: acc[payment.method as keyof typeof acc] + 1
      }), { card: 0, cash: 0, wallet: 0 });

      // Calculate revenue by category
      const mainCategories = categories.filter(cat => cat.type === 'main');
      const revenueByCategory = mainCategories.map(category => {
        const amount = orders
          .filter(order => order.paymentStatus === 'paid')
          .reduce((sum, order) => {
            const categoryTotal = order.items.reduce((itemSum, item) => {
              const menuItem = menuItemsMap[item.menuItemId];
              if (menuItem && menuItem.mainCategoryId === category.id) {
                return itemSum + (menuItem.price * item.quantity);
              }
              return itemSum;
            }, 0);
            return sum + categoryTotal;
          }, 0);

        return {
          name: category.name,
          amount
        };
      }).sort((a, b) => b.amount - a.amount);

      setData({
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        paymentMethods,
        revenueByCategory
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const totalPayments = Object.values(data.paymentMethods).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Time-based Revenue */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Revenue Overview</h3>
          <Calendar className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Today</span>
            <span className="text-lg font-medium text-gray-900 tabular-nums">
              ${data.dailyRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">This Week</span>
            <span className="text-lg font-medium text-gray-900 tabular-nums">
              ${data.weeklyRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">This Month</span>
            <span className="text-lg font-medium text-gray-900 tabular-nums">
              ${data.monthlyRevenue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          <DollarSign className="w-6 h-6 text-green-500" />
        </div>
        <div className="space-y-4">
          {Object.entries(data.paymentMethods).map(([method, count]) => (
            <div key={method} className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {method}
                </span>
                <span className="text-sm text-gray-500">
                  {totalPayments > 1 ? `${((count / totalPayments) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`rounded-full h-2 ${
                    method === 'card'
                      ? 'bg-blue-500'
                      : method === 'cash'
                      ? 'bg-green-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: totalPayments > 1 ? `${(count / totalPayments) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
          {totalPayments <= 1 && (
            <div className="text-center text-gray-500 py-4">
              No payment data available
            </div>
          )}
        </div>
      </div>

      {/* Category Revenue */}
      <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Revenue by Category</h3>
          <TrendingUp className="w-6 h-6 text-purple-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.revenueByCategory.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No revenue data available
          </div>
        ) : (
          data.revenueByCategory.map((category) => (
            <div key={category.name} className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {category.name}
              </h4>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                ${category.amount.toFixed(2)}
              </p>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}