import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTableFlow } from './TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';

export function TableMenuItemDetail() {
  const { t } = useI18n();
  const { items } = useTableFlow();
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const { slug, tableId, itemId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');
  const [showAdded, setShowAdded] = useState(false);

  const item = items.find((i) => i.id === itemId);

  if (!item || !item.available) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('common.notAvailable')}</h2>
        <p className="text-gray-500">{t('error.notFound')}</p>
        <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
          className="px-6 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033]">
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (showAdded) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('common.done')}</h2>
        <p className="text-gray-500">{item.name}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setShowAdded(false); setQuantity(1); setComment(''); }}
            className="px-6 py-2 border border-[#8B4513] text-[#8B4513] rounded-lg hover:bg-[#F5DEB3] transition-colors">
            {t('common.continue')}
          </button>
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/cart`)}
            className="px-6 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] transition-colors">
            {t('nav.cart')}
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: item,
      quantity,
      comment: comment || undefined,
    });
    setShowAdded(true);
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
        className="flex items-center text-sm text-gray-500 hover:text-[#8B4513]">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t('common.back')}
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="h-64 sm:h-80 w-full overflow-hidden bg-gray-200">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} width="640" height="320" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
          {item.description && (
            <p className="text-gray-600">{item.description}</p>
          )}
          <p className="text-2xl font-bold text-[#8B4513]">
            ${item.price.toFixed(2)}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('order.specialInstructions')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('order.addNotes')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#8B4513] focus:border-[#8B4513] text-gray-700 placeholder-gray-400"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="p-2 rounded-full border-2 border-[#8B4513] text-[#8B4513] hover:bg-[#F5DEB3]">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
                className="p-2 rounded-full border-2 border-[#8B4513] text-[#8B4513] hover:bg-[#F5DEB3]">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button onClick={handleAddToCart}
              className="px-6 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] flex items-center gap-2 text-lg font-medium transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {t('menu.addToCart')} — ${(item.price * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
