import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, MessageCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

function renderModifiers(modifiers?: string) {
  if (!modifiers) return null;
  try {
    const parsed = JSON.parse(modifiers);
    if (Array.isArray(parsed)) {
      return (
        <div className="mt-1 space-x-1">
          {parsed.map((m: unknown, i: number) => {
            const mod = m as Record<string, unknown>;
            const rawLabel = typeof mod === 'string' ? mod : mod.name && mod.choice ? `${mod.name}: ${mod.choice}` : JSON.stringify(mod);
            const label = DOMPurify.sanitize(rawLabel);
            return (
              <span key={i} className="inline-block text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {label}
              </span>
            );
          })}
        </div>
      );
    }
    return <span className="text-xs text-gray-500">{modifiers}</span>;
  } catch {
    return <span className="text-xs text-gray-500">{modifiers}</span>;
  }
}

export function CartPage() {
  const { t } = useI18n();
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const { slug, tableId } = useParams();
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t('nav.cart')}</h2>

      {state.items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('order.emptyCart')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('menu.items')}</p>
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover">
            {t('nav.menu')}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {state.items.map((item) => (
              <div key={item.menuItem.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                    <p className="text-sm text-gray-500">${item.menuItem.price.toFixed(2)} {t('common.item')}</p>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="mt-1 space-x-1">
                        {item.selectedModifiers.map((m, i) => (
                          <span key={i} className="inline-block text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {m.optionName}{m.priceAdjustment > 0 ? ` +$${m.priceAdjustment.toFixed(2)}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{item.quantity} × ${(item.menuItem.price + (item.selectedModifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0)).toFixed(2)}</span>
                      <span className="text-sm font-semibold text-gray-900">${((item.menuItem.price + (item.selectedModifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0)) * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-3 flex-shrink-0">
                    <button onClick={() => {
                      if (item.quantity > 1) {
                        dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.menuItem.id, quantity: item.quantity - 1 } });
                      } else {
                        dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id });
                      }
                    }}
                      aria-label={`Decrease quantity of ${item.menuItem.name}`}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.menuItem.id, quantity: item.quantity + 1 } })}
                      aria-label={`Increase quantity of ${item.menuItem.name}`}
                      className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-hover">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingComment(item.menuItem.id); setCommentText(item.comment || ''); }}
                      aria-label={`Add comment for ${item.menuItem.name}`}
                      className={`p-1.5 rounded ml-1 transition-colors ${item.comment ? 'text-brand bg-brand-light' : 'text-gray-400 hover:text-brand hover:bg-brand-light/50'}`}>
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.menuItem.id })}
                      aria-label={`Remove ${item.menuItem.name} from cart`}
                      className="p-1 text-red-500 hover:bg-red-50 rounded ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingComment === item.menuItem.id && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t('order.addNotes')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand focus:border-brand text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingComment(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
                        {t('common.cancel')}
                      </button>
                      <button onClick={() => { dispatch({ type: 'SET_COMMENT', payload: { id: item.menuItem.id, comment: commentText } }); setEditingComment(null); }}
                        className="px-3 py-1 text-sm bg-brand text-white rounded-md hover:bg-brand-hover">
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                )}

                {item.comment && editingComment !== item.menuItem.id && (
                  <p className="mt-1 text-sm text-gray-600 italic">"{item.comment}"</p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('order.addNotes')}
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t('order.addNotes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand focus:border-brand text-sm"
              rows={3}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('common.total')}</span>
              <span className="text-brand">${state.total.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => dispatch({ type: 'CLEAR_CART' })}
                className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                {t('order.clearCart')}
              </button>
              <button onClick={() => navigate(`/r/${slug}/table/${tableId}/checkout`)}
                className="flex-1 py-2.5 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover flex items-center justify-center gap-1">
                {t('nav.checkout')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
