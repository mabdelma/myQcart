import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { getDB } from '../../lib/db';
import type { MenuCategory } from '../../lib/db/schema';

export function CategoryManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const db = await getDB();
    const allCategories = await db.getAll('menu_categories');
    setCategories(allCategories.sort((a, b) => a.order - b.order));
  }

  async function saveCategory(category: MenuCategory) {
    const db = await getDB();
    await db.put('menu_categories', category);
    setEditingCategory(null);
    loadCategories();
  }

  async function deleteCategory(id: string) {
    const db = await getDB();
    await db.delete('menu_categories', id);
    loadCategories();
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const currentIndex = categories.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const db = await getDB();
    const currentCategory = categories[currentIndex];
    const swapCategory = categories[newIndex];

    const currentOrder = currentCategory.order;
    currentCategory.order = swapCategory.order;
    swapCategory.order = currentOrder;

    await db.put('menu_categories', currentCategory);
    await db.put('menu_categories', swapCategory);
    loadCategories();
  }

  const mainCategories = categories.filter(c => c.type === 'main');
  const subCategories = categories.filter(c => c.type === 'sub');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
        <button
          onClick={() => setEditingCategory({
            id: crypto.randomUUID(),
            name: '',
            type: 'main',
            order: categories.length
          })}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Add Category
        </button>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {editingCategory.id ? 'Edit Category' : 'New Category'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveCategory(editingCategory);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={editingCategory.type}
                  onChange={(e) => {
                    const type = e.target.value as 'main' | 'sub';
                    setEditingCategory({
                      ...editingCategory,
                      type,
                      parentId: type === 'main' ? undefined : editingCategory.parentId
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="main">Main Category</option>
                  <option value="sub">Sub Category</option>
                </select>
              </div>
              {editingCategory.type === 'sub' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent Category</label>
                  <select
                    value={editingCategory.parentId}
                    onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select a parent category</option>
                    {mainCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
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

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Main Categories</h3>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mainCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => moveCategory(category.id, 'up')}
                        className="text-gray-600 hover:text-gray-900 mr-2"
                      >
                        <MoveUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => moveCategory(category.id, 'down')}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        <MoveDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sub Categories</h3>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {mainCategories.find(c => c.id === category.parentId)?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => moveCategory(category.id, 'up')}
                        className="text-gray-600 hover:text-gray-900 mr-2"
                      >
                        <MoveUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => moveCategory(category.id, 'down')}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        <MoveDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}