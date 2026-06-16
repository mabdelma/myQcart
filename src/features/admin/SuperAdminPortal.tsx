import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Store, Users, ShoppingBag, DollarSign, LogOut, TrendingUp, Table, Coffee, BookOpen } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { PlatformAnalytics, TenantSummary } from '../../lib/api/types';

interface Row extends TenantSummary {
  users?: number;
  orders?: number;
  revenue?: number;
  customers?: number;
  tables?: number;
  menuItems?: number;
  storageEstimate?: string;
}

export function SuperAdminPortal() {
  const { logout } = useAuth();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, tenants] = await Promise.all([
        adminApi.platformAnalytics(),
        adminApi.listTenants(),
      ]);
      setAnalytics(stats);
      // Pull per-tenant order/revenue stats in parallel.
      const withStats = await Promise.all(
        tenants.map(async (t): Promise<Row> => {
          try {
            const d = await adminApi.getTenant(t.id);
            return { ...t, users: d.stats.users, orders: d.stats.orders, revenue: d.stats.revenue, customers: d.stats.customers, tables: d.stats.tables, menuItems: d.stats.menuItems, storageEstimate: d.stats.storageEstimate };
          } catch {
            return { ...t };
          }
        }),
      );
      setRows(withStats);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(t: Row) {
    setBusyId(t.id);
    try {
      await adminApi.setTenantStatus(t.id, !t.isActive);
      setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, isActive: !r.isActive } : r)));
      setAnalytics((a) =>
        a ? { ...a, activeTenants: a.activeTenants + (t.isActive ? -1 : 1) } : a,
      );
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to update tenant');
    } finally {
      setBusyId(null);
    }
  }

  const money = (n?: number) => `$${(n ?? 0).toFixed(2)}`;
  const growthColor = analytics && analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600';
  const growthIcon = analytics && analytics.monthlyGrowth >= 0 ? '▲' : '▼';

  const cards = [
    { label: 'Restaurants', value: analytics?.tenants ?? 0, icon: Store },
    { label: 'Active', value: analytics?.activeTenants ?? 0, icon: ShieldCheck },
    { label: 'Users', value: analytics?.users ?? 0, icon: Users },
    { label: 'Orders', value: analytics?.orders ?? 0, icon: ShoppingBag },
    { label: 'Revenue', value: money(analytics?.revenue), icon: DollarSign },
    { label: 'Customers', value: analytics?.customers ?? 0, icon: BookOpen },
    { label: 'Tables', value: analytics?.tables ?? 0, icon: Table },
    { label: 'Menu Items', value: analytics?.menuItems ?? 0, icon: Coffee },
    { label: 'Growth', value: analytics ? `${growthIcon} ${Math.abs(analytics.monthlyGrowth)}%` : '—', icon: TrendingUp, valueClass: growthColor },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#8B4513] text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-xl font-bold">QCart — Platform Admin</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {cards.map(({ label, value, icon: Icon, valueClass }) => (
            <div key={label} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Icon className="w-4 h-4" />{label}</div>
              <div className={`text-2xl font-bold text-gray-900 ${valueClass || ''}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Restaurants ({rows.length})</h2>
          </div>
          {loading ? (
            <p className="p-6 text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-gray-500">No restaurants yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium text-right">Orders</th>
                  <th className="px-6 py-3 font-medium text-right">Revenue</th>
                  <th className="px-6 py-3 font-medium text-right">Users</th>
                  <th className="px-6 py-3 font-medium text-right">Tables</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-gray-400">{t.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <a href={`/${t.slug}`} className="text-[#8B4513] hover:underline">/{t.slug}</a>
                    </td>
                    <td className="px-6 py-3 text-right">{t.orders ?? '—'}</td>
                    <td className="px-6 py-3 text-right">{t.revenue != null ? money(t.revenue) : '—'}</td>
                    <td className="px-6 py-3 text-right">{t.users ?? '—'}</td>
                    <td className="px-6 py-3 text-right">{t.tables ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {t.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => toggleActive(t)}
                        disabled={busyId === t.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${
                          t.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {busyId === t.id ? '…' : t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
