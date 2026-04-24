import React, { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';

interface HoldFdaProgramProps {
  auth: AuthState | null;
  walletAddress: string | null;
  onHoldingStarted?: () => void;
}

type RewardStatusRow = {
  id: number;
  amount: number;
  holdingPeriod: string;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string | null;
  eligible: boolean;
  reason: string | null;
  rewardRate: number;
  rewardAmount: number;
  projectedTotal: number;
};

export const HoldFdaProgram: React.FC<HoldFdaProgramProps> = ({ auth, walletAddress, onHoldingStarted }) => {
  const [amount, setAmount] = useState('25');
  const [settings, setSettings] = useState({ rewardRate: 5, rewardMinAmount: 25, rewardPeriodMonths: 12 });
  const [holdings, setHoldings] = useState<RewardStatusRow[]>([]);
  const [pendingReward, setPendingReward] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const estimatedReward = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 0;
    return Number(((parsedAmount * settings.rewardRate) / 100).toFixed(8));
  }, [amount, settings.rewardRate]);

  const loadRewardStatus = async () => {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('internal/holdings/reward-status'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load holding status');
      setSettings({
        rewardRate: Number(data?.settings?.rewardRate ?? 5),
        rewardMinAmount: Number(data?.settings?.rewardMinAmount ?? 25),
        rewardPeriodMonths: Number(data?.settings?.rewardPeriodMonths ?? 12),
      });
      setPendingReward(Number(data?.pendingReward ?? 0));
      setHoldings(Array.isArray(data?.holdings) ? data.holdings : []);
    } catch (err: any) {
      alert(err?.message || 'Failed to load holding status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const startHolding = async () => {
    const parsedAmount = parseFloat(amount);
    if (!walletAddress) {
      alert('Please select an active wallet first.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < settings.rewardMinAmount) {
      alert(`Minimum hold amount is ${settings.rewardMinAmount} FDA.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl('internal/holdings/start'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth?.token}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: parsedAmount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to start holding');
      alert(`Holding started. Estimated maturity total: ${data?.holding?.estimatedTotalAfterMaturity ?? 0} FDA`);
      setAmount(String(settings.rewardMinAmount));
      await loadRewardStatus();
      onHoldingStarted?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to start holding');
    } finally {
      setSubmitting(false);
    }
  };

  const claimRewards = async () => {
    if (!walletAddress) {
      alert('Please select an active wallet first.');
      return;
    }
    setClaiming(true);
    try {
      const res = await fetch(getApiUrl('internal/holdings/claim-rewards'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth?.token}`,
        },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to claim rewards');
      alert(data?.message || 'Rewards claimed successfully');
      await loadRewardStatus();
      onHoldingStarted?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">🔒 Hold FDA Program</h2>
      <div className="offer-form-card">
        <p className="text-sm text-gray-700 mb-3">
          Hold starts only when user submits this form. It is not automatic for all users.
        </p>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Reward Rate</div>
            <div className="font-semibold">{settings.rewardRate}%</div>
          </div>
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Minimum Hold</div>
            <div className="font-semibold">{settings.rewardMinAmount} FDA</div>
          </div>
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Lock Period</div>
            <div className="font-semibold">{settings.rewardPeriodMonths} months</div>
          </div>
        </div>

        <div className="mb-3">
          <label className="modal-label">Wallet Address</label>
          <input className="form-input w-full" value={walletAddress || ''} disabled />
        </div>

        <div className="mb-3">
          <label className="modal-label">Hold Amount (FDA)</label>
          <input
            type="number"
            min={settings.rewardMinAmount}
            step="0.000000000000000001"
            className="form-input w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-gray-600 mt-1">
            Estimated on maturity: {Number(parseFloat(amount || '0') + estimatedReward).toFixed(8)} FDA
            (example: 25 + 1.25 = 26.25 at 5%)
          </p>
        </div>

        <div className="flex gap-2">
          <button className={`btn btn-primary ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={startHolding} disabled={submitting}>
            {submitting ? 'Starting...' : 'Start Holding'}
          </button>
          <button className={`btn btn-yellow ${claiming ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={claimRewards} disabled={claiming}>
            {claiming ? 'Claiming...' : 'Claim Rewards'}
          </button>
          <button className={`btn btn-secondary ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={loadRewardStatus} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="offer-form-card">
        <h3 className="offer-form-title">Your Holding Lots</h3>
        <p className="text-xs text-gray-600 mb-3">Pending reward: {pendingReward.toFixed(8)} FDA</p>
        {holdings.length === 0 ? (
          <p className="text-sm text-gray-600">No holdings yet. Fill the form above to start.</p>
        ) : (
          <div className="space-y-2">
            {holdings.map((h) => (
              <div key={h.id} className="card-dark p-3 text-xs">
                <div className="flex justify-between">
                  <span>#{h.id} · {h.amount} FDA · {h.holdingPeriod}</span>
                  <span>{h.eligible ? '✅ Eligible' : '⏳ Locked'}</span>
                </div>
                <div className="text-slate-500 mt-1">
                  Reward {h.rewardRate}% = {h.rewardAmount} FDA · Total {h.projectedTotal} FDA
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
