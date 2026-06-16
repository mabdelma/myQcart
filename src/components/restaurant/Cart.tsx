import React from 'react';
import { ShoppingBag, Minus, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { orderApi } from '../../lib/api';
import { useNavigate, useParams } from 'react-router';

export function Cart() {
  const { t } = useI18n();
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { slug, tableId } = useParams();
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  async function handleCheckout() {
    if (state.items.length === 0) return;
    
    setIsProcessing(true);
    setCheckoutError(null);
    
    try {
      await orderApi.create(slug || '', {
        tableId: tableId || '1',
        items: state.items.map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.menuItem.price,
          notes: item.comment || undefined
        })),
      });
      
      dispatch({ type: 'CLEAR_CART' });
      navigate(slug ? `/r/${slug}/table/${tableId}/orders` : '/orders');
    } catch (error) {
      console.error('Checkout failed:', error);
      setCheckoutError(t('error.generic'));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('nav.cart')}</h2>
      
      {checkoutError && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{checkoutError}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        {state.items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('order.emptyCart')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('order.addNotes')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {state.items.map((item) => (
              <div key={item.menuItem.id} className="flex items-center space-x-4 py-4 border-b">
                <div className="w-20 h-20 flex-shrink-0">
                  {item.menuItem.imageUrl ? (
                    <img
                      src={item.menuItem.imageUrl}
                      alt={item.menuItem.name}
                      width="80"
                      height="80"
                      loading="lazy"
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-md" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{item.menuItem.name}</h3>
                  <p className="text-sm text-gray-500">${item.menuItem.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        dispatch({
                          type: 'UPDATE_QUANTITY',
                          payload: { id: item.menuItem.id, quantity: item.quantity - 1 }
                        });
                      } else {
                        dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id });
                      }
                    }}
                    aria-label="Decrease quantity"
                    className="p-1 rounded-md hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => dispatch({
                      type: 'UPDATE_QUANTITY',
                      payload: { id: item.menuItem.id, quantity: item.quantity + 1 }
                    })}
                    aria-label="Increase quantity"
                    className="p-1 rounded-md hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id })}
                    aria-label="Remove item"
                    className="p-1 text-red-600 hover:bg-red-50 rounded-md ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-medium">
                <span>{t('common.total')}</span>
                <span>${state.total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
                className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                {t('order.clearCart')}
              </button>
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
              >
                {isProcessing ? t('common.loading') : t('nav.checkout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}