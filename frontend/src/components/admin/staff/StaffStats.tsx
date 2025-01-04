import React from 'react';
import { Users, Clock, DollarSign, Star } from 'lucide-react';
import type { User } from '../../../lib/db/schema';
import { StatsCard } from '../StatsCard';

interface StaffStatsProps {
  staff: User[];
  metrics: Record<string, {
    ordersHandled: number;
    avgServiceTime: number;
    totalSales: number;
    rating: number;
  }>;
}

export function StaffStats({ staff, metrics }: StaffStatsProps) {
  const staffCount = Object.keys(metrics).length;

  const totalOrders = Object.values(metrics)
    .reduce((sum, m) => sum + (m.ordersHandled || 0), 0);

  const avgServiceTime = Object.values(metrics)
    .reduce((sum, m) => sum + (m.avgServiceTime || 0), 0) / (staffCount || 1);

  const totalSales = Object.values(metrics)
    .reduce((sum, m) => sum + (m.totalSales || 0), 0);

  const avgRating = Object.values(metrics)
    .reduce((sum, m) => sum + (m.rating || 0), 0) / (staffCount || 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Active Staff"
        value={`${staffCount} members`}
        icon={Users}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-100"
      />
      <StatsCard
        title="Avg Service Time"
        value={staffCount ? `${avgServiceTime.toFixed(1)} min` : '0.0 min'}
        icon={Clock}
        iconColor="text-green-500"
        iconBgColor="bg-green-100"
      />
      <StatsCard
        title="Total Sales"
        value={`$${totalSales.toFixed(2) || '0.00'}`}
        icon={DollarSign}
        iconColor="text-purple-500"
        iconBgColor="bg-purple-100"
      />
      <StatsCard
        title="Avg Performance"
        value={staffCount ? `${(avgRating * 10).toFixed(1)}%` : '0.0%'}
        icon={Star}
        iconColor="text-yellow-500"
        iconBgColor="bg-yellow-100"
      />
    </div>
  );
}