import { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useI18n } from '../../contexts/I18nContext';
import { Bell, X } from 'lucide-react';

interface PushNotificationBannerProps {
  slug?: string;
}

export function PushNotificationBanner({ slug }: PushNotificationBannerProps) {
  const { t } = useI18n();
  const { permission, isSubscribed, loading, subscribe } = usePushNotifications(slug);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pushBannerDismissed') === 'true'; } catch { return false; }
  });

  if (dismissed || permission !== 'default' || isSubscribed) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem('pushBannerDismissed', 'true'); } catch { /* storage may be unavailable */ }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-800">{t('cta.enableNotifications')}</p>
        <p className="text-xs text-blue-600 mt-0.5">{t('cta.notificationDesc')}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={subscribe} disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? '...' : t('cta.enable')}
        </button>
        <button onClick={handleDismiss}
          className="p-1 hover:bg-blue-100 rounded-full transition-colors">
          <X className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
}
