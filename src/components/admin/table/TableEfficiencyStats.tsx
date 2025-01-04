import React from 'react';
import { Clock, Users, RotateCcw } from 'lucide-react';
import type { Table } from '../../../lib/db/schema';
import { StatsCard } from '../StatsCard';

interface TableEfficiencyProps {
  tables: Table[];
  averageTurnoverTime: number;
  occupancyRate: number;
  totalTurnovers: number;
}

export function TableEfficiencyStats({ 
  tables, 
  averageTurnoverTime,
  occupancyRate,
  totalTurnovers 
}: TableEfficiencyProps) {
  const availableTables = tables.filter(t => t.status === 'available').length;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Available Tables"
        value={`${availableTables}/${tables.length}`}
        icon={Users}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-100"
      />
      <StatsCard
        title="Avg Turnover Time"
        value={`${averageTurnoverTime.toFixed(0)} min`}
        icon={Clock}
        iconColor="text-green-500"
        iconBgColor="bg-green-100"
      />
      <StatsCard
        title="Occupancy Rate"
        value={`${(occupancyRate * 100).toFixed(1)}%`}
        icon={Users}
        iconColor="text-purple-500"
        iconBgColor="bg-purple-100"
      />
      <StatsCard
        title="Total Turnovers"
        value={totalTurnovers.toString()}
        icon={RotateCcw}
        iconColor="text-orange-500"
        iconBgColor="bg-orange-100"
      />
    </div>
  );
}