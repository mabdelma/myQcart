import React, { useEffect, useState } from 'react';
import { getDB } from '../../../lib/db';
import type { Order } from '../../../lib/db/schema';

export function RevenueChart() {
  const [data, setData] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const db = await getDB();
      const orders = await db.getAll('orders');
      
      // Group orders by date and calculate revenue
      const revenueByDate = orders.reduce((acc, order) => {
        const date = new Date(order.createdAt).toLocaleDateString();
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
      }, {} as Record<string, number>);

      // Convert to array and sort by date
      const chartData = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7); // Last 7 days

      setData(chartData);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;
  
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No revenue data available
      </div>
    );
  }

  // Calculate chart dimensions
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const chartHeight = 200;
  const barWidth = 40;
  const gap = 20;

  return (
    <div className="relative h-64">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500">
        <span>${maxRevenue.toFixed(0)}</span>
        <span>${(maxRevenue / 2).toFixed(0)}</span>
        <span>$0</span>
      </div>

      {/* Chart area */}
      <div className="ml-16 h-full flex items-end space-x-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="w-10 bg-indigo-500 rounded-t transition-all duration-300 hover:bg-indigo-600"
              style={{
                height: `${(item.revenue / maxRevenue) * chartHeight}px`
              }}
            />
            <span className="mt-2 text-xs text-gray-500 -rotate-45 origin-top-left">
              {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}