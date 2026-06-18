import { useState, useEffect, useCallback } from 'react';
import { Clock, User, Users, Phone, CheckCircle, XCircle, Trash2, Bell } from 'lucide-react';
import { waitlistApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import type { WaitlistEntry } from '../../lib/api/types';

const STATUS_OPTIONS = ['waiting', 'notified', 'seated', 'cancelled', 'expired'] as const;

export function WaitlistManagement() {
  const { t } = useI18n();
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('waiting');

  const fetchEntries = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await waitlistApi.list(slug, filterStatus || undefined);
      setEntries(data);
    } catch {
      setError('Failed to load waitlist');
    }
    setLoading(false);
  }, [slug, filterStatus]);

  useEffect(() => {
    if (!slug) return;
    fetchEntries();
    const interval = setInterval(fetchEntries, 15000);
    return () => clearInterval(interval);
  }, [slug, fetchEntries]);

  async function changeStatus(entryId: string, status: string) {
    if (!slug) return;
    try {
      await waitlistApi.updateStatus(slug, entryId, status);
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status: status as WaitlistEntry['status'] } : e));
    } catch {
      setError('Failed to update status');
    }
  }

  async function removeEntry(entryId: string) {
    if (!slug || !window.confirm('Remove this entry from the waitlist?')) return;
    try {
      await waitlistApi.delete(slug, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch {
      setError('Failed to remove entry');
    }
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      waiting: 'bg-yellow-100 text-yellow-800',
      notified: 'bg-blue-100 text-blue-800',
      seated: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-200 text-gray-600',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;

  if (!slug) return <div className="p-4 text-gray-500">Loading tenant...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Waitlist</h2>
          {waitingCount > 0 && (
            <span className="bg-[#8B4513] text-white text-sm px-3 py-1 rounded-full">
              {waitingCount} waiting
            </span>
          )}
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm text-sm focus:border-[#8B4513] focus:ring-[#8B4513]">
          <option value="waiting">Waiting</option>
          <option value="">All</option>
          <option value="notified">Notified</option>
          <option value="seated">Seated</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No entries in the waitlist.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-500">
                  {entry.position || '-'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{entry.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(entry.status)}`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{entry.partySize}</span>
                    {entry.customerPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{entry.customerPhone}</span>}
                    {entry.estimatedWaitMinutes != null && entry.status === 'waiting' && (
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{entry.estimatedWaitMinutes} min</span>
                    )}
                  </div>
                  {entry.notes && <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {entry.status === 'waiting' && (
                  <button onClick={() => changeStatus(entry.id, 'notified')}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Notify customer">
                    <Bell className="w-4 h-4" />
                  </button>
                )}
                {entry.status === 'notified' && (
                  <button onClick={() => changeStatus(entry.id, 'seated')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Mark seated">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {(entry.status === 'waiting' || entry.status === 'notified') && (
                  <button onClick={() => changeStatus(entry.id, 'cancelled')}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancel">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => removeEntry(entry.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
