import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Clock, DollarSign, CreditCard, Wallet } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: DollarSign },
  { id: 'card', name: 'Credit Card', icon: CreditCard },
  { id: 'wallet', name: 'Digital Wallet', icon: Wallet }
] as const;

export function TableOrders() {
  const { tableId } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<Table | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [tableId]);

  async function loadOrders() {
    if (!tableId) return;

    try {
      const db = await getDB();
      const [allOrders, allMenuItems, tableData] = await Promise.all([
        db.getAll('orders'),
        db.getAll('menu_items'),
        db.get('tables', tableId)
      ]);

      setTable(tableData);
      // Create a lookup map for menu items
      const menuItemsMap = Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      );

      // Filter orders for this table
      const tableOrders = allOrders
        .filter(order => order.tableId === tableId)
        .filter(order => order.paymentStatus !== 'paid') // Keep delivered orders that aren't paid
        .sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setOrders(tableOrders);
      setMenuItems(menuItemsMap);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment(order: Order, method: string) {
    setProcessingPayment(true);
    try {
      const db = await getDB();
      
      // Create payment record
      const payment = {
        id: crypto.randomUUID(),
        orderId: order.id,
        amount: order.total,
        method: method as 'cash' | 'card' | 'wallet', 
        status: 'paid',
        createdAt: new Date()
      };

      // Update order status
      const updatedOrder = {
        ...order,
        status: 'delivered',
        paymentStatus: 'paid',
        updatedAt: new Date()
      };

      // Save both records
      const tx = db.transaction(['orders', 'payments'], 'readwrite');
      await Promise.all([
        tx.objectStore('orders').put(updatedOrder),
        tx.objectStore('payments').add(payment)
      ]);
      await tx.done;

      loadOrders();
      setPayingOrder(null);
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Payment failed:', error);
      throw error; // Re-throw to trigger error handling
    } finally {
      setProcessingPayment(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (table && table.status !== 'occupied') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Table Not Available</h2>
        <p className="text-gray-600">
          Please wait for a staff member to seat you at this table before viewing orders.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Your Orders</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your order history will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'preparing'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      {order.paymentStatus === 'paid' && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                          Payment Completed
                        </span>
                      )}
                      {(order.status === 'delivered' || order.status === 'ready') && order.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => setPayingOrder(order)}
                          className="ml-4 px-3 py-1 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
                        >
                          Pay Now
                        </button>
                      )}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Payment for Order #{payingOrder.id.slice(0, 8)}</h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Total Amount:</p>
              <p className="text-3xl font-bold text-[#8B4513]">${payingOrder.total.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Select Payment Method:</p>
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'border-[#8B4513] bg-[#F5DEB3] bg-opacity-20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3 text-[#8B4513]" />
                      <span className="font-medium">{method.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setPayingOrder(null);
                  setSelectedPaymentMethod(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedPaymentMethod && handlePayment(payingOrder, selectedPaymentMethod)}
                disabled={!selectedPaymentMethod || processingPayment}
                className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}