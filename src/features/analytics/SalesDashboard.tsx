import { useEffect, useState } from 'react';
import { analyticsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { DollarSign, ShoppingCart, Users, Clock, AlertTriangle } from 'lucide-react';
import { StatsCard } from '../../components/admin/StatsCard';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { PeakHoursHeatmap } from './PeakHoursHeatmap';
import type { AnalyticsSummary, RevenueDataPoint, PeakHour } from '../../lib/api/types';

export function SalesDashboard() {
  const { t } = useI18n();
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);

  useEffect(() => {
    if (!slug) return;
    async function loadData() {
      if (!slug) return;
      try {
        const [summaryData, revenueData, peakData] = await Promise.all([
          analyticsApi.summary(slug),
          analyticsApi.revenue(slug),
          analyticsApi.peakHours(slug),
        ]);
        setSummary(summaryData);
        setRevenue(revenueData.daily);
        setPeakHours(peakData.data);
        setError(null);
      } catch {
        setError(t('analytics.loadError'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} />;
  if (!summary) return null;

  const maxRevenue = Math.max(...revenue.map((r) => r.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title={t('marketing.statTodaySales')}
          value={`$${summary.todaysSales.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title={t('analytics.totalSales')}
          value={`$${summary.totalSales.toFixed(2)}`}
          icon={ShoppingCart}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title={t('analytics.activeTables')}
          value={`${summary.activeTables}/${summary.totalTables}`}
          icon={Users}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title={t('analytics.pendingOrders')}
          value={summary.pendingOrders.toString()}
          icon={Clock}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-100"
        />
        <StatsCard
          title={t('analytics.avgPrepTime')}
          value={`${summary.averagePreparationTime.toFixed(1)}m`}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics.revenue7Days')}</h3>
          <div className="flex items-end gap-2 h-48" style={{ paddingBottom: '24px' }}>
            {revenue.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('analytics.noRevenue')}</p>
            ) : (
              <>
                <div className="flex items-end gap-2 flex-1 h-full">
                  {revenue.map((point) => {
                    const height = (point.revenue / maxRevenue) * 100;
                    const date = new Date(point.date);
                    const label = date.toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={point.date} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-xs text-gray-500 mb-1">${point.revenue.toFixed(0)}</span>
                        <div
                          className="w-full bg-[#8B4513] rounded-t hover:opacity-80 transition-opacity"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-1">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics.popularItems')}</h3>
          {summary.popularItems.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('analytics.noPopular')}</p>
          ) : (
            <div className="space-y-3">
              {summary.popularItems.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full bg-[#8B4513] text-white text-xs flex items-center justify-center font-medium mr-2">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics.peakHours')}</h3>
        <PeakHoursHeatmap data={peakHours} />
      </div>
    </div>
  );
}
