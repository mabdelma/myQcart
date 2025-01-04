import React from 'react';
import { Clock, AlertTriangle, ChefHat, Check } from 'lucide-react';
import { StatsCard } from '../StatsCard';

interface OrderStatsProps {
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  delayedOrders: number;
}

export function OrderStats({
  pendingOrders,
  preparingOrders,
  readyOrders,
  delayedOrders
}: OrderStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Pending Orders"
        value={pendingOrders.toString()}
        icon={Clock}
        iconColor="text-yellow-500"
        iconBgColor="bg-yellow-100"
      />
      <StatsCard
        title="Preparing"
        value={preparingOrders.toString()}
        icon={ChefHat}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-100"
      />
      <StatsCard
        title="Ready to Serve"
        value={readyOrders.toString()}
        icon={Check}
        iconColor="text-green-500"
        iconBgColor="bg-green-100"
      />
      <StatsCard
        title="Delayed Orders"
        value={delayedOrders.toString()}
        icon={AlertTriangle}
        iconColor="text-red-500"
        iconBgColor="bg-red-100"
      />
    </div>
  );
}