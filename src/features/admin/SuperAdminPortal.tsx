import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, Store, Users, ShoppingBag, DollarSign, LogOut, TrendingUp, Table, Coffee,
  BookOpen, Mail, BarChart3, Plus, Search, Settings, X, ExternalLink,
} from 'lucide-react';
import { adminApi, tenantApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { PlatformAnalytics, TenantSummary, PlatformUser, Lead } from '../../lib/api/types';

interface Row extends TenantSummary {
  users?: number;
  orders?: number;
  revenue?: number;
  customers?: number;
  tables?: number;
  menuItems?: number;
  storageEstimate?: string;
}

type Section = 'overview' | 'analytics' | 'restaurants' | 'users' | 'leads' | 'billing' | 'settings';

export function SuperAdminPortal() {
  const { logout, state } = useAuth();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', email: '', adminName: '', adminPassword: '' });

  useEffect(() => {
    if (section === 'users' && users.length === 0) adminApi.listUsers().then(setUsers).catch(() => {});
    if (section === 'leads' && leads.length === 0) adminApi.listLeads().then(setLeads).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, tenants] = await Promise.all([
        adminApi.platformAnalytics(),
        adminApi.listTenants(),
      ]);
      setAnalytics(stats);
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
      setSelected((s) => (s && s.id === t.id ? { ...s, isActive: !s.isActive } : s));
      setAnalytics((a) => (a ? { ...a, activeTenants: a.activeTenants + (t.isActive ? -1 : 1) } : a));
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to update tenant');
    } finally {
      setBusyId(null);
    }
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await tenantApi.create({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        email: form.email,
        adminName: form.adminName || 'Owner',
        adminPassword: form.adminPassword,
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', email: '', adminName: '', adminPassword: '' });
      await load();
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to create restaurant');
    } finally {
      setCreating(false);
    }
  }

  const money = (n?: number) => `$${(n ?? 0).toFixed(2)}`;
  const growthColor = analytics && analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600';
  const growthIcon = analytics && analytics.monthlyGrowth >= 0 ? '▲' : '▼';

  // Derived analytics (computed from the per-tenant rows + platform totals).
  const totalRevenue = rows.reduce((s, t) => s + (t.revenue || 0), 0);
  const totalOrders = rows.reduce((s, t) => s + (t.orders || 0), 0);
  const aov = totalOrders ? totalRevenue / totalOrders : 0;
  const avgRevPerRestaurant = rows.length ? totalRevenue / rows.length : 0;
  const activeRate = analytics && analytics.tenants ? Math.round((analytics.activeTenants / analytics.tenants) * 100) : 0;
  const topByRevenue = [...rows].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 8);
  const topByOrders = [...rows].sort((a, b) => (b.orders || 0) - (a.orders || 0)).slice(0, 8);
  const maxRevenue = Math.max(1, ...topByRevenue.map((t) => t.revenue || 0));
  const maxOrders = Math.max(1, ...topByOrders.map((t) => t.orders || 0));

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

  const nav: { id: Section; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'leads', label: 'Leads', icon: Mail },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredRows = rows.filter((t) =>
    !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.slug.toLowerCase().includes(query.toLowerCase()));
  const filteredUsers = users.filter((u) =>
    !userQuery || u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()));

  const statusPill = (active: boolean) => (
    <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{active ? 'Active' : 'Disabled'}</span>
  );

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
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{nav.find((n) => n.id === section)?.label}</h1>
            <p className="text-sm text-gray-500">Platform administration · all restaurants</p>
          </div>
          {section === 'restaurants' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-[#8B4513] px-4 py-2 text-sm font-medium text-white hover:bg-[#5C4033]">
              <Plus className="w-4 h-4" /> New restaurant
            </button>
          )}
        </header>

        <div className="p-8">
          {error && <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>}

          {/* ── Overview ── */}
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

          {/* ── Analytics ── */}
          {section === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total revenue', value: money(totalRevenue) },
                  { label: 'Total orders', value: totalOrders },
                  { label: 'Avg order value', value: money(aov) },
                  { label: 'Active rate', value: `${activeRate}%` },
                  { label: 'Avg revenue / restaurant', value: money(avgRevPerRestaurant) },
                  { label: 'Customers', value: analytics?.customers ?? 0 },
                  { label: 'Menu items', value: analytics?.menuItems ?? 0 },
                  { label: 'Monthly growth', value: analytics ? `${growthIcon} ${Math.abs(analytics.monthlyGrowth)}%` : '—', cls: growthColor },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="text-gray-500 text-sm mb-1">{m.label}</div>
                    <div className={`text-2xl font-bold text-gray-900 ${m.cls || ''}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Top restaurants by revenue</h3>
                  {topByRevenue.length === 0 ? <p className="text-gray-400 text-sm">No data yet.</p> : topByRevenue.map((t) => (
                    <div key={t.id} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{t.name}</span><span className="font-medium text-gray-900">{money(t.revenue)}</span></div>
                      <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-[#8B4513]" style={{ width: `${((t.revenue || 0) / maxRevenue) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Top restaurants by orders</h3>
                  {topByOrders.length === 0 ? <p className="text-gray-400 text-sm">No data yet.</p> : topByOrders.map((t) => (
                    <div key={t.id} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{t.name}</span><span className="font-medium text-gray-900">{t.orders ?? 0}</span></div>
                      <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-[#C9A26B]" style={{ width: `${((t.orders || 0) / maxOrders) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Restaurants ── */}
          {section === 'restaurants' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <h2 className="font-semibold text-gray-900">Restaurants ({filteredRows.length})</h2>
                <div className="relative w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or slug…"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513] focus:outline-none" />
                </div>
              </div>
              {loading ? <p className="p-6 text-gray-500">Loading…</p> : filteredRows.length === 0 ? <p className="p-6 text-gray-500">No restaurants.</p> : (
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
                    {filteredRows.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(t)}>
                        <td className="px-6 py-3"><div className="font-medium text-gray-900">{t.name}</div><div className="text-gray-400">{t.email}</div></td>
                        <td className="px-6 py-3"><span className="text-[#8B4513]">/{t.slug}</span></td>
                        <td className="px-6 py-3 text-right">{t.orders ?? '—'}</td>
                        <td className="px-6 py-3 text-right">{t.revenue != null ? money(t.revenue) : '—'}</td>
                        <td className="px-6 py-3 text-right">{t.users ?? '—'}</td>
                        <td className="px-6 py-3 text-right">{t.tables ?? '—'}</td>
                        <td className="px-6 py-3">{statusPill(t.isActive)}</td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); toggleActive(t); }} disabled={busyId === t.id}
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

          {/* ── Users ── */}
          {section === 'users' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <h2 className="font-semibold text-gray-900">Users ({filteredUsers.length})</h2>
                <div className="relative w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search name or email…"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513] focus:outline-none" />
                </div>
              </div>
              {users.length === 0 ? <p className="p-6 text-gray-500">Loading…</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left"><tr>
                    <th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th><th className="px-6 py-3 font-medium">Restaurant</th><th className="px-6 py-3 font-medium">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-6 py-3 text-gray-500">{u.email}</td>
                        <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-[#F5DEB3] text-[#5C4033]">{u.role}</span></td>
                        <td className="px-6 py-3 text-gray-500">{u.tenantName || (u.role === 'super_admin' ? '— platform —' : '—')}</td>
                        <td className="px-6 py-3">{statusPill(u.isActive)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Leads ── */}
          {section === 'leads' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Leads / demo requests ({leads.length})</h2></div>
              {leads.length === 0 ? <p className="p-6 text-gray-500">No leads yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left"><tr>
                    <th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Restaurant</th>
                    <th className="px-6 py-3 font-medium">Contact</th><th className="px-6 py-3 font-medium">Size</th>
                    <th className="px-6 py-3 font-medium">Message</th><th className="px-6 py-3 font-medium">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map((l) => (
                      <tr key={l.id} className="align-top">
                        <td className="px-6 py-3 font-medium text-gray-900">{l.name}</td>
                        <td className="px-6 py-3 text-gray-500">{l.restaurant}</td>
                        <td className="px-6 py-3 text-gray-500">{l.email}{l.phone ? <><br />{l.phone}</> : ''}</td>
                        <td className="px-6 py-3 text-gray-500">{l.size || '—'}</td>
                        <td className="px-6 py-3 text-gray-600 max-w-md whitespace-pre-wrap">{l.message || <span className="text-gray-400">—</span>}</td>
                        <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{l.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Billing ── */}
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
                      <td className="px-6 py-3">{statusPill(t.isActive)}</td>
                      <td className="px-6 py-3 text-right">{t.orders ?? '—'}</td>
                      <td className="px-6 py-3 text-right">{t.revenue != null ? money(t.revenue) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold"><td className="px-6 py-3">Total</td><td /><td className="px-6 py-3 text-right">{totalOrders}</td><td className="px-6 py-3 text-right">{money(totalRevenue)}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── Settings ── */}
          {section === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Platform account</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Signed in as</dt><dd className="font-medium text-gray-900">{state.user?.email}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium text-gray-900">{state.user?.role}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">2-factor auth</dt><dd>{statusPill(!!state.user?.totpEnabled)}</dd></div>
                </dl>
                <a href="/admin/profile" className="mt-4 inline-block text-sm font-medium text-[#8B4513] hover:underline">Manage security & 2FA →</a>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Platform totals</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Restaurants</span><span className="font-medium">{analytics?.tenants ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-medium">{analytics?.activeTenants ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Users</span><span className="font-medium">{analytics?.users ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-medium">{money(analytics?.revenue)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Restaurant detail drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">/{selected.slug} · {selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">{statusPill(selected.isActive)}</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Orders', value: selected.orders ?? 0 },
                { label: 'Revenue', value: money(selected.revenue) },
                { label: 'Users', value: selected.users ?? 0 },
                { label: 'Customers', value: selected.customers ?? 0 },
                { label: 'Tables', value: selected.tables ?? 0 },
                { label: 'Menu items', value: selected.menuItems ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-gray-100 p-3">
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-lg font-bold text-gray-900">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <a href={`/${selected.slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ExternalLink className="w-4 h-4" /> Open storefront
              </a>
              <button onClick={() => toggleActive(selected)} disabled={busyId === selected.id}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${selected.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {busyId === selected.id ? '…' : selected.isActive ? 'Deactivate restaurant' : 'Activate restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create restaurant modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !creating && setShowCreate(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={createRestaurant} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">New restaurant</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { k: 'name' as const, label: 'Restaurant name', type: 'text', ph: 'Bella Trattoria', req: true },
                { k: 'slug' as const, label: 'Slug (URL)', type: 'text', ph: 'auto from name', req: false },
                { k: 'email' as const, label: 'Contact email', type: 'email', ph: 'owner@restaurant.com', req: true },
                { k: 'adminName' as const, label: 'Owner name', type: 'text', ph: 'Owner', req: false },
                { k: 'adminPassword' as const, label: 'Owner password', type: 'password', ph: 'min 6 chars', req: true },
              ].map((f) => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} required={f.req} value={form[f.k]} placeholder={f.ph}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513] focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-[#8B4513] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5C4033] disabled:opacity-50">
                {creating ? 'Creating…' : 'Create restaurant'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
