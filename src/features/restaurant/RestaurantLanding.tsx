import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { tenantApi, menuApi } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import type { Tenant, MenuCategory, MenuItem } from '../../lib/api/types';
import { MenuSkeleton } from '../../components/ui/Skeleton';

export function RestaurantLanding() {
  const { t } = useI18n();
  const { slug } = useParams<{ slug: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setLoading(false); setNotFound(true); return; }
    tenantApi.get(slug)
      .then(async (t) => {
        setTenant(t);
        try {
          const m = await menuApi.getFullMenu(slug);
          setCategories(m.categories);
          setItems(m.items);
        } catch { /* menu optional on landing */ }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-gray-50"><MenuSkeleton /></div>;

  if (!slug || notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-400 mb-2">{t('error.notFound')}</h1>
          <p className="text-gray-500 mb-6">{t('common.notAvailable')}</p>
          <a href="/" className="inline-flex items-center px-6 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033]">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back')}
          </a>
        </div>
      </div>
    );
  }

  const mainCats = useMemo(() => categories.filter((c) => c.type === 'main'), [categories]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#8B4513] text-white p-8">
        <h1 className="text-3xl font-bold">{tenant.name}</h1>
        {tenant.logoUrl && <img src={tenant.logoUrl} alt={tenant.name} width="64" height="64" loading="lazy" className="h-16 w-16 rounded-full mt-4" />}
      </div>

      {/* Menu preview */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t('nav.menu')}</h2>
        {mainCats.map((cat) => (
          <div key={cat.id} className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{cat.name}</h3>
            <div className="space-y-2">
              {items.filter((i) => i.categoryId === cat.id && i.available).slice(0, 4).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="font-medium">{tenant.currency} {item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
