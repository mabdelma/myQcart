import { useEffect, useState } from 'react';
import { analyticsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Clock, DollarSign, Users, AlertTriangle, Utensils } from 'lucide-react';
import { StatsCard } from '../../components/admin/StatsCard';
import { AnalyticsSkeleton } from '../../components/ui/Skeleton';
import type { AnalyticsSummary } from '../../lib/api/types';

export function AnalyticsDashboard() {
  const { t } = useI18n();
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function loadSummary() {
      if (!slug) return;
      try {
        const [data] = await Promise.all([
          analyticsApi.summary(slug),
        ]);
        setSummary(data);
        setError(null);
      } catch {
        setError(t('error.generic'));
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
    const interval = setInterval(loadSummary, 300000);
    return () => clearInterval(interval);
  }, [slug, t]);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatsCard
          title={t('marketing.statTodaySales')}
          value={`$${summary.todaysSales.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title={t('staff.tables')}
          value={`${summary.activeTables}/${summary.totalTables}`}
          icon={Users}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title={t('nav.dashboard')}
          value={`${summary.averagePreparationTime.toFixed(1)} min`}
          icon={Clock}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-100"
        />
        <StatsCard
          title={t('order.pending')}
          value={summary.delayedOrders.toString()}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('menu.items')}</h3>
          {summary.popularItems.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('common.noResults')}</p>
          ) : (
            <div className="space-y-3">
              {summary.popularItems.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 text-sm font-medium text-gray-400">#{idx + 1}</span>
                    <Utensils className="w-4 h-4 text-gray-400 mr-2" aria-hidden />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.quantity} {t('common.done')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('order.pending')}</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <span className="text-4xl font-bold text-[#8B4513]">{summary.pendingOrders}</span>
              <p className="text-sm text-gray-500 mt-1">{t('order.preparing')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
