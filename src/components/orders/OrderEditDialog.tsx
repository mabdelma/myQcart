import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, MessageCircle } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { Order, MenuItem, Table } from '../../lib/db/schema';

interface OrderEditDialogProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderEditDialog({ order, onClose, onUpdate }: OrderEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState(order.tableId);
  const [items, setItems] = useState(order.items);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [showAddItems, setShowAddItems] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const db = await getDB();
      const [allTables, allMenuItems, allCategories] = await Promise.all([
        db.getAll('tables'),
        db.getAll('menu_items'),
        db.getAll('menu_categories')
      ]);

      setTables(allTables);
      setMenuItems(Object.fromEntries(
        allMenuItems.map(item => [item.id, item])
      ));
      
      const sortedCategories = allCategories.sort((a, b) => a.order - b.order);
      const mainCategories = sortedCategories.filter(c => c.type === 'main');
      
      setCategories(sortedCategories);
      if (mainCategories.length > 0) {
        setSelectedCategory(mainCategories[0].id);
        const firstSub = sortedCategories.find(
          c => c.type === 'sub' && c.parentId === mainCategories[0].id
        );
        if (firstSub) {
          setSelectedSubCategory(firstSub.id);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    }
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(current => 
      current.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as typeof items
    );
  };

  const removeItem = (itemId: string) => {
    setItems(current => current.filter(item => item.id !== itemId));
  };

  const addItem = (menuItem: MenuItem) => {
    setItems(current => {
      const existing = current.find(i => i.menuItemId === menuItem.id);
      if (existing) {
        return current.map(i => 
          i.menuItemId === menuItem.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...current, {
        id: crypto.randomUUID(),
        menuItemId: menuItem.id,
        quantity: 1
      }];
    });
  };

  const saveNotes = (itemId: string) => {
    setItems(current => 
      current.map(item => 
        item.id === itemId 
          ? { ...item, notes: noteText }
          : item
      )
    );
    setEditingNotes(null);
    setNoteText('');
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const menuItem = menuItems[item.menuItemId];
      return sum + (menuItem?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedTable) {
      setError('Please select a table');
      return;
    }

    if (items.length === 0) {
      setError('Order must have at least one item');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDB();
      const updatedOrder = {
        ...order,
        tableId: selectedTable,
        items,
        total: calculateTotal(),
        updatedAt: new Date()
      };
      
      await db.put('orders', updatedOrder);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update order:', error);
      setError('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = Object.values(menuItems).filter(item => {
    // First filter by category and subcategory
    if (item.mainCategoryId !== selectedCategory) return false;
    if (item.subCategoryId !== selectedSubCategory) return false;
    
    // Then apply search filter if exists
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Edit Order</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Table {table.number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                <button
                  onClick={() => setShowAddItems(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Items
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item) => {
                  const menuItem = menuItems[item.menuItemId];
                  if (!menuItem) return null;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{menuItem.name}</h4>
                        <p className="text-sm text-gray-500">${menuItem.price.toFixed(2)} each</p>
                        {item.notes && (
                          <p className="text-xs text-amber-600 mt-1 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingNotes(item.id);
                              setNoteText(item.notes || '');
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title={item.notes || 'Add notes'}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-between items-center text-lg font-bold mb-6">
            <span>Total</span>
            <span>${calculateTotal().toFixed(2)}</span>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      {showAddItems && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Add Items</h3>
                <button
                  onClick={() => setShowAddItems(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
              />
              
              <div className="flex space-x-4 mb-4 overflow-x-auto pb-2">
                {categories
                  .filter(cat => cat.type === 'main')
                  .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        const firstSub = categories.find(
                          c => c.type === 'sub' && c.parentId === category.id
                        );
                        if (firstSub) {
                          setSelectedSubCategory(firstSub.id);
                        }
                      }}
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
              
              {selectedCategory && (
                <div className="flex space-x-4 mb-4 overflow-x-auto pb-2">
                  {categories
                    .filter(cat => cat.type === 'sub' && cat.parentId === selectedCategory)
                    .map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedSubCategory(category.id)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                          selectedSubCategory === category.id
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {selectedCategory && selectedSubCategory && (
                  <div className="col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {filteredMenuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItem(item)}
                          className="flex items-center p-4 border rounded-lg hover:border-indigo-500 hover:shadow-sm"
                        >
                          <div className="w-full">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                            {item.notes && (
                              <p className="text-xs text-amber-600 mt-1 italic">
                                "{item.notes}"
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {filteredMenuItems.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No items found in this category
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setShowAddItems(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
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
  );
}