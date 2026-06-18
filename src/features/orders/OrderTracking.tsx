import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useI18n } from '../../contexts/I18nContext';
import { orderApi } from '../../lib/api';
import type { Order, OrderItem } from '../../lib/api/types';
import { CheckCircle, ChefHat, Bike, Clock, Package, ShoppingBag } from 'lucide-react';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

const statusSteps = ['pending', 'preparing', 'ready', 'delivered'] as const;

const stepIcons: Record<string, typeof Clock> = {
  pending: ShoppingBag,
  preparing: ChefHat,
  ready: Package,
  delivered: Bike,
};

function getCurrentStep(status: string) {
  return statusSteps.indexOf(status as typeof statusSteps[number]);
}

export function OrderTracking() {
  const { t } = useI18n();
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrder() {
    if (!slug || !orderId) return;
    try {
      const data = await orderApi.trackOrder(slug, orderId);
      setOrder(data as OrderWithItems);
      setError(null);
    } catch {
      setError(t('tracking.notFound'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [slug, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-[#8B4513] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('tracking.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.error')}</h2>
          <p className="text-gray-500">{error || t('tracking.notFound')}</p>
        </div>
      </div>
    );
  }

  const currentStep = getCurrentStep(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#8B4513] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tracking.title')} #{order.id.slice(0, 8)}</h1>
          <p className="text-gray-500 mt-1">
            {order.orderType === 'dine_in' ? t('order.dineIn') : order.orderType === 'takeout' ? t('order.takeaway') : t('order.delivery')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-0">
            {statusSteps.map((step, index) => {
              const StepIcon = stepIcons[step];
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              return (
                <div key={step} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                  {index < statusSteps.length - 1 && (
                    <div className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : isCurrent ? 'bg-[#8B4513]/10' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-[#8B4513]' : 'text-gray-300'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`font-medium ${isCompleted ? 'text-green-700' : isCurrent ? 'text-[#8B4513]' : 'text-gray-400'}`}>
                      {step === 'pending' ? t('tracking.orderPlaced') :
                       step === 'preparing' ? t('tracking.preparing') :
                       step === 'ready' ? t('tracking.ready') :
                       t('tracking.delivered')}
                    </p>
                    {isCurrent && order.status === 'preparing' && (
                      <p className="text-sm text-gray-500 mt-1">{t('tracking.beingPrepared')}</p>
                    )}
                    {isCurrent && order.status === 'ready' && (
                      <p className="text-sm text-green-600 mt-1 font-medium">{t('tracking.readyForPickup')}</p>
                    )}
                    {isCurrent && order.status === 'delivered' && (
                      <p className="text-sm text-green-600 mt-1">{t('tracking.enjoy')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{t('common.items')}</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center justify-center">
                    {item.quantity}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                  </div>
                </div>
                <span className="text-sm text-gray-600">${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t('common.subtotal')}</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount ? (
              <div className="flex justify-between text-red-500">
                <span>{t('common.discount')}</span>
                <span>-${order.discountAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-gray-500">
              <span>{t('common.tax')}</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            {order.deliveryFee ? (
              <div className="flex justify-between text-gray-500">
                <span>{t('common.price')}</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
              <span>{t('common.total')}</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">{t('tracking.autoRefresh')}</p>
      </div>
    </div>
  );
}
