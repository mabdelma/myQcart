import React from 'react';
import { Clock, AlertTriangle, Check, Ban, ChefHat, Truck } from 'lucide-react';
import type { Order, MenuItem, Table } from '../../../lib/db/schema';

interface OrderListProps {
  orders: Order[];
  menuItems: Record<string, MenuItem>;
  tables: Record<string, Table>;
  onViewDetails: (order: Order) => void;
  onStatusChange: (orderId: string, status: Order['status']) => void;
  onCancelOrder: (orderId: string) => void;
}

export function OrderList({
  orders,
  menuItems,
  tables,
  onViewDetails,
  onStatusChange,
  onCancelOrder
}: OrderListProps) {
  function getOrderAge(createdAt: Date): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  }

  function isOrderDelayed(order: Order): boolean {
    const age = getOrderAge(order.createdAt);
    return age > 15 && order.status !== 'delivered' && order.status !== 'paid';
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => {
        const orderAge = getOrderAge(order.createdAt);
        const isDelayed = isOrderDelayed(order);
        const table = tables[order.tableId];
        
        return (
          <div
            onClick={() => onViewDetails(order)}
            key={order.id}
            className={`bg-white rounded-lg shadow-sm border-l-4 ${
              isDelayed
                ? 'border-red-500'
                : order.status === 'pending'
                ? 'border-yellow-500'
                : order.status === 'preparing'
                ? 'border-blue-500'
                : order.status === 'ready'
                ? 'border-green-500'
                : 'border-gray-500'
            } cursor-pointer hover:shadow-md transition-shadow`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Table {table?.number || order.tableId}
                  </h3>
                  <div className="flex items-center mt-1">
                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-500">
                      {orderAge} min ago
                    </span>
                    {isDelayed && (
                      <span className="ml-2 flex items-center text-red-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Delayed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : order.status === 'preparing'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'delivered'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : order.paymentStatus === 'partially'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => {
                  const menuItem = menuItems[item.menuItemId];
                  return menuItem ? (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-gray-600">{menuItem.name}</span>
                        <span className="text-sm text-gray-400 mx-2">×</span>
                        <span className="text-gray-900">{item.quantity}</span>
                      </div>
                      <span className="text-gray-600">
                        ${(menuItem.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ) : null;
                })}
                <div className="pt-2 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onStatusChange(order.id, 'preparing')}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                      <ChefHat className="w-4 h-4 mr-2" />
                      Start Preparing
                    </button>
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'ready')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'delivered')}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}