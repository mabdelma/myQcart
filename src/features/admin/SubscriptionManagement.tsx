import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  usersLimit: number;
  ordersLimit: number;
  features: string[];
}

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  renewDate: string;
  billingHistory: Array<{ id: string; date: string; amount: number; status: string }>;
  usage: { users: number; orders: number };
}

const PLANS: SubscriptionPlan[] = [
  { id: 'starter', name: 'Starter', price: 29, usersLimit: 3, ordersLimit: 500, features: ['Up to 3 staff', '500 orders/month', 'Basic analytics', 'Email support'] },
  { id: 'growth', name: 'Growth', price: 79, usersLimit: 10, ordersLimit: 2000, features: ['Up to 10 staff', '2,000 orders/month', 'Advanced analytics', 'Priority support', 'Custom branding'] },
  { id: 'enterprise', name: 'Enterprise', price: 199, usersLimit: 50, ordersLimit: 10000, features: ['Up to 50 staff', '10,000 orders/month', 'Full analytics', 'Dedicated support', 'Custom branding', 'API access'] },
];

export function SubscriptionManagement() {
  const { state: { tenant } } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/subscriptions/${tenant.id}`);
      if (!res.ok) throw new Error('Failed to load subscription');
      const data = await res.json();
      setInfo(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => { load(); }, [load]);

  async function handleChangePlan(planId: string) {
    if (!tenant) return;
    setChanging(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${tenant.id}/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error('Failed to change plan');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChanging(false);
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading subscription...</div>;
  if (error) return <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>;

  const currentPlanId = info?.plan.id || 'starter';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Subscription & Billing</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Current Plan</h3>
        </div>
        {info && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-lg font-bold text-gray-900">{info.plan.name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-lg font-bold text-gray-900">${info.plan.price}/mo</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Renewal</p>
              <p className="text-lg font-bold text-gray-900">{new Date(info.renewDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-lg font-bold text-gray-900">{info.usage.users}/{info.plan.usersLimit}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isDowngrade = PLANS.indexOf(plan) < PLANS.findIndex((p) => p.id === currentPlanId);
            return (
              <div key={plan.id} className={`border rounded-lg p-4 ${isCurrent ? 'border-[#8B4513] bg-[#F5DEB3]/20' : 'border-gray-200'}`}>
                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                <p className="text-2xl font-bold text-[#8B4513] mt-2">${plan.price}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={isCurrent || changing}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-medium ${
                    isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                    'bg-[#8B4513] text-white hover:bg-[#5C4033] disabled:opacity-50'
                  }`}
                >
                  {changing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                   isCurrent ? 'Current Plan' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-lg font-medium text-gray-900"
        >
          Billing History
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showHistory && info && (
          <div className="mt-4 space-y-2">
            {info.billingHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No billing history available.</p>
            ) : (
              info.billingHistory.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{new Date(b.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400 capitalize">{b.status}</p>
                  </div>
                  <span className="text-sm font-medium">${b.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
