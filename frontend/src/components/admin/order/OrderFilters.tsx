import React from 'react';
import { Search, Filter, Clock } from 'lucide-react';

interface OrderFiltersProps {
  statusFilter: string;
  searchQuery: string;
  timeFilter: string;
  paymentFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onTimeFilterChange: (time: string) => void;
  onPaymentFilterChange: (status: string) => void;
}

export function OrderFilters({
  statusFilter,
  searchQuery,
  timeFilter,
  paymentFilter,
  onStatusFilterChange,
  onSearchChange,
  onTimeFilterChange,
  onPaymentFilterChange
}: OrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search orders by table or items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Payments</option>
            <option value="unpaid">Unpaid Orders</option>
            <option value="partially">Partially Paid</option>
            <option value="paid">Fully Paid</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <select
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="hour">Last Hour</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
      </div>
    </div>
  );
}