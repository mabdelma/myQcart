import { useState } from 'react';
import { CreditCard, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantApi } from '../../lib/api';

export function SettingsPage() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(tenant?.stripeAccountId || '');

  const hasStripeKey = !!import.meta.env.VITE_STRIPE_KEY || false;
  const stripeConfigured = hasStripeKey || !!stripeAccountId;

  async function handleSave() {
    if (!slug) return;
    setSaving(true);
    try {
      await tenantApi.updateSettings(slug, { stripeAccountId: stripeAccountId || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Stripe Payments</h3>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-md ${stripeConfigured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {stripeConfigured ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm">
            {stripeConfigured ? 'Stripe is configured' : 'Stripe is not configured — card payments will use mock mode'}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stripe Account ID <span className="text-gray-400">(optional)</span>
          </label>
          <input type="text" value={stripeAccountId}
            onChange={(e) => setStripeAccountId(e.target.value)}
            placeholder="acct_xxxxxxxxxxxxxxxx"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-[#8B4513] focus:border-[#8B4513]" />
          <p className="text-xs text-gray-500 mt-1">
            For multi-tenant Stripe Connect. Leave blank to use the global Stripe key from the server environment.
          </p>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50">
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">How to get Stripe API keys</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-600">
          <li>Go to <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
            className="text-[#8B4513] underline">dashboard.stripe.com</a> and create an account</li>
          <li>Navigate to <strong>Developers → API keys</strong></li>
          <li>Copy your <strong>Secret key</strong> (starts with <code>sk_test_</code> or <code>sk_live_</code>)</li>
          <li>Set it as <code>STRIPE_SECRET_KEY</code> in the server environment</li>
          <li>For webhooks: set up an endpoint pointing to <code>/api/webhooks/stripe</code> and copy the signing secret as <code>STRIPE_WEBHOOK_SECRET</code></li>
        </ol>
      </div>
    </div>
  );
}
