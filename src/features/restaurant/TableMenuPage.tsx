import { useState } from 'react';
import { useTableFlow } from './TableFlowLayout';
import { useCart } from '../../contexts/CartContext';
import { Plus, Check } from 'lucide-react';

export function TableMenuPage() {
  const { categories, items } = useTableFlow();
  const { dispatch } = useCart();
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const mainCats = categories.filter((c) => c.type === 'main');
  if (!selectedCat && mainCats.length > 0 && !selectedCat) {
    setTimeout(() => setSelectedCat(mainCats[0].id), 0);
  }

  const filteredItems = items.filter(
    (i) => i.available && i.categoryId === selectedCat
  );

  function handleAdd(item: typeof items[0]) {
    dispatch({ type: 'ADD_ITEM', payload: item, quantity: 1 });
    setAddingId(item.id);
    setTimeout(() => setAddingId(null), 800);
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {mainCats.map((c) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCat === c.id ? 'bg-[#8B4513] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#8B4513]'
            }`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              {item.description && <p className="text-sm text-gray-500 truncate">{item.description}</p>}
              <p className="text-[#8B4513] font-bold mt-1">${item.price.toFixed(2)}</p>
            </div>
            <button onClick={() => handleAdd(item)}
              className="px-3 py-1.5 bg-[#8B4513] text-white rounded-full text-sm hover:bg-[#5C4033] flex-shrink-0 transition-colors">
              {addingId === item.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-center text-gray-500 py-8">No items in this category</p>
        )}
      </div>
    </div>
  );
}
