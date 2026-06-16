import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, QrCode } from 'lucide-react';
import { tableApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { QrCodeModal } from '../../components/ui/QrCodeModal';
import type { TableData } from '../../lib/api/types';

export function TableManagement() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: 1, capacity: 2 });
  const [qrModal, setQrModal] = useState<TableData | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    tableApi.list(slug)
      .then(setTables)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    try {
      await tableApi.create(slug, form);
      setShowForm(false);
      setForm({ number: tables.length + 1, capacity: 2 });
      const updated = await tableApi.list(slug);
      setTables(updated);
    } catch (err) {
      console.error('Failed to create table:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!slug) return;
    try {
      await tableApi.delete(slug, id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  }

  function getQRUrl(table: TableData) {
    return `${window.location.origin}/table/${table.id}/menu?token=${table.qrToken}`;
  }

  if (!slug) return <div className="p-4 text-gray-500">Loading tenant...</div>;
  if (loading) return <div className="p-4 text-gray-500">Loading tables...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Table Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]"
        >
          <PlusCircle className="w-5 h-5 mr-2" /> Add Table
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">New Table</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Table Number</label>
                <input type="number" min="1" required value={form.number}
                  onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) || 1 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input type="number" min="1" required value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 2 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]" />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033]">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold">Table {table.number}</h3>
                <p className="text-sm text-gray-500">Capacity: {table.capacity}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                table.status === 'available' ? 'bg-green-100 text-green-800' :
                table.status === 'occupied' ? 'bg-orange-100 text-orange-800' :
                table.status === 'reserved' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {table.status}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setQrModal(table)}
                className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <QrCode className="w-4 h-4 mr-1" /> QR
              </button>
              <button
                onClick={() => handleDelete(table.id)}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <p className="text-center text-gray-500 py-12">No tables yet. Click "Add Table" to create one.</p>
      )}

      {qrModal && (
        <QrCodeModal
          url={getQRUrl(qrModal)}
          label={`Table ${qrModal.number}`}
          onClose={() => setQrModal(null)}
        />
      )}
    </div>
  );
}
