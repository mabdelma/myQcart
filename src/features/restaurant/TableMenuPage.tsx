import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTableFlow } from './TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { Plus, Check, Search, ShoppingBag } from 'lucide-react';

export function TableMenuPage() {
  const { t } = useI18n();
  const { categories, items } = useTableFlow();
  const { dispatch } = useCart();
  const navigate = useNavigate();
  const { slug, tableId } = useParams();
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const mainCats = categories.filter((c) => c.type === 'main');

  useEffect(() => {
    if (!selectedCat && mainCats.length > 0) {
      setSelectedCat(mainCats[0].id);
    }
  }, [mainCats, selectedCat]);

  const filteredItems = items.filter((i) => {
    const matchesCategory = i.categoryId === selectedCat;
    const matchesSearch = !search
      || i.name.toLowerCase().includes(search.toLowerCase())
      || (i.description && i.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  function handleAdd(e: React.MouseEvent, item: typeof items[0]) {
    e.stopPropagation();
    dispatch({ type: 'ADD_ITEM', payload: item, quantity: 1 });
    setAddingId(item.id);
    setTimeout(() => setAddingId(null), 800);
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('menu.search')}
          aria-label={t('menu.search')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-[#8B4513] focus:border-[#8B4513] text-gray-700 placeholder-gray-400"
        />
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        {mainCats.map((c) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors flex-shrink-0 ${
              selectedCat === c.id ? 'bg-[#8B4513] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#8B4513]'
            }`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div key={item.id}
            onClick={() => item.available && navigate(`/r/${slug}/table/${tableId}/menu/${item.id}`)}
            role="button"
            tabIndex={item.available ? 0 : -1}
            onKeyDown={(e) => {
              if (item.available && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                navigate(`/r/${slug}/table/${tableId}/menu/${item.id}`);
              }
            }}
            className={`bg-white rounded-lg shadow-sm p-4 flex items-center gap-4 transition-shadow ${
              item.available ? 'cursor-pointer hover:shadow-md' : 'opacity-60'
            }`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} width="64" height="64" loading="lazy" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              {item.description && <p className="text-sm text-gray-500 truncate">{item.description}</p>}
              <p className="text-[#8B4513] font-bold mt-1">${item.price.toFixed(2)}</p>
            </div>
            {item.available ? (
              <button onClick={(e) => handleAdd(e, item)}
                aria-label={`Add ${item.name} to cart`}
                className="px-3 py-1.5 bg-[#8B4513] text-white rounded-full text-sm hover:bg-[#5C4033] flex-shrink-0 transition-colors">
                {addingId === item.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-full text-sm flex-shrink-0 font-medium">
                {t('menu.soldOut')}
              </span>
            )}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-center text-gray-500 py-8">{t('common.noResults')}</p>
        )}
      </div>
    </div>
  );
}
