import React, { useState, useEffect } from 'react';
import { getDB } from '../../../lib/db';
import type { User, Order } from '../../../lib/db/schema';
import { StaffStats } from './StaffStats';
import { StaffList } from './StaffList';
import { generateStaffReport } from '../../../lib/utils/exportReports';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { ErrorMessage } from '../../ui/ErrorMessage';
import { FileDown } from 'lucide-react';

interface StaffMetrics {
  ordersHandled: number;
  avgServiceTime: number;
  totalSales: number;
  rating: number;
}

export function StaffPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffMetrics, setStaffMetrics] = useState<Record<string, StaffMetrics>>({});
  const [staff, setStaff] = useState<User[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadStaffData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadStaffData, 300000);
    return () => clearInterval(interval);
  }, [timeRange]);

  async function loadStaffData() {
    try {
      const db = await getDB();
      const [users, orders] = await Promise.all([
        db.getAll('users'),
        db.getAll('orders')
      ]);

      // Filter staff by role
      const staffMembers = users.filter(
        user => ['waiter', 'kitchen', 'cashier'].includes(user.role)
      );

      // Calculate time range
      const now = new Date();
      const rangeStart = new Date();
      if (timeRange === 'day') {
        rangeStart.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        rangeStart.setDate(now.getDate() - 7);
      } else {
        rangeStart.setMonth(now.getMonth() - 1);
      }

      // Calculate metrics for each staff member
      const metrics: Record<string, StaffMetrics> = {};
      
      staffMembers.forEach(staff => {
        const staffOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return (
            order.userId === staff.id &&
            orderDate >= rangeStart &&
            orderDate <= now
          );
        });

        const serviceTimes = staffOrders.map(order => {
          const start = new Date(order.createdAt).getTime();
          const end = new Date(order.updatedAt).getTime();
          return (end - start) / 60000; // minutes
        });

        metrics[staff.id] = {
          ordersHandled: staffOrders.length,
          avgServiceTime: serviceTimes.length > 0
            ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
            : 0,
          totalSales: staffOrders.reduce((sum, order) => sum + order.total, 0),
          rating: calculateStaffRating(staffOrders)
        };
      });

      setStaff(staffMembers);
      setStaffMetrics(metrics);
      setError(null);
    } catch (err) {
      console.error('Failed to load staff data:', err);
      setError('Failed to load staff performance data');
    } finally {
      setLoading(false);
    }
  }

  function calculateStaffRating(orders: Order[]): number {
    if (orders.length === 0) return 0;

    // Calculate rating based on:
    // 1. Order completion time (40%)
    // 2. Number of orders handled (30%)
    // 3. Order accuracy (30%)

    const avgCompletionTime = orders.reduce((sum, order) => {
      const time = (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60000;
      return sum + time;
    }, 0) / orders.length;

    const completionScore = Math.min(1, 30 / avgCompletionTime) * 4; // Score out of 4
    const volumeScore = Math.min(1, orders.length / 20) * 3; // Score out of 3
    const accuracyScore = orders.filter(o => !o.hasComplaints).length / orders.length * 3; // Score out of 3

    return completionScore + volumeScore + accuracyScore;
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Performance</h2>
          <p className="text-sm text-gray-500">Monitor and analyze staff efficiency</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <button
            onClick={() => generateStaffReport(staff, staffMetrics, timeRange)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <FileDown className="w-5 h-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      <StaffStats staff={staff} metrics={staffMetrics} />
      <StaffList staff={staff} metrics={staffMetrics} />
    </div>
  );
}