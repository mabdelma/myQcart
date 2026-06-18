import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTableFlow } from './TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { menuApi } from '../../lib/api';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import type { ModifierGroup, ModifierSelection } from '../../lib/api/types';

export function TableMenuItemDetail() {
  const { t } = useI18n();
  const { items, slug } = useTableFlow();
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const { tableId, itemId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');
  const [showAdded, setShowAdded] = useState(false);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const item = items.find((i) => i.id === itemId);

  useEffect(() => {
    if (!item || !slug) return;
    menuApi.getMenuItemModifiers(slug, item.id).then((groups) => {
      setModifierGroups(groups);
      const defaults: Record<string, string[]> = {};
      for (const g of groups) {
        defaults[g.id] = [];
      }
      setSelections(defaults);
    }).catch(() => {});
  }, [item?.id, slug]);

  function toggleOption(groupId: string, optionId: string, selectionType: string) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (selectionType === 'single') {
        return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function getSelectedModifiers(): ModifierSelection[] {
    const result: ModifierSelection[] = [];
    for (const group of modifierGroups) {
      const selectedIds = selections[group.id] ?? [];
      for (const optId of selectedIds) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceAdjustment: opt.priceAdjustment,
          });
        }
      }
    }
    return result;
  }

  function modifiersTotal(): number {
    return getSelectedModifiers().reduce((sum, m) => sum + m.priceAdjustment, 0);
  }

  const hasRequiredUnselected = modifierGroups.some((g) => g.isRequired && (selections[g.id] ?? []).length === 0);

  if (!item || !item.available) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('common.notAvailable')}</h2>
        <p className="text-gray-500">{t('error.notFound')}</p>
        <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
          className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover">
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
          <button onClick={() => { setShowAdded(false); setQuantity(1); setComment(''); setSelections((prev) => { const copy = { ...prev }; for (const k of Object.keys(copy)) copy[k] = []; return copy; }); }}
            className="px-6 py-2 border border-brand text-brand rounded-lg hover:bg-brand-light transition-colors">
            {t('common.continue')}
          </button>
          <button onClick={() => navigate(`/r/${slug}/table/${tableId}/cart`)}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors">
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
      selectedModifiers: getSelectedModifiers(),
    });
    setShowAdded(true);
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/r/${slug}/table/${tableId}/menu`)}
        className="flex items-center text-sm text-gray-500 hover:text-brand">
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
          <p className="text-2xl font-bold text-brand">
            ${(item.price + modifiersTotal()).toFixed(2)}
          </p>

          {modifierGroups.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              {modifierGroups.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{group.name}</h3>
                    {group.isRequired && <span className="text-xs text-red-500">Required</span>}
                    <span className="text-xs text-gray-400">
                      {group.selectionType === 'single' ? '(Choose one)' : '(Choose any)'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const isSelected = (selections[group.id] ?? []).includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-brand bg-brand-light'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type={group.selectionType === 'single' ? 'radio' : 'checkbox'}
                              name={`modifier-${group.id}`}
                              checked={isSelected}
                              onChange={() => toggleOption(group.id, opt.id, group.selectionType)}
                              className="h-4 w-4 text-brand border-gray-300"
                            />
                            <span className="text-sm text-gray-900">{opt.name}</span>
                          </div>
                          {opt.priceAdjustment > 0 && (
                            <span className="text-sm text-green-600">+${opt.priceAdjustment.toFixed(2)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('order.specialInstructions')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('order.addNotes')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand focus:border-brand text-gray-700 placeholder-gray-400"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="p-2 rounded-full border-2 border-brand text-brand hover:bg-brand-light">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
                className="p-2 rounded-full border-2 border-brand text-brand hover:bg-brand-light">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button onClick={handleAddToCart} disabled={hasRequiredUnselected}
              className="px-6 py-3 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {t('menu.addToCart')} — ${((item.price + modifiersTotal()) * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}