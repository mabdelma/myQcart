import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useTableFlow } from '../restaurant/TableFlowLayout';
import { orderApi, paymentApi } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { useSSE } from '../../hooks/useSSE';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { StripePaymentForm } from '../menu/StripePaymentForm';
import { Receipt, Plus, Minus, Users, Check, ChevronDown, ChevronUp, X, AlertTriangle, Star } from 'lucide-react';
import { PromoCodeCheckout } from '../loyalty/PromoCodeCheckout';
import type { Order, OrderItem } from '../../lib/api/types';

let stripePromise: Promise<Stripe | null> | null | undefined;
function getStripe() {
  if (stripePromise === undefined) {
    const key = import.meta.env.VITE_STRIPE_KEY || '';
    stripePromise = key ? loadStripe(key) : null;
  }
  return stripePromise;
}

export function BillPage() {
  const { t } = useI18n();
  const { slug, table, tenant } = useTableFlow();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipPercent, setTipPercent] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState<number | null>(null);
  const [splitCount, setSplitCount] = useState(1);
  const [splitMode, setSplitMode] = useState<'even' | 'item'>('even');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sharePartialAmount, setSharePartialAmount] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [showAll, setShowAll] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successPaid, setSuccessPaid] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentError, setPaymentError] = useState('');

  const loadOrders = useCallback(() => {
    if (!slug || !table?.id) return;
    orderApi.getForTable(slug, table.id)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, table?.id]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useSSE(slug, {
    onOrderCreated: () => { loadOrders(); },
    onOrderUpdated: () => { loadOrders(); },
    onOrderStatusChanged: () => { loadOrders(); },
  });

  useEffect(() => {
    if (!slug || orders.length === 0) return;
    let cancelled = false;
    setItemsLoading(true);
    Promise.all(orders.map((o) => orderApi.getDetail(slug, o.id)))
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, OrderItem[]> = {};
        results.forEach((detail) => {
          map[detail.id] = detail.items || [];
        });
        setOrderItemsMap(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug, orders]);

  const displayedOrders = showAll ? orders : orders.filter((o) => o.paymentStatus !== 'paid');
  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid');
  const subtotal = unpaidOrders.reduce((s, o) => s + o.subtotal, 0);
  const tax = unpaidOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = unpaidOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const totalBeforeTip = subtotal + tax + serviceCharge - discount;
  const tipAmount = customTipAmount !== null ? customTipAmount : totalBeforeTip * (tipPercent / 100);
  const grandTotal = totalBeforeTip + tipAmount;
  // Amount already settled by earlier partial / split-by-item payments on these orders.
  const alreadyPaid = unpaidOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const balanceDue = Math.max(0, grandTotal - alreadyPaid);
  const perPerson = splitCount > 1 ? grandTotal / splitCount : grandTotal;

  // ── Split by item: compute the diner's share from the items they tapped ──
  const allUnpaidItems = unpaidOrders.flatMap((o) =>
    (orderItemsMap[o.id] || []).map((it) => ({ ...it, orderId: o.id, lineTotal: it.unitPrice * it.quantity })),
  );
  const itemSubtotal = allUnpaidItems
    .filter((it) => selectedItemIds.has(it.id))
    .reduce((s, it) => s + it.lineTotal, 0);
  const subtotalRatio = subtotal > 0 ? itemSubtotal / subtotal : 0;
  const itemShareBeforeTip = itemSubtotal + (tax + serviceCharge - discount) * subtotalRatio;
  const itemTip = customTipAmount !== null ? customTipAmount * subtotalRatio : itemShareBeforeTip * (tipPercent / 100);
  const itemShare = itemShareBeforeTip + itemTip;
  // Orders touched by the current item selection (card split only supports one order at a time).
  const affectedOrderIds = unpaidOrders
    .filter((o) => (orderItemsMap[o.id] || []).some((it) => selectedItemIds.has(it.id)))
    .map((o) => o.id);

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Per-order amount + tip contributions for the selected items (tax/service shared pro-rata).
  function perOrderContributions(): Record<string, { amount: number; tip: number }> {
    const byOrder: Record<string, { amount: number; tip: number }> = {};
    for (const o of unpaidOrders) {
      const items = (orderItemsMap[o.id] || []).filter((it) => selectedItemIds.has(it.id));
      if (items.length === 0) continue;
      const oItemSub = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const oRatio = o.subtotal > 0 ? oItemSub / o.subtotal : 0;
      const amount = oItemSub + (o.tax + o.serviceCharge) * oRatio;
      const tip = itemSubtotal > 0 ? itemTip * (oItemSub / itemSubtotal) : 0;
      byOrder[o.id] = { amount: +amount.toFixed(2), tip: +tip.toFixed(2) };
    }
    return byOrder;
  }

  async function payShareCash() {
    if (!slug || itemSubtotal <= 0) return;
    setPaying(true);
    setPaymentError('');
    closeConfirmModal();
    try {
      const contributions = perOrderContributions();
      for (const [orderId, { amount, tip }] of Object.entries(contributions)) {
        await paymentApi.recordCash(slug, { orderId, amount, tip });
      }
      setSelectedItemIds(new Set());
      loadOrders();
    } catch (err) {
      setPaymentError((err as { message?: string }).message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  function toggleExpand(orderId: string) {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  function handleTipPercent(pct: number) {
    setTipPercent(pct);
    setCustomTipAmount(null);
  }

  function handleCustomTip(value: string) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setCustomTipAmount(num);
      setTipPercent(0);
    } else if (value === '') {
      setCustomTipAmount(null);
    }
  }

  function openConfirmModal() {
    setShowConfirmModal(true);
  }

  function closeConfirmModal() {
    setShowConfirmModal(false);
  }

  async function processCashPayment() {
    if (!slug) return;
    setPaying(true);
    setPaymentError('');
    closeConfirmModal();
    try {
      const perOrderDiscount = unpaidOrders.length > 0 ? discount / unpaidOrders.length : 0;
      const perOrderTip = unpaidOrders.length > 0 ? tipAmount / unpaidOrders.length : 0;
      for (const order of unpaidOrders) {
        const orderAmount = order.total - perOrderDiscount;
        await paymentApi.recordCash(slug, { orderId: order.id, amount: Math.max(0, orderAmount), tip: perOrderTip });
      }
      setSuccessPaid(true);
      setPaidOrderId('all');
      loadOrders();
    } catch (err) {
      setPaymentError((err as { message?: string }).message || 'Cash payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  function confirmCardPayment() {
    if (unpaidOrders.length !== 1) return;
    closeConfirmModal();
    setPaidOrderId(unpaidOrders[0].id);
  }

  function handleStripeSuccess() {
    setSuccessPaid(true);
    setPaidOrderId('all');
    loadOrders();
  }

  if (loading) return <p className="text-center text-gray-500 py-8">{t('common.loading')}...</p>;

  if (successPaid) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('payment.paid')}!</h2>
        <p className="text-gray-500">
          {t('payment.totalDue')}: <span className="font-semibold text-gray-900">${grandTotal.toFixed(2)}</span>
        </p>
        <p className="text-sm text-gray-400">
          {t('payment.paymentMethod')}: {paymentMethod === 'cash' ? t('payment.cash') : paymentMethod === 'card' ? t('payment.card') : t('payment.split')}
          {splitCount > 1 && ` (${splitCount})`}
        </p>
        {tipAmount > 0 && (
          <p className="text-sm text-gray-400">{t('payment.tip')}: ${tipAmount.toFixed(2)}</p>
        )}
        {tenant.googleReviewUrl && (
          <a
            href={tenant.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full bg-[#8B4513] px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#5C4033]"
          >
            <Star className="h-5 w-5 fill-current text-amber-300" /> {t('review.cta')}
          </a>
        )}
        <div className="flex gap-3 justify-center pt-4">
          <Link to={`/r/${slug}/orders`} className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors">
            {t('order.orderHistory')}
          </Link>
          <Link to={`/r/${slug}`} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            {t('nav.menu')}
          </Link>
        </div>
      </div>
    );
  }

  if (unpaidOrders.length === 0 && !showAll) {
    return (
      <div className="text-center py-12 space-y-4">
        <Receipt className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">{t('payment.paid')}</h2>
        <p className="text-gray-500">{t('common.noResults')}</p>
        <button onClick={() => setShowAll(true)} className="text-brand underline text-sm">
          {t('order.allOrders')}
        </button>
      </div>
    );
  }

  const totalItems = unpaidOrders.reduce((s, o) => s + o.itemCount, 0);

  function ConfirmationModal() {
    if (!showConfirmModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeConfirmModal}
        role="dialog" aria-modal="true" aria-label="Payment confirmation">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{t('payment.orderSummary')}</h3>
            <button onClick={closeConfirmModal} aria-label="Close confirmation" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm border-t pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('payment.paymentMethod')}</span>
              <span className="font-medium">
                {paymentMethod === 'cash' ? t('payment.cash') : paymentMethod === 'card' ? t('payment.card') : t('payment.split')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('payment.amount')}</span>
              <span>${totalBeforeTip.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('payment.tip')}</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
            )}
            {splitCount > 1 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('payment.split')}</span>
                <span>{splitCount}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-bold text-gray-900">{t('common.total')}</span>
              <span className="font-bold text-brand">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={paymentMethod === 'card' ? confirmCardPayment : processCashPayment}
            disabled={paying}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {paying
              ? `${t('common.loading')}...`
              : `${paymentMethod === 'card' ? t('payment.payNow') : t('common.confirm')} $${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmationModal />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('payment.bill')}</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {t('table.tableNumber', { number: table.number })} · {totalItems} {t('common.items')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAll(false)}
          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
            !showAll ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('payment.unpaid')}
        </button>
        <button
          onClick={() => setShowAll(true)}
          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
            showAll ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('order.allOrders')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="bg-brand text-white px-4 py-3 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          <span className="font-semibold">{tenant.name}</span>
        </div>

        <div className="p-4 space-y-3">
          {displayedOrders.map((order) => (
            <div key={order.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <button onClick={() => toggleExpand(order.id)} className="w-full text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('common.items')} #{order.id.slice(0, 8)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'ready' ? 'bg-green-100 text-green-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.paymentStatus === 'paid' ? t('payment.paid') :
                        order.status === 'pending' ? t('order.pending') :
                        order.status === 'preparing' ? t('order.preparing') :
                        order.status === 'ready' ? t('order.ready') :
                        order.status === 'delivered' ? t('order.delivered') :
                        t('order.cancelled')}
                    </span>
                    {expandedOrders[order.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  {new Date(order.createdAt).toLocaleTimeString()}
                </p>
                <div className="flex justify-between font-medium">
                  <span>{t('common.items')} ({order.itemCount})</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
              </button>
              {(expandedOrders[order.id] || splitMode === 'item') && (
                <div className="mt-2 pl-2 border-l-2 border-gray-200 space-y-1">
                  {itemsLoading ? (
                    <p className="text-xs text-gray-400">{t('common.loading')}...</p>
                  ) : (orderItemsMap[order.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-400">{t('common.noResults')}</p>
                  ) : (
                    (orderItemsMap[order.id] || []).map((item) => {
                      const checked = selectedItemIds.has(item.id);
                      return splitMode === 'item' ? (
                        <label key={item.id} className={`flex items-center justify-between text-xs py-1.5 px-1 rounded cursor-pointer ${checked ? 'bg-brand/10' : 'hover:bg-gray-50'}`}>
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)}
                              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />
                            <span className="text-gray-700"><span className="text-gray-400 mr-1">{item.quantity}x</span>{item.name}</span>
                          </span>
                          <span className="text-gray-700">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </label>
                      ) : (
                        <div key={item.id} className="flex justify-between text-xs text-gray-600 py-1">
                          <span>
                            <span className="text-gray-400 mr-1">{item.quantity}x</span>
                            {item.name}
                          </span>
                          <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{t('common.subtotal')}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{t('common.tax')}</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <PromoCodeCheckout
          slug={slug}
          subtotal={subtotal}
          onApply={(d) => setDiscount(d)}
          onRemove={() => setDiscount(0)}
        />

        <div className="border-t px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t('payment.tip')}</span>
            <div className="flex gap-1">
              {[0, 10, 15, 20].map((pct) => (
                <button key={pct} onClick={() => handleTipPercent(pct)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    tipPercent === pct && customTipAmount === null ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {pct > 0 ? `${pct}%` : t('common.no')}
                </button>
              ))}
              {(() => {
                const roundUpTip = Math.ceil(totalBeforeTip) - totalBeforeTip;
                const active = customTipAmount !== null && Math.abs(customTipAmount - roundUpTip) < 0.005 && roundUpTip > 0;
                return (
                  <button
                    onClick={() => { setCustomTipAmount(Math.max(0, +roundUpTip.toFixed(2))); setTipPercent(0); }}
                    disabled={roundUpTip < 0.005}
                    className={`px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-40 ${active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t('payment.roundUp')}
                  </button>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={t('payment.tip')}
              value={customTipAmount !== null ? customTipAmount : ''}
              onChange={(e) => handleCustomTip(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          {tipAmount > 0 && (
            <p className="text-sm text-brand font-medium text-right">
              +${tipAmount.toFixed(2)}
            </p>
          )}
        </div>

        <div className="border-t px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('payment.split')}</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs">
              {(['even', 'item'] as const).map((m) => (
                <button key={m} onClick={() => { setSplitMode(m); setSelectedItemIds(new Set()); }}
                  className={`px-3 py-1 font-medium transition-colors ${splitMode === m ? 'bg-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {m === 'even' ? t('payment.splitEven') : t('payment.splitByItem')}
                </button>
              ))}
            </div>
          </div>

          {splitMode === 'even' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('payment.numberOfPeople')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                    aria-label="Decrease split count"
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-medium text-sm flex items-center gap-1">
                    <Users className="w-3 h-3" /> {splitCount}
                  </span>
                  <button onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                    aria-label="Increase split count"
                    className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {splitCount > 1 && (
                <p className="text-sm text-brand font-medium text-right">
                  ${perPerson.toFixed(2)} / {t('payment.split')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">{t('payment.tapYourItems')}</p>
              {itemSubtotal > 0 && (
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">{t('payment.yourShare')}</span>
                  <span className="text-brand">${itemShare.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <span className="text-sm font-medium text-gray-700 block mb-2">{t('payment.paymentMethod')}</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            {(['cash', 'card', 'split'] as const).map((method) => (
              <button key={method} onClick={() => setPaymentMethod(method)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  paymentMethod === method ? 'bg-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {method === 'cash' ? t('payment.cash') : method === 'card' ? t('payment.card') : t('payment.split')}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-brand px-4 py-4">
          {alreadyPaid > 0 && (
            <div className="flex justify-between text-sm text-green-600 mb-1">
              <span>{t('payment.alreadyPaid')}</span>
              <span>-${alreadyPaid.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold text-gray-900">{alreadyPaid > 0 ? t('payment.balanceDue') : t('common.total')}</span>
            <span className="text-xl font-bold text-brand">${balanceDue.toFixed(2)}</span>
          </div>
          {splitMode === 'even' && splitCount > 1 && (
            <p className="text-sm text-gray-500 text-right -mt-3 mb-3">
              ${perPerson.toFixed(2)} / {t('payment.split')}
            </p>
          )}

          {paidOrderId === 'all' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center">
              {t('payment.paid')}!
            </div>
          ) : (
            <div className="space-y-2">
              {paymentError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {paymentError}
                </div>
              )}

              {/* ── Split by item: pay only the selected items' share ── */}
              {splitMode === 'item' ? (
                <>
                  {(paymentMethod === 'cash' || paymentMethod === 'split') && (
                    <button onClick={payShareCash} disabled={paying || itemSubtotal <= 0}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {paying ? `${t('common.loading')}...` : `${t('payment.payShare')} $${itemShare.toFixed(2)}`}
                    </button>
                  )}
                  {paymentMethod === 'card' && getStripe() && (
                    affectedOrderIds.length === 1 ? (
                      <button onClick={() => { setSharePartialAmount(itemShare); setPaidOrderId(affectedOrderIds[0]); }}
                        disabled={itemSubtotal <= 0}
                        className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors">
                        {t('payment.payShare')} ${itemShare.toFixed(2)}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('payment.cardOneOrder')}</p>
                    )
                  )}
                  {paymentMethod === 'card' && !getStripe() && (
                    <button disabled className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed">
                      {t('payment.card')} ({t('common.notAvailable')})
                    </button>
                  )}
                </>
              ) : (
                <>
                  {(paymentMethod === 'cash' || paymentMethod === 'split') && (
                    <button onClick={openConfirmModal} disabled={paying}
                      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {paying ? `${t('common.loading')}...` : `${t('payment.payFull')} $${balanceDue.toFixed(2)}`}
                    </button>
                  )}
                  {paymentMethod === 'card' && getStripe() && unpaidOrders.length === 1 && (
                    <button onClick={openConfirmModal}
                      className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors">
                      {t('payment.payNow')} ${balanceDue.toFixed(2)}
                    </button>
                  )}
                  {paymentMethod === 'card' && !getStripe() && (
                    <button disabled
                      className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed">
                      {t('payment.card')} ({t('common.notAvailable')})
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {paidOrderId && paidOrderId !== 'all' && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <StripePaymentForm
            stripePromise={getStripe()}
            slug={slug}
            orderId={paidOrderId}
            amount={sharePartialAmount ?? (unpaidOrders.find((o) => o.id === paidOrderId)?.total || 0)}
            partialAmount={sharePartialAmount ?? undefined}
            onSuccess={() => {
              if (sharePartialAmount != null) {
                // Partial (split-by-item) card payment — clear selection and refresh the balance.
                setSharePartialAmount(null);
                setSelectedItemIds(new Set());
                setPaidOrderId(null);
                loadOrders();
              } else {
                handleStripeSuccess();
              }
            }}
            onCancel={() => { setPaidOrderId(null); setSharePartialAmount(null); }}
          />
        </div>
      )}
    </div>
  );
}
