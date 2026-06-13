import { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { menuApi, uploadApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { MenuItem, MenuCategory } from '../../lib/api/types';

export function MenuManagement() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    menuApi.getFullMenu(slug)
      .then((data) => {
        setCategories(data.categories.filter((c) => c.type === 'main'));
        setItems(data.items);
        if (data.categories.length > 0) setSelectedCategory(data.categories[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !editing) return;
    try {
      if (editing.id) {
        await menuApi.updateItem(slug, editing.id, editing);
      } else {
        await menuApi.createItem(slug, editing as any);
      }
      setEditing(null);
      const data = await menuApi.getFullMenu(slug);
      setItems(data.items);
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!slug) return;
    try {
      await menuApi.deleteItem(slug, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  if (!slug) return <div className="p-4 text-gray-500">Loading tenant...</div>;
  if (loading) return <div className="p-4 text-gray-500">Loading menu...</div>;

  const filteredItems = selectedCategory
    ? items.filter((i) => i.categoryId === selectedCategory)
    : items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <button
          onClick={() => setEditing({ name: '', price: 0, categoryId: selectedCategory, available: true })}
          className="flex items-center px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          <PlusCircle className="w-5 h-5 mr-2" /> Add Item
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">{editing.id ? 'Edit Item' : 'New Item'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text" required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <div className="flex items-center gap-3">
                  {editing.imageUrl && (
                    <img src={editing.imageUrl} alt="" className="w-16 h-16 rounded object-cover border" />
                  )}
                  <button type="button" onClick={async () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/png,image/webp';
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file || !slug) return;
                      try {
                        const { url } = await uploadApi.image(slug, file);
                        setEditing({ ...editing, imageUrl: url });
                      } catch { /* ignore */ }
                    };
                    input.click();
                  }}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={editing.price || 0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={editing.categoryId || ''}
                    onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox" id="avail"
                  checked={editing.available ?? true}
                  onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                  className="h-4 w-4 text-[#8B4513] border-gray-300 rounded"
                />
                <label htmlFor="avail" className="ml-2 text-sm text-gray-900">Available</label>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex space-x-4 overflow-x-auto pb-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === c.id
                ? 'bg-[#F5DEB3] text-[#8B4513]'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            selectedCategory === ''
              ? 'bg-[#F5DEB3] text-[#8B4513]'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <div className="aspect-video mb-4 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
              <span className="text-lg font-medium">${item.price.toFixed(2)}</span>
            </div>
            {item.description && (
              <p className="text-gray-600 text-sm mb-4">{item.description}</p>
            )}
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded-full text-sm ${
                item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.available ? 'Available' : 'Unavailable'}
              </span>
              <div className="flex space-x-2">
                <button onClick={() => setEditing(item)} className="p-2 text-gray-600 hover:text-indigo-600">
                  <Edit className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-600 hover:text-red-600">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-gray-500 py-12">No menu items found. Click "Add Item" to create one.</p>
      )}
    </div>
  );
}
