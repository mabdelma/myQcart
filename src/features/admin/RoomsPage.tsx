import { useState, useEffect, useCallback } from 'react';
import { Plus, X, BedDouble, Hotel } from 'lucide-react';
import { hotelApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import type { Room, RoomStatus, RoomStats } from '../../lib/api/types';

const STATUSES: RoomStatus[] = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'];

const STATUS_STYLE: Record<RoomStatus, string> = {
  available: 'bg-green-50 border-green-300 text-green-800',
  occupied: 'bg-blue-50 border-blue-300 text-blue-800',
  reserved: 'bg-amber-50 border-amber-300 text-amber-800',
  cleaning: 'bg-purple-50 border-purple-300 text-purple-800',
  maintenance: 'bg-gray-100 border-gray-300 text-gray-700',
};
const DOT: Record<RoomStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-blue-500',
  reserved: 'bg-amber-500',
  cleaning: 'bg-purple-500',
  maintenance: 'bg-gray-400',
};

export function RoomsPage() {
  const { t } = useI18n();
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [editing, setEditing] = useState<Room | null>(null);
  const [creating, setCreating] = useState<{ number: string; type: string; floor: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const statusLabel = (s: RoomStatus) => t(`hotel.status.${s}`);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [r, s] = await Promise.all([hotelApi.list(slug), hotelApi.stats(slug)]);
      setRooms(r); setStats(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const shown = rooms.filter((r) => filter === 'all' || r.status === filter);

  async function setStatus(room: Room, status: RoomStatus) {
    if (!slug || room.status === status) return;
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status } : r)));
    try { await hotelApi.setStatus(slug, room.id, status); } catch { /* ignore */ }
    await load();
  }

  async function create() {
    if (!slug || !creating?.number.trim()) return;
    setSaving(true);
    try {
      await hotelApi.create(slug, { number: creating.number, type: creating.type || undefined, floor: creating.floor || undefined });
      setCreating(null); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!slug || !editing) return;
    setSaving(true);
    try {
      await hotelApi.update(slug, editing.id, { number: editing.number, type: editing.type || undefined, floor: editing.floor || undefined, notes: editing.notes || undefined });
      if (editing.status !== 'available') await hotelApi.setStatus(slug, editing.id, editing.status, editing.guestName || undefined);
      setEditing(null); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function remove() {
    if (!slug || !editing) return;
    setSaving(true);
    try { await hotelApi.delete(slug, editing.id); setEditing(null); await load(); }
    catch { /* ignore */ } finally { setSaving(false); }
  }

  const statCards: { key: RoomStatus | 'occupancy'; value: number; label: string }[] = stats ? [
    { key: 'occupancy', value: stats.occupancy, label: t('hotel.occupancy') },
    { key: 'available', value: stats.available, label: statusLabel('available') },
    { key: 'occupied', value: stats.occupied, label: statusLabel('occupied') },
    { key: 'cleaning', value: stats.cleaning, label: statusLabel('cleaning') },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Hotel className="w-6 h-6 text-[#8B4513]" /> {t('hotel.title')}</h2>
        <button onClick={() => setCreating({ number: '', type: '', floor: '' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#8B4513] text-white text-sm hover:bg-[#5C4033]">
          <Plus className="w-4 h-4" /> {t('hotel.addRoom')}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.key} className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}{s.key === 'occupancy' ? '%' : ''}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${filter === s ? 'bg-[#8B4513] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s !== 'all' && <span className={`w-2 h-2 rounded-full ${DOT[s]}`} />}
            {s === 'all' ? t('menu.categoryAll') : statusLabel(s)}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-500">{t('common.loading')}...</p> : shown.length === 0 ? (
        <p className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">{t('hotel.noRooms')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {shown.map((room) => (
            <div key={room.id} className={`rounded-xl border p-4 ${STATUS_STYLE[room.status]}`}>
              <div className="flex items-start justify-between">
                <button onClick={() => setEditing(room)} className="text-left">
                  <p className="font-bold text-lg flex items-center gap-1.5"><BedDouble className="w-4 h-4" /> {room.number}</p>
                  <p className="text-xs opacity-80">{room.type || t('hotel.room')}{room.floor ? ` · ${t('hotel.floor')} ${room.floor}` : ''}</p>
                </button>
              </div>
              {room.guestName && <p className="text-xs mt-1 font-medium truncate">{room.guestName}</p>}
              <select value={room.status} onChange={(e) => setStatus(room, e.target.value as RoomStatus)}
                className="mt-3 w-full text-xs rounded-md border-0 bg-white/70 py-1.5 font-medium focus:ring-1 focus:ring-[#8B4513]">
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title={t('hotel.addRoom')} onClose={() => setCreating(null)}>
          <Field label={t('hotel.roomNumber')}><input autoFocus value={creating.number} onChange={(e) => setCreating({ ...creating, number: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('hotel.roomType')}><input value={creating.type} onChange={(e) => setCreating({ ...creating, type: e.target.value })} placeholder={t('hotel.roomTypeHint')} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
            <Field label={t('hotel.floor')}><input value={creating.floor} onChange={(e) => setCreating({ ...creating, floor: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(null)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={create} disabled={saving || !creating.number.trim()} className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50">{t('common.save')}</button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`${t('hotel.room')} ${editing.number}`} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('hotel.roomNumber')}><input value={editing.number} onChange={(e) => setEditing({ ...editing, number: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
            <Field label={t('hotel.floor')}><input value={editing.floor || ''} onChange={(e) => setEditing({ ...editing, floor: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          </div>
          <Field label={t('hotel.roomType')}><input value={editing.type || ''} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          <Field label={t('hotel.status.label')}>
            <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as RoomStatus })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]">
              {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </Field>
          {(editing.status === 'occupied' || editing.status === 'reserved') && (
            <Field label={t('hotel.guest')}><input value={editing.guestName || ''} onChange={(e) => setEditing({ ...editing, guestName: e.target.value })} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          )}
          <Field label={t('common.notes')}><textarea value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} className="block w-full rounded-md border-gray-300 text-sm focus:ring-[#8B4513] focus:border-[#8B4513]" /></Field>
          <div className="flex justify-between gap-2">
            <button onClick={remove} disabled={saving} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50">{t('common.delete')}</button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50">{t('common.save')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
