import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { MenuItem, MenuCategory } from '../../lib/db/schema';
import { uploadImage } from '../../lib/utils/imageUpload';
import { CategoryManagement } from './CategoryManagement';

export function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [showCategories, setShowCategories] = useState(false);
  const [availableSubCategories, setAvailableSubCategories] = useState<MenuCategory[]>([]);

  useEffect(() => {
    loadMenuItems();
  }, []);

  useEffect(() => {
    if (editingItem) {
      const subs = categories.filter(
        c => c.type === 'sub' && c.parentId === editingItem.mainCategoryId
      );
      setAvailableSubCategories(subs);
    }
  }, [editingItem?.mainCategoryId, categories]);

  async function loadMenuItems() {
    const db = await getDB();
    const [items, cats] = await Promise.all([
      db.getAll('menu_items'),
      db.getAll('menu_categories')
    ]);
    
    const sortedCategories = cats.sort((a, b) => a.order - b.order);
    const mainCategories = sortedCategories.filter(c => c.type === 'main');
    
    setMenuItems(items);
    setCategories(sortedCategories);
    
    if (mainCategories.length > 0 && !selectedMainCategory) {
      setSelectedMainCategory(mainCategories[0].id);
    }
  }

  async function saveMenuItem(item: MenuItem) {
    const db = await getDB();
    await db.put('menu_items', item);
    setEditingItem(null);
    loadMenuItems();
  }

  async function deleteMenuItem(id: string) {
    const db = await getDB();
    await db.delete('menu_items', id);
    loadMenuItems();
  }

  const mainCategories = categories.filter(c => c.type === 'main');
  const subCategories = categories.filter(
    c => c.type === 'sub' && 
    c.parentId === selectedMainCategory
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <div className="flex items-center">
          <button
            onClick={() => {
              loadMenuItems().then(() => {
                const firstMainCategory = mainCategories[0]?.id || '';
                const firstSubCategory = categories.find(
                  c => c.type === 'sub' && c.parentId === firstMainCategory
                )?.id || '';
                // Reset the form completely including the image
                setEditingItem({
                  id: crypto.randomUUID(),
                  name: '',
                  description: '',
                  price: 0,
                  mainCategoryId: firstMainCategory,
                  subCategoryId: firstSubCategory,
                  image: '',
                  available: true
                });
                // Reset any file input by clearing its value
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) {
                  fileInput.value = '';
                }
              });
            }}
            className="flex items-center px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Item
          </button>
          <button
            onClick={() => setShowCategories(true)}
            className="flex items-center px-4 py-2 ml-4 bg-white text-[#8B4513] border border-[#8B4513] rounded-md hover:bg-[#F5DEB3]"
          >
            Manage Categories
          </button>
        </div>
      </div>

      {showCategories && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Manage Categories</h3>
              <button
                onClick={() => setShowCategories(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <CategoryManagement />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold mb-4">
              {editingItem.id ? 'Edit Menu Item' : 'New Menu Item'}
            </h3>
            <button
              onClick={() => setEditingItem(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMenuItem(editingItem);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  placeholder="Enter item description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.price.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      const price = value === '' ? 0 : parseFloat(value);
                      setEditingItem({ ...editingItem, price: isNaN(price) ? 0 : price });
                    }}
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Main Category</label>
                  <select
                    value={editingItem.mainCategoryId}
                    onChange={(e) => {
                      const mainCategoryId = e.target.value;
                      const firstSubCategory = categories.find(
                        c => c.type === 'sub' && c.parentId === mainCategoryId
                      );
                      setEditingItem({
                        ...editingItem,
                        mainCategoryId,
                        subCategoryId: firstSubCategory?.id || ''
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {mainCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sub Category</label>
                  <select
                    value={editingItem.subCategoryId}
                    onChange={(e) => setEditingItem({ ...editingItem, subCategoryId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {availableSubCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1 flex items-center space-x-4">
                  <div className="relative h-20 w-20 bg-gray-100 rounded-md overflow-hidden">
                    {editingItem.image ? (
                      <img
                        src={editingItem.image}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                    <div className="h-20 w-20 bg-gray-100 rounded-md flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <span>Upload Image</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      key={editingItem.id} // Force input recreation
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const imageUrl = await uploadImage(file);
                            setEditingItem({ ...editingItem, image: imageUrl });
                          } catch (error) {
                            console.error('Failed to upload image:', error);
                          }
                        }
                      }}
                    />
                  </label>
                  {editingItem.image && (
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, image: '' })}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingItem.available}
                  onChange={(e) => setEditingItem({ ...editingItem, available: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Available</label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {mainCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedMainCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedMainCategory === category.id
                  ? 'bg-[#F5DEB3] text-[#8B4513]'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems
          .filter(item => item.mainCategoryId === selectedMainCategory)
          .sort((a, b) => {
            const subCatA = categories.find(c => c.id === a.subCategoryId);
            const subCatB = categories.find(c => c.id === b.subCategoryId);
            return (subCatA?.order || 0) - (subCatB?.order || 0);
          })
          .map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <div className="relative aspect-video mb-4 bg-gray-100 rounded-md overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
              <span className="text-lg font-medium text-gray-900">${item.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-indigo-600">
                {categories.find(c => c.id === item.subCategoryId)?.name}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4">{item.description}</p>
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded-full text-sm ${
                item.available
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.available ? 'Available' : 'Unavailable'}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-2 text-gray-600 hover:text-indigo-600"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deleteMenuItem(item.id)}
                  className="p-2 text-gray-600 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}