import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { getDB } from '../../lib/db';
import type { MenuItem } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function MenuItemDetail() {
  const { tableId, itemId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const [item, setItem] = React.useState<MenuItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [quantity, setQuantity] = React.useState(1);
  const [comment, setComment] = React.useState('');

  React.useEffect(() => {
    loadItem();
  }, [itemId]);

  async function loadItem() {
    if (!itemId) return;
    try {
      const db = await getDB();
      const menuItem = await db.get('menu_items', itemId);
      setItem(menuItem);
    } catch (error) {
      console.error('Failed to load menu item:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = () => {
    if (!item) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: item,
      quantity,
      comment
    });
    navigate(`/table/${tableId}/menu`);
  };

  if (loading) return <LoadingSpinner />;
  if (!item || !item.available) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Item Not Available</h2>
        <p className="text-gray-600 mb-6">This menu item is currently unavailable.</p>
        <button
          onClick={() => navigate(`/table/${tableId}/menu`)}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative">
          <button
            onClick={() => navigate(`/table/${tableId}/menu`)}
            className="absolute right-4 top-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="h-96 w-full overflow-hidden">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
          <p className="text-gray-600 text-lg mb-4">{item.description}</p>
          <p className="text-2xl font-bold text-[#8B4513] mb-6">
            ${item.price.toFixed(2)}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any special requests..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#8B4513] focus:border-[#8B4513] text-gray-700 placeholder-gray-400"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-full border-2 border-[#8B4513] text-[#8B4513] hover:bg-[#F5DEB3]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded-full border-2 border-[#8B4513] text-[#8B4513] hover:bg-[#F5DEB3]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="px-8 py-4 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] flex items-center text-lg font-medium transition-colors"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Add to Cart - ${(item.price * quantity).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}