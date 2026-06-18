import { useState, useEffect, useCallback } from 'react';
import { useTableFlow } from '../restaurant/TableFlowLayout';
import { orderApi, paymentApi } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { useSSE } from '../../hooks/useSSE';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../menu/StripePaymentForm';
import { Package, Clock, RefreshCw } from 'lucide-react';
import type { Order } from '../../lib/api/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

let stripePromise: Promise<Stripe | null> | null | undefined;
function getStripe() {
  if (stripePromise === undefined) {
    const key = import.meta.env.VITE_STRIPE_KEY || '';
    stripePromise = key ? loadStripe(key) : null;
  }
  return stripePromise;
}

export function OrdersPage() {
  const { t } = useI18n();
  const { table, slug } = useTableFlow();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    if (!slug || !table?.id) return;
    orderApi.getForTable(slug, table.id)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, table?.id]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useSSE(slug, {
    onOrderCreated: () => { loadOrders(); },
    onOrderUpdated: () => { loadOrders(); },
    onOrderStatusChanged: () => { loadOrders(); },
  });

  async function handlePayCash(orderId: string, total: number) {
    if (!slug) return;
    try {
      await paymentApi.recordCash(slug, { orderId, amount: total });
      setPayingOrderId(null);
      loadOrders();
    } catch {
      // payment failed silently
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">{t('nav.orders')}</h2>
        <button onClick={loadOrders} className="flex items-center text-sm text-gray-500 hover:text-brand">
          <RefreshCw className="w-4 h-4 mr-1" /> {t('common.retry')}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">{t('common.loading')}...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('common.noResults')}</h3>
          <p className="text-sm text-gray-500">{t('order.emptyCart')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {order.paymentStatus === 'paid' ? t('payment.paid') : t('payment.unpaid')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className="font-bold text-lg text-brand">${order.total.toFixed(2)}</span>
              </div>

              {(order.status === 'ready' || order.status === 'delivered') && order.paymentStatus !== 'paid' && (
                <div className="mt-3 pt-3 border-t">
                  {payingOrderId === order.id ? (
                    <div className="space-y-3">
                      {getStripe() ? (
                        <Elements stripe={getStripe()!}>
                          <StripePaymentForm
                            slug={slug}
                            orderId={order.id}
                            amount={order.total}
                            onSuccess={() => { setPayingOrderId(null); loadOrders(); }}
                            onCancel={() => setPayingOrderId(null)}
                          />
                        </Elements>
                      ) : (
                        <p className="text-sm text-red-600">{t('common.notAvailable')}</p>
                      )}
                      <button onClick={() => handlePayCash(order.id, order.total)}
                        className="w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                        {t('payment.cash')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handlePayCash(order.id, order.total)}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                        {t('payment.cash')}
                      </button>
                      {getStripe() && (
                        <button onClick={() => setPayingOrderId(order.id)}
                          className="flex-1 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover">
                          {t('payment.card')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
