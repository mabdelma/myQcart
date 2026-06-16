import { useState } from 'react';
import { FileText, Download, DollarSign, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function ScheduledExports() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(todayString());
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(type: 'orders' | 'payments' | 'menu') {
    if (!slug) return;
    setExporting(type);
    try {
      const token = localStorage.getItem('token');
      const params = type === 'menu' ? '' : `?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(`${API_BASE}/r/${slug}/exports/${type}${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Export Data</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">Date range applies to Orders and Payments exports. Menu export includes all items regardless of date.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport('orders')}
            disabled={exporting !== null || !slug}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] disabled:opacity-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            {exporting === 'orders' ? 'Exporting...' : 'Export Orders (CSV)'}
          </button>
          <button
            onClick={() => handleExport('payments')}
            disabled={exporting !== null || !slug}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] disabled:opacity-50 transition-colors"
          >
            <DollarSign className="w-5 h-5" />
            {exporting === 'payments' ? 'Exporting...' : 'Export Payments (CSV)'}
          </button>
          <button
            onClick={() => handleExport('menu')}
            disabled={exporting !== null || !slug}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] disabled:opacity-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
            {exporting === 'menu' ? 'Exporting...' : 'Export Menu (CSV)'}
          </button>
        </div>
      </div>
    </div>
  );
}
