import React, { useState, useEffect } from 'react';
import { getDB } from '../../lib/db';
import { generateOrderId } from '../../lib/utils/orderUtils';
import { Search, Plus, Minus, Trash2, DollarSign, MessageCircle } from 'lucide-react';
import type { MenuItem, MenuCategory, Order, Payment } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { useAuth } from '../../contexts/AuthContext';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export function PointOfSale() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const { state: authState } = useAuth();

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

      const mainCategories = cats.filter(c => c.type === 'main');
      setMenuItems(items);
      setCategories(cats);
      if (mainCategories.length > 0) {
        setSelectedCategory(mainCategories[0].id);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load menu data:', err);
      setError('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.mainCategoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return item.available && matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart(current => {
      const existing = current.find(i => i.menuItem.id === item.id);
      if (existing) {
        return current.map(i => 
          i.menuItem.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...current, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(current => {
      return current.map(item => {
        if (item.menuItem.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(current => current.filter(item => item.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const saveNotes = (itemId: string) => {
    setCart(current => 
      current.map(item => 
        item.menuItem.id === itemId 
          ? { ...item, notes: noteText }
          : item
      )
    );
    setEditingNotes(null);
    setNoteText('');
  };

  const total = cart.reduce(
    (sum, item) => sum + (item.menuItem.price * item.quantity),
    0
  );

  const processOrder = async () => {
    if (!authState.user) {
      setError('You must be logged in to process orders');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const db = await getDB();
      const orderId = generateOrderId();

      const order: Order = {
        id: orderId,
        tableId: 'counter',
        status: 'pending',
        paymentStatus: 'pending',
        items: cart.map(item => ({
          id: crypto.randomUUID(),
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes
        })),
        total,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const payment: Payment = {
        id: crypto.randomUUID(),
        orderId,
        amount: total,
        method: 'cash',
        status: 'pending',
        createdAt: new Date()
      };

      // Save both order and payment
      const tx = db.transaction(['orders', 'payments'], 'readwrite');
      await Promise.all([
        tx.objectStore('orders').add(order),
        tx.objectStore('payments').add(payment)
      ]);
      await tx.done;

      // Clear cart after successful order
      clearCart();
      setError(null);
    } catch (err) {
      console.error('Failed to process order:', err);
      setError('Failed to process order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-5rem)]">
      {/* Menu Section */}
      <div className="col-span-2 bg-white rounded-lg shadow p-6 overflow-hidden flex flex-col">
        <div className="space-y-4 mb-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories
              .filter(cat => cat.type === 'main')
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-[#F5DEB3] text-[#8B4513]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="p-4 rounded-lg border border-gray-200 hover:border-[#8B4513] hover:shadow-md transition-all text-left"
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
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="bg-white rounded-lg shadow p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Order</h2>
        
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-medium">{item.menuItem.name}</h3>
                      <p className="text-gray-500">${item.menuItem.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="p-1 hover:bg-[#F5DEB3] rounded text-[#8B4513] transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-[#5C4033] font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="p-1 hover:bg-[#F5DEB3] rounded text-[#8B4513] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingNotes(item.menuItem.id);
                            setNoteText(item.notes || '');
                          }}
                          className="p-1 text-[#8B4513] hover:bg-[#F5DEB3] rounded transition-colors"
                          title={item.notes || 'Add notes'}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {editingNotes === item.menuItem.id && (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add special instructions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#8B4513] focus:border-[#8B4513] text-sm"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveNotes(item.menuItem.id)}
                          className="px-3 py-1 text-sm bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {item.notes && editingNotes !== item.menuItem.id && (
                    <div className="mt-1 text-sm text-gray-600 italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={clearCart}
              disabled={cart.length === 0 || processing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Clear Cart
            </button>
            <button
              onClick={processOrder}
              disabled={cart.length === 0 || processing}
              className="px-4 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] disabled:opacity-50 flex items-center justify-center"
            >
              {processing ? (
                <LoadingSpinner />
              ) : (
                <>
                  <DollarSign className="w-5 h-5 mr-2" />
                  Process Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}