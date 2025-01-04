import React, { useState, useEffect } from 'react';
import { Users, Coffee, Clock, AlertTriangle } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Table, Order } from '../../lib/db/schema';

type TableWithOrders = Table & {
  activeOrder?: Order;
  orderAge?: number;
};

export function TableGrid() {
  const [tables, setTables] = useState<TableWithOrders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadTables() {
    try {
      const db = await getDB();
      const [allTables, allOrders] = await Promise.all([
        db.getAll('tables'),
        db.getAll('orders')
      ]);

      const tablesWithOrders = allTables.map(table => {
        const activeOrder = allOrders
          .filter(order => 
            order.tableId === table.id && 
            !['delivered', 'paid'].includes(order.status)
          )
          .sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

        const orderAge = activeOrder
          ? Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000)
          : undefined;

        return {
          ...table,
          activeOrder,
          orderAge
        };
      });

      setTables(tablesWithOrders.sort((a, b) => a.number - b.number));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }

  async function updateTableStatus(tableId: string, status: Table['status']) {
    try {
      const db = await getDB();
      await db.put('tables', {
        ...tables.find(t => t.id === tableId),
        status
      });
      loadTables();
    } catch (error) {
      console.error('Failed to update table status:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B4513]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#5C4033]">Table Overview</h2>
        <button
          onClick={() => loadTables()}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Refresh Tables
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-lg shadow-sm border-l-4 ${
              table.status === 'occupied'
                ? 'border-[#8B4513]'
                : table.status === 'reserved'
                ? 'border-yellow-500'
                : 'border-green-500'
            }`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Table {table.number}
                  </h3>
                  <div className="flex items-center mt-1">
                    <Users className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-500">
                      Capacity: {table.capacity}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  table.status === 'occupied'
                    ? 'bg-[#F5DEB3] text-[#8B4513]'
                    : table.status === 'reserved'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                </span>
              </div>

              {table.activeOrder && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <Coffee className="w-4 h-4 mr-1" />
                      <span>Active Order</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-gray-500">{table.orderAge} min ago</span>
                    </div>
                  </div>
                  {table.orderAge && table.orderAge > 15 && (
                    <div className="mt-2 flex items-center text-red-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-sm">Order delayed</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                {table.status === 'available' && (
                  <button
                    onClick={() => updateTableStatus(table.id, 'occupied')}
                    className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-md hover:bg-[#5C4033]"
                  >
                    Seat Guests
                  </button>
                )}
                {table.status === 'occupied' && (
                  <button
                    onClick={() => updateTableStatus(table.id, 'available')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Clear Table
                  </button>
                )}
                {table.status === 'reserved' && (
                  <>
                    <button
                      onClick={() => updateTableStatus(table.id, 'occupied')}
                      className="flex-1 bg-[#8B4513] text-white px-4 py-2 rounded-md hover:bg-[#5C4033]"
                    >
                      Seat Guests
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'available')}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}