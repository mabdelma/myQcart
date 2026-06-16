import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Star, Gift, RefreshCw, Award, Clock } from 'lucide-react';

interface PointsTransaction {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  description: string;
  createdAt: string;
}

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
}

interface LoyaltyData {
  points: number;
  tier: string;
  lifetimePoints: number;
  history: PointsTransaction[];
  rewards: Reward[];
}

export function LoyaltyPoints() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/r/${slug}/loyalty`);
      if (!res.ok) throw new Error('Failed to load loyalty data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function handleRedeem(reward: Reward) {
    if (!slug) return;
    try {
      const res = await fetch(`/api/r/${slug}/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: reward.pointsCost, rewardId: reward.id }),
      });
      if (!res.ok) throw new Error('Redemption failed');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  if (error) return <div className="bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Loyalty Program</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <Star className="w-10 h-10 text-yellow-500" />
          <div>
            <p className="text-3xl font-bold text-gray-900">{data?.points ?? 0}</p>
            <p className="text-sm text-gray-500">Available Points</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Award className="w-4 h-4" />
          <span>Tier: <strong>{(data?.tier ?? 'Bronze').charAt(0).toUpperCase() + (data?.tier ?? 'Bronze').slice(1)}</strong></span>
          <span className="mx-2">·</span>
          <span>Lifetime: <strong>{data?.lifetimePoints ?? 0}</strong></span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Available Rewards</h3>
        </div>
        {(data?.rewards ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No rewards available at this time.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.rewards ?? []).map((reward) => (
              <div key={reward.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{reward.name}</p>
                  <p className="text-sm text-gray-500">{reward.description}</p>
                  <p className="text-sm text-[#8B4513] font-medium mt-1">{reward.pointsCost} points</p>
                </div>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={(data?.points ?? 0) < reward.pointsCost}
                  className="px-3 py-1.5 bg-[#8B4513] text-white text-sm rounded-lg hover:bg-[#5C4033] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Redeem
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#8B4513]" />
          <h3 className="text-lg font-medium">Recent Transactions</h3>
        </div>
        {(data?.history ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {(data?.history ?? []).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  {tx.type === 'earn' ? (
                    <Star className="w-4 h-4 text-green-500" />
                  ) : (
                    <Gift className="w-4 h-4 text-[#8B4513]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={load} className="flex items-center gap-2 text-sm text-[#8B4513] hover:underline">
        <RefreshCw className="w-4 h-4" /> Refresh
      </button>
    </div>
  );
}
