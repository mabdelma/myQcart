import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantApi } from '../../lib/api';
import { Palette, Save, Check, Loader2 } from 'lucide-react';

export function WhiteLabelSettings() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [logoUrl, setLogoUrl] = useState(tenant?.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor || '#8B4513');
  const [accentColor, setAccentColor] = useState('#5C4033');
  const [restaurantName, setRestaurantName] = useState(tenant?.name || '');
  const [favicon, setFavicon] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setLogoUrl(tenant.logoUrl || '');
      setPrimaryColor(tenant.primaryColor || '#8B4513');
      setRestaurantName(tenant.name || '');
    }
  }, [tenant]);

  async function handleSave() {
    if (!slug) return;
    setSaving(true);
    setError('');
    try {
      await tenantApi.updateSettings(slug, {
        logoUrl: logoUrl || undefined,
        primaryColor,
        accentColor,
        faviconUrl: favicon || undefined,
        customDomain: customDomain || undefined,
        name: restaurantName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Branding & White Label</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="w-6 h-6 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Customize Your Brand</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
          />
          {logoUrl && (
            <div className="mt-2 flex items-center gap-2">
              <img src={logoUrl} alt="Logo preview" width="40" height="40" loading="lazy" className="h-10 w-10 rounded object-contain border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-xs text-gray-400">Preview</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 rounded cursor-pointer border border-gray-300"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
          <input
            type="text"
            value={favicon}
            onChange={(e) => setFavicon(e.target.value)}
            placeholder="https://example.com/favicon.ico"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="order.yourrestaurant.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]"
          />
          <p className="text-xs text-gray-500 mt-1">Configure your DNS to point to QCart for a custom ordering domain.</p>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}
