import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTableFlow } from '../restaurant/TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { orderApi } from '../../lib/api';
import { ArrowLeft, ShoppingBag, CheckCircle, RotateCcw, ClipboardList } from 'lucide-react';
import type { ApiError } from '../../lib/api/types';

export function CheckoutPage() {
  const { t } = useI18n();
  const { slug, table } = useTableFlow();
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState(() => sessionStorage.getItem('guestName') || '');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    sessionStorage.setItem('guestName', customerName);
  }, [customerName]);

  async function placeOrder() {
    if (!slug || !table) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await orderApi.create(slug, {
        tableId: table.id,
        items: state.items.map((c) => ({
          menuItemId: c.menuItem.id,
          name: c.menuItem.name,
          quantity: c.quantity,
          unitPrice: c.menuItem.price,
          notes: c.comment,
          modifiers: c.selectedModifiers ? JSON.stringify(c.selectedModifiers.map((m) => ({ name: m.optionName, groupName: m.groupName, priceAdjustment: m.priceAdjustment }))) : undefined,
        })),
        customerName: customerName || undefined,
        notes: notes || undefined,
      });
      setOrderId(res.id);
      dispatch({ type: 'CLEAR_CART' });
      setSuccess(true);
    } catch (err) {
      setError((err as ApiError).message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 bg-green-100 rounded-full scale-110 animate-ping opacity-75" />
          <div className="relative w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('order.newOrder')}</h2>
        <p className="text-gray-500">{t('order.orderReady')}</p>
        {orderId && (
          <p className="text-sm text-gray-400">
            {t('order.placedAt')}: <span className="font-mono font-medium text-gray-600">#{orderId.slice(0, 8)}</span>
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/orders`)}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center justify-center gap-2">
            <ClipboardList className="w-4 h-4" /> {t('nav.orders')}
          </button>
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
            className="px-6 py-2 border border-brand text-brand rounded-lg hover:bg-brand hover:text-white flex items-center justify-center gap-2 transition-colors">
            <RotateCcw className="w-4 h-4" /> {t('order.newOrder')}
          </button>
        </div>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">{t('order.emptyCart')}</h2>
        <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
          className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover">
          {t('nav.menu')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/r/${slug}/table/${tableId}/cart`)}
        className="flex items-center text-sm text-gray-500 hover:text-brand">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t('common.back')}
      </button>

      <h2 className="text-xl font-bold text-gray-900">{t('nav.checkout')}</h2>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name')}</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder={t('auth.name')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('order.addNotes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
            placeholder={t('order.addNotes')} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">{t('payment.orderSummary')}</h3>
        {state.items.map((item) => (
          <div key={item.menuItem.id} className="flex justify-between text-sm">
            <span>{item.menuItem.name} x{item.quantity}</span>
            <span className="font-medium">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>{t('common.total')}</span>
          <span className="text-brand">${state.total.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700" role="alert">{error}</div>
      )}

      <button onClick={placeOrder} disabled={placing}
        className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors">
        {placing ? t('order.processOrder') + '...' : `${t('order.processOrder')} — $${state.total.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        {t('payment.cash')} / {t('payment.card')}
      </p>
    </div>
  );
}
