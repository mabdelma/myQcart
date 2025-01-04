import React, { useState, useEffect } from 'react';
import { getDB } from '../../../lib/db';
import type { Payment, Order, MenuCategory } from '../../../lib/db/schema';
import { RevenueBreakdown } from './RevenueBreakdown';
import { PaymentsList } from './PaymentsList';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { ErrorMessage } from '../../ui/ErrorMessage';

export function FinancialInsights() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [revenueData, setRevenueData] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    paymentMethods: { card: 0, cash: 0, wallet: 0 },
    byCategory: [] as { name: string; amount: number }[]
  });

  useEffect(() => {
    loadData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const db = await getDB();
      const [allPayments, allOrders, categories] = await Promise.all([
        db.getAll('payments'),
        db.getAll('orders'),
        db.getAll('menu_categories')
      ]);

      // Create orders lookup
      const ordersMap = Object.fromEntries(
        allOrders.map(order => [order.id, order])
      );

      // Calculate time-based revenues
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const completedPayments = allPayments.filter(p => p.status === 'paid');
      
      const dailyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= today)
        .reduce((sum, p) => sum + p.amount, 0);

      const weeklyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= weekAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthlyRevenue = completedPayments
        .filter(p => new Date(p.createdAt) >= monthAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate payment method distribution
      const paymentMethods = completedPayments.reduce((acc, payment) => ({
        ...acc,
        [payment.method]: acc[payment.method as keyof typeof acc] + 1
      }), { card: 0, cash: 0, wallet: 0 });

      // Calculate revenue by category
      const revenueByCategory = categories
        .filter(cat => cat.type === 'main')
        .map(category => {
          const amount = completedPayments
            .filter(p => {
              const order = ordersMap[p.orderId];
              return order?.items.some(item => item.menuItemId === category.id);
            })
            .reduce((sum, p) => sum + p.amount, 0);

          return {
            name: category.name,
            amount
          };
        })
        .sort((a, b) => b.amount - a.amount);

      setPayments(allPayments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setOrders(ordersMap);
      setRevenueData({
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        paymentMethods,
        byCategory: revenueByCategory
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load financial data:', err);
      setError('Failed to load financial insights');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <RevenueBreakdown />
      
      <PaymentsList
        payments={payments.slice(0, 10)} // Show last 10 payments
        orders={orders}
      />
    </div>
  );
}