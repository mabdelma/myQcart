import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Search, Filter, DollarSign, Receipt } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Order, Payment, MenuItem } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface TransactionWithDetails extends Payment {
  order: Order & {
    items: Array<{
      menuItem: MenuItem;
      quantity: number;
      notes?: string;
    }>;
  };
}

export function CashierHistory() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    avgProcessingTime: 0,
    cashPayments: 0,
    cardPayments: 0,
    walletPayments: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const { state: authState } = useAuth();

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    if (!authState.user) return;

    try {
      const db = await getDB();
      const [allPayments, allOrders, allMenuItems] = await Promise.all([
        db.getAll('payments'),
        db.getAll('orders'),
        db.getAll('menu_items')
      ]);

      // Create menu items lookup
      const menuItemsMap = Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      );

      // Get all transactions processed by this cashier
      const cashierTransactions = allPayments
        .filter(payment => {
          const order = allOrders.find(o => o.id === payment.orderId);
          return order?.cashierId === authState.user?.id;
        })
        .map(payment => {
          const order = allOrders.find(o => o.id === payment.orderId)!;
          return {
            ...payment,
            order: {
              ...order,
              items: order.items.map(item => ({
                ...item,
                menuItem: menuItemsMap[item.menuItemId]
              }))
            }
          };
        })
        .sort((a, b) => {
          if (sortBy === 'amount') {
            return b.amount - a.amount;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      // Calculate metrics
      const completedTransactions = cashierTransactions.filter(t => t.status === 'paid');
      const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      const processingTimes = completedTransactions.map(transaction => {
        const order = transaction.order;
        return (new Date(transaction.createdAt).getTime() - new Date(order.createdAt).getTime()) / 60000;
      });

      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      setMetrics({
        totalTransactions: completedTransactions.length,
        totalAmount,
        avgProcessingTime,
        cashPayments: completedTransactions.filter(t => t.method === 'cash').length,
        cardPayments: completedTransactions.filter(t => t.method === 'card').length,
        walletPayments: completedTransactions.filter(t => t.method === 'wallet').length
      });

      setTransactions(cashierTransactions);
      setError(null);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Status filter
    if (statusFilter !== 'all' && transaction.status !== statusFilter) return false;
    
    // Payment method filter
    if (methodFilter !== 'all' && transaction.method !== methodFilter) return false;
    
    // Time filter
    const transactionTime = new Date(transaction.createdAt).getTime();
    const now = Date.now();
    if (timeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (transactionTime < today.getTime()) return false;
    } else if (timeFilter === 'week') {
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (transactionTime < weekAgo.getTime()) return false;
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      if (transactionTime < monthAgo.getTime()) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return transaction.order.id.toLowerCase().includes(query) ||
             transaction.order.items.some(item => 
               item.menuItem.name.toLowerCase().includes(query)
             );
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#5C4033]">Transaction History</h2>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-xl font-bold text-[#5C4033]">{metrics.totalTransactions}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-[#5C4033]">
                ${metrics.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Avg Processing Time</p>
              <p className="text-xl font-bold text-[#5C4033]">
                {metrics.avgProcessingTime.toFixed(1)} min
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Cash Payments</p>
              <p className="text-xl font-bold text-[#5C4033]">{metrics.cashPayments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Card Payments</p>
              <p className="text-xl font-bold text-[#5C4033]">{metrics.cardPayments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-500">Wallet Payments</p>
              <p className="text-xl font-bold text-[#5C4033]">{metrics.walletPayments}</p>
            </div>
          </div>
        </div>
        <button
          onClick={loadTransactions}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Refresh History
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by order ID or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="wallet">Digital Wallet</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'amount')}
            className="rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          >
            <option value="time">Sort by Time</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className={`bg-white rounded-lg shadow-sm border-l-4 ${
              transaction.status === 'paid'
                ? 'border-green-500'
                : transaction.status === 'unpaid'
                ? 'border-yellow-500'
                : 'border-red-500'
            }`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Order #{transaction.order.id.slice(0, 8)}
                  </h3>
                  <div className="flex items-center mt-1">
                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  transaction.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : transaction.status === 'unpaid'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-gray-600 capitalize">{transaction.method}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${transaction.amount.toFixed(2)}
                  </span>
                </div>
                {transaction.tip && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tip</span>
                    <span className="text-gray-600">${transaction.tip.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center mb-2">
                  <Receipt className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm font-medium text-gray-700">Order Details</span>
                </div>
                <div className="space-y-1">
                  {transaction.order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      <span className="text-gray-600">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' || methodFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Your transaction history will appear here'}
          </p>
        </div>
      )}
    </div>
  );
}