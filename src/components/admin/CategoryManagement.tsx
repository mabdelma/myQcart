import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { menuApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import type { MenuCategory } from '../../lib/api/types';

export function CategoryManagement() {
  const { t } = useI18n();
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  useEffect(() => {
    if (slug) loadCategories();
  }, [slug]);

  async function loadCategories() {
    if (!slug) return;
    const data = await menuApi.getFullMenu(slug);
    setCategories(data.categories.sort((a, b) => a.sortOrder - b.sortOrder));
  }

  async function saveCategory(category: MenuCategory) {
    if (!slug) return;
    const isNew = !categories.find(c => c.id === category.id);
    if (isNew) {
      await menuApi.createCategory(slug, {
        name: category.name,
        type: category.type,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
      });
    } else {
      await menuApi.updateCategory(slug, category.id, {
        name: category.name,
        type: category.type,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
      });
    }
    setEditingCategory(null);
    loadCategories();
  }

  async function deleteCategory(id: string) {
    if (!slug) return;
    await menuApi.deleteCategory(slug, id);
    loadCategories();
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    if (!slug) return;
    const currentIndex = categories.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[currentIndex].sortOrder;
    updated[currentIndex] = { ...updated[currentIndex], sortOrder: updated[newIndex].sortOrder };
    updated[newIndex] = { ...updated[newIndex], sortOrder: temp };
    setCategories(updated);

    try {
      await menuApi.reorderCategories(slug, [
        { id: updated[currentIndex].id, sortOrder: updated[currentIndex].sortOrder },
        { id: updated[newIndex].id, sortOrder: updated[newIndex].sortOrder },
      ]);
    } catch {
      loadCategories();
    }
  }

  const mainCategories = categories.filter(c => c.type === 'main');
  const subCategories = categories.filter(c => c.type === 'sub');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('menu.categories')}</h2>
        <button
          onClick={() => setEditingCategory({
            id: crypto.randomUUID(),
            name: '',
            type: 'main',
            tenantId: '',
            sortOrder: categories.length
          })}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {t('common.create')}
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
                <label htmlFor="category-name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  id="category-name"
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="category-type" className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  id="category-type"
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
                  <label htmlFor="category-parent" className="block text-sm font-medium text-gray-700">Parent Category</label>
                  <select
                    id="category-parent"
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
                        aria-label="Move up"
                        className="text-gray-600 hover:text-gray-900 mr-2"
                      >
                        <MoveUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => moveCategory(category.id, 'down')}
                        aria-label="Move down"
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        <MoveDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(category)}
                        aria-label="Edit category"
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        aria-label="Delete category"
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
                        aria-label="Move up"
                        className="text-gray-600 hover:text-gray-900 mr-2"
                      >
                        <MoveUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => moveCategory(category.id, 'down')}
                        aria-label="Move down"
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        <MoveDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(category)}
                        aria-label="Edit category"
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        aria-label="Delete category"
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


