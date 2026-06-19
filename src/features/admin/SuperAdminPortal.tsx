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
  const [section, setSection] = useState<'overview' | 'restaurants' | 'billing'>('overview');

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

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: ShieldCheck },
    { id: 'restaurants' as const, label: 'Restaurants', icon: Store },
    { id: 'billing' as const, label: 'Billing', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Escoutly-style central sidebar */}
      <aside className="w-60 shrink-0 bg-[#5C4033] text-white flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <ShieldCheck className="w-7 h-7" />
          <span className="text-lg font-bold">Qlisted Central</span>
        </div>
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A26B]">Platform</p>
        <nav className="space-y-1 flex-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors ${section === id ? 'bg-[#8B4513] text-white' : 'text-[#F5DEB3] hover:bg-[#6A4B35]'}`}>
              <Icon className="w-5 h-5" />{label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#F5DEB3] hover:bg-[#6A4B35] rounded-lg">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">{nav.find((n) => n.id === section)?.label}</h1>
          <p className="text-sm text-gray-500">Platform administration · all restaurants</p>
        </header>

        <div className="p-8">
          {error && <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>}

          {section === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {cards.map(({ label, value, icon: Icon, valueClass }) => (
                <div key={label} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Icon className="w-4 h-4" />{label}</div>
                  <div className={`text-2xl font-bold text-gray-900 ${valueClass || ''}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {section === 'restaurants' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Restaurants ({rows.length})</h2></div>
              {loading ? <p className="p-6 text-gray-500">Loading…</p> : rows.length === 0 ? <p className="p-6 text-gray-500">No restaurants yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Slug</th>
                      <th className="px-6 py-3 font-medium text-right">Orders</th><th className="px-6 py-3 font-medium text-right">Revenue</th>
                      <th className="px-6 py-3 font-medium text-right">Users</th><th className="px-6 py-3 font-medium text-right">Tables</th>
                      <th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((t) => (
                      <tr key={t.id}>
                        <td className="px-6 py-3"><div className="font-medium text-gray-900">{t.name}</div><div className="text-gray-400">{t.email}</div></td>
                        <td className="px-6 py-3"><a href={`/${t.slug}`} className="text-[#8B4513] hover:underline">/{t.slug}</a></td>
                        <td className="px-6 py-3 text-right">{t.orders ?? '—'}</td>
                        <td className="px-6 py-3 text-right">{t.revenue != null ? money(t.revenue) : '—'}</td>
                        <td className="px-6 py-3 text-right">{t.users ?? '—'}</td>
                        <td className="px-6 py-3 text-right">{t.tables ?? '—'}</td>
                        <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{t.isActive ? 'Active' : 'Disabled'}</span></td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => toggleActive(t)} disabled={busyId === t.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${t.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                            {busyId === t.id ? '…' : t.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {section === 'billing' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Revenue by restaurant</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left"><tr>
                  <th className="px-6 py-3 font-medium">Restaurant</th><th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Orders</th><th className="px-6 py-3 font-medium text-right">Revenue</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{t.isActive ? 'Active' : 'Disabled'}</span></td>
                      <td className="px-6 py-3 text-right">{t.orders ?? '—'}</td>
                      <td className="px-6 py-3 text-right">{t.revenue != null ? money(t.revenue) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold"><td className="px-6 py-3">Total</td><td /><td className="px-6 py-3 text-right">{rows.reduce((s, t) => s + (t.orders || 0), 0)}</td><td className="px-6 py-3 text-right">{money(rows.reduce((s, t) => s + (t.revenue || 0), 0))}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
