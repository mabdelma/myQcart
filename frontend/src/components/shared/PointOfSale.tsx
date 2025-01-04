import React, { useState, useEffect } from 'react';
import { getDB } from '../../lib/db';
import { generateOrderId } from '../../lib/utils/orderUtils';
import { Search, Plus, Minus, Trash2, MessageCircle } from 'lucide-react';
import type { MenuItem, MenuCategory, Order, Table } from '../../lib/db/schema';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { useAuth } from '../../contexts/AuthContext';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface PointOfSaleProps {
  role: 'waiter' | 'cashier';
}

export function PointOfSale({ role }: PointOfSaleProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
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
      const [items, cats, allTables] = await Promise.all([
        db.getAll('menu_items'),
        db.getAll('menu_categories'),
        db.getAll('tables')
      ]);

      const mainCategories = cats.filter(c => c.type === 'main');
      const occupiedTables = allTables.filter(t => t.status === 'occupied');
      
      setMenuItems(items);
      setCategories(cats);
      setTables(occupiedTables);
      
      if (mainCategories.length > 0) {
        setSelectedCategory(mainCategories[0].id);
      }
      if (occupiedTables.length > 0) {
        setSelectedTable(occupiedTables[0].id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
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

  const createOrder = async () => {
    if (!authState.user) {
      setError('You must be logged in to create orders');
      return;
    }

    if (!selectedTable) {
      setError('Please select a table');
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
      const order: Order = {
        id: generateOrderId(),
        tableId: selectedTable,
        waiterStaffId: role === 'waiter' ? authState.user.id : undefined,
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

      await db.add('orders', order);
      setCart([]);
      setError(null);
    } catch (err) {
      console.error('Failed to create order:', err);
      setError('Failed to create order');
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
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select an occupied table</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Table {table.number} (Capacity: {table.capacity})
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="flex space-x-2 overflow-x-auto">
            {categories
              .filter(cat => cat.type === 'main')
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  item.available 
                    ? 'border-gray-200 hover:border-indigo-500 hover:shadow-md cursor-pointer'
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
                <p className="text-indigo-600 font-medium mt-1">
                  ${item.price.toFixed(2)}
                  {!item.available && (
                    <span className="ml-2 text-red-600 text-sm">(Unavailable)</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="bg-white rounded-lg shadow p-6 flex flex-col">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.menuItem.name}</h4>
                    <p className="text-sm text-gray-500">
                      ${item.menuItem.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.menuItem.id, -1)}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItem.id, 1)}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingNotes(item.menuItem.id);
                          setNoteText(item.notes || '');
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={item.notes || 'Add notes'}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {editingNotes && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h4>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add special instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      rows={4}
                    />
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveNotes(editingNotes)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t mt-4 pt-4">
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          <button
            onClick={createOrder}
            disabled={cart.length === 0 || !selectedTable || processing}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {processing ? <LoadingSpinner /> : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}