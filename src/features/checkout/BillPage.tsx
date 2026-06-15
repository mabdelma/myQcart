import { useState, useEffect, useCallback } from 'react';
import { useTableFlow } from '../restaurant/TableFlowLayout';
import { orderApi, paymentApi } from '../../lib/api';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '../menu/StripePaymentForm';
import { Receipt, Plus, Minus, Users } from 'lucide-react';
import type { Order } from '../../lib/api/types';

let stripePromise: Promise<Stripe | null> | null | undefined;
function getStripe() {
  if (stripePromise === undefined) {
    const key = import.meta.env.VITE_STRIPE_KEY || '';
    stripePromise = key ? loadStripe(key) : null;
  }
  return stripePromise;
}

export function BillPage() {
  const { slug, table, tenant } = useTableFlow();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipPercent, setTipPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(1);
  const [paying, setPaying] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    if (!slug || !table?.id) return;
    orderApi.getForTable(slug, table.id)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, table?.id]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid');
  const subtotal = unpaidOrders.reduce((s, o) => s + o.subtotal, 0);
  const tax = unpaidOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = unpaidOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const totalBeforeTip = subtotal + tax + serviceCharge;
  const tipAmount = totalBeforeTip * (tipPercent / 100);
  const grandTotal = totalBeforeTip + tipAmount;
  const perPerson = splitCount > 1 ? grandTotal / splitCount : grandTotal;

  async function handlePayAll() {
    if (!slug) return;
    setPaying(true);
    try {
      for (const order of unpaidOrders) {
        await paymentApi.recordCash(slug, { orderId: order.id, amount: order.total, tip: tipAmount / unpaidOrders.length });
      }
      setPaidOrderId('all');
      loadOrders();
    } catch {
      // payment failed silently
    } finally {
      setPaying(false);
    }
  }

  async function handlePayCard(order: Order) {
    setPaidOrderId(order.id);
  }

  if (loading) return <p className="text-center text-gray-500 py-8">Loading bill...</p>;

  if (unpaidOrders.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <Receipt className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">All Paid</h2>
        <p className="text-gray-500">There are no outstanding payments for this table.</p>
      </div>
    );
  }

  const totalItems = unpaidOrders.reduce((s, o) => s + o.itemCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Bill</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Table {table.number} · {totalItems} items
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-[#8B4513] text-white px-4 py-3 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          <span className="font-semibold">{tenant.name}</span>
        </div>

        <div className="p-4 space-y-3">
          {unpaidOrders.map((order) => (
            <div key={order.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Order #{order.id.slice(0, 8)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  order.status === 'ready' ? 'bg-green-100 text-green-700' :
                  order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{order.status}</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                {new Date(order.createdAt).toLocaleTimeString()}
              </p>
              <div className="flex justify-between font-medium">
                <span>Items ({order.itemCount})</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}
          {serviceCharge > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Service Charge</span>
              <span>${serviceCharge.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Tip</span>
            <div className="flex gap-1">
              {[0, 10, 15, 20].map((pct) => (
                <button key={pct} onClick={() => setTipPercent(pct)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    tipPercent === pct ? 'bg-[#8B4513] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {pct > 0 ? `${pct}%` : 'No Tip'}
                </button>
              ))}
            </div>
          </div>
          {tipPercent > 0 && (
            <p className="text-sm text-[#8B4513] font-medium text-right">
              +${tipAmount.toFixed(2)}
            </p>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Split</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center font-medium text-sm flex items-center gap-1">
                <Users className="w-3 h-3" /> {splitCount}
              </span>
              <button onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                className="w-7 h-7 rounded-full bg-[#8B4513] text-white flex items-center justify-center hover:bg-[#5C4033]">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {splitCount > 1 && (
            <p className="text-sm text-[#8B4513] font-medium text-right">
              ${perPerson.toFixed(2)} per person
            </p>
          )}
        </div>

        <div className="border-t-2 border-[#8B4513] px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-[#8B4513]">${grandTotal.toFixed(2)}</span>
          </div>
          {splitCount > 1 && (
            <p className="text-sm text-gray-500 text-right -mt-3 mb-3">
              ${perPerson.toFixed(2)} per person
            </p>
          )}

          {paidOrderId === 'all' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center">
              Payment recorded! Thank you.
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={handlePayAll} disabled={paying}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                {paying ? 'Processing...' : `Pay $${grandTotal.toFixed(2)} with Cash`}
              </button>
              {getStripe() && unpaidOrders.length === 1 && (
                <button onClick={() => handlePayCard(unpaidOrders[0])}
                  className="w-full py-3 bg-[#8B4513] text-white rounded-lg font-medium hover:bg-[#5C4033]">
                  Pay with Card
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {paidOrderId && paidOrderId !== 'all' && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <Elements stripe={getStripe()!}>
            <StripePaymentForm
              slug={slug}
              orderId={paidOrderId}
              amount={unpaidOrders.find((o) => o.id === paidOrderId)?.total || 0}
              onSuccess={() => { setPaidOrderId(null); loadOrders(); }}
              onCancel={() => setPaidOrderId(null)}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
