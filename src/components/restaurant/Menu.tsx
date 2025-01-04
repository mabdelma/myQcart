import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Check, ArrowRight } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { MenuItem, MenuCategory } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useCart } from '../../contexts/CartContext';
import { ErrorMessage } from '../ui/ErrorMessage';
import { useNavigate, useParams } from 'react-router-dom';

export function Menu() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { dispatch } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('1'); // Default to Food Menu
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('4'); // Default to Main Courses

  const handleAddToCart = (item: MenuItem) => {
    const quantity = itemQuantities[item.id] || 1;
    dispatch({ 
      type: 'ADD_ITEM', 
      payload: { ...item },
      quantity
    });
    setAddingItem(null);
    setItemQuantities({ ...itemQuantities, [item.id]: 1 });
    setShowConfirmation(item.id);
    setTimeout(() => setShowConfirmation(null), 2000);
  };

  const updateQuantity = (e: React.MouseEvent, itemId: string, delta: number) => {
    e.stopPropagation();
    e.preventDefault();
    const currentQuantity = itemQuantities[itemId] || 1;
    const newQuantity = Math.max(1, currentQuantity + delta);
    setItemQuantities({ ...itemQuantities, [itemId]: newQuantity });
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const db = await getDB();
      const [items, cats] = await Promise.all([
        db.getAll('menu_items'),
        db.getAll('menu_categories')
      ]);

      const sortedCategories = cats.sort((a, b) => a.order - b.order);
      const mainCategories = sortedCategories.filter(c => c.type === 'main');
      
      setMenuItems(items);
      setCategories(sortedCategories);
      
      // Set initial selections
      if (mainCategories.length > 0) {
        const firstMain = mainCategories[0];
        const firstSub = sortedCategories.find(
          c => c.type === 'sub' && c.parentId === firstMain.id
        );
        
        setSelectedMainCategory(firstMain.id);
        if (firstSub) {
          setSelectedSubCategory(firstSub.id);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load menu items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const mainCategories = categories.filter(c => c.type === 'main');
  const subCategories = categories.filter(
    c => c.type === 'sub' && c.parentId === selectedMainCategory
  );

  const filteredItems = menuItems.filter(
    item => item.mainCategoryId === selectedMainCategory &&
           item.subCategoryId === selectedSubCategory &&
           item.available
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-serif text-[#5C4033] mb-4">QCart Menu</h1>
        <p className="text-lg text-[#8B4513] max-w-3xl mx-auto">
          Experience culinary excellence with our carefully crafted menu, featuring the finest ingredients
          and expert preparation.
        </p>
      </div>
      
      {/* Main Categories */}
      <div className="flex justify-center space-x-6 mb-8">
        {mainCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedMainCategory(category.id);
              const firstSub = categories.find(
                c => c.type === 'sub' && c.parentId === category.id
              );
              if (firstSub) {
                setSelectedSubCategory(firstSub.id);
              }
            }}
            className={`px-6 py-3 text-lg font-medium rounded-lg transition-colors ${
              selectedMainCategory === category.id
                ? 'bg-[#8B4513] text-white'
                : 'text-[#8B4513] hover:bg-[#F5DEB3]'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Sub Categories */}
      <div className="flex justify-center space-x-4 mb-12">
        {subCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedSubCategory(category.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedSubCategory === category.id
                ? 'bg-[#F5DEB3] text-[#8B4513]'
                : 'text-gray-600 hover:text-[#8B4513]'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/table/${tableId}/menu/${item.id}`)}
            className={`p-4 rounded-lg border text-left transition-all ${
              item.available 
                ? 'border-gray-200 hover:border-[#8B4513] hover:shadow-md cursor-pointer'
                : 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed'
            }`}
            disabled={!item.available}
          >
            <div className="aspect-square mb-2 rounded-md overflow-hidden bg-gray-100">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900">{item.name}</h3>
            <p className="text-[#8B4513] font-medium mt-1">
              ${item.price.toFixed(2)}
              {!item.available && (
                <span className="ml-2 text-red-600 text-sm">(Unavailable)</span>
              )}
              <ArrowRight className="w-4 h-4 inline-block ml-2" />
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}