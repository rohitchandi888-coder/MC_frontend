import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';

interface HoldFdaProgramProps {
  auth: AuthState | null;
  walletAddress: string | null;
  onHoldingStarted?: () => void;
  onShowSuccessModal?: (message: string) => void;
  onShowErrorModal?: (message: string) => void;
}

type RewardStatusRow = {
  id: number;
  plan?: 'standard' | 'merchant_buy';
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
  breakRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  breakRequestNote?: string | null;
  breakRequestedAt?: string | null;
  breakDecidedAt?: string | null;
};

type HoldPlan = 'standard' | 'merchant_buy';
type HoldingSettings = {
  rewardRate: number;
  rewardMinAmount: number;
  rewardPeriodMonths: number;
  merchantBuyRewardRate: number;
  merchantBuyRewardMinAmount: number;
  merchantBuyRewardPeriodMonths: number;
  fdaPrice: number;
};

export const HoldFdaProgram: React.FC<HoldFdaProgramProps> = ({
  auth,
  walletAddress,
  onHoldingStarted,
  onShowSuccessModal,
  onShowErrorModal,
}) => {
  const [amount, setAmount] = useState('25');
  const [holdPlan, setHoldPlan] = useState<HoldPlan>('standard');
  const [settings, setSettings] = useState<HoldingSettings>({
    rewardRate: 5,
    rewardMinAmount: 25,
    rewardPeriodMonths: 12,
    merchantBuyRewardRate: 2,
    merchantBuyRewardMinAmount: 10,
    merchantBuyRewardPeriodMonths: 12,
    fdaPrice: 0,
  });
  const [holdings, setHoldings] = useState<RewardStatusRow[]>([]);
  const [pendingReward, setPendingReward] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [requestingBreakId, setRequestingBreakId] = useState<number | null>(null);
  const [breakFlow, setBreakFlow] = useState<{
    open: boolean;
    holdingId: number | null;
    step: 1 | 2 | 3;
    note: string;
  }>({ open: false, holdingId: null, step: 1, note: '' });
  const pushSuccess = (text: string) => {
    if (onShowSuccessModal) onShowSuccessModal(text);
    else alert(text);
  };
  const pushError = (text: string) => {
    if (onShowErrorModal) onShowErrorModal(text);
    else alert(text);
  };
  const pushInfo = (text: string) => {
    if (onShowErrorModal) onShowErrorModal(text);
    else alert(text);
  };

  const activeRewardRate = holdPlan === 'merchant_buy' ? settings.merchantBuyRewardRate : settings.rewardRate;
  const activeMinAmount = holdPlan === 'merchant_buy' ? settings.merchantBuyRewardMinAmount : settings.rewardMinAmount;
  const activePeriodMonths = holdPlan === 'merchant_buy' ? settings.merchantBuyRewardPeriodMonths : settings.rewardPeriodMonths;

  const estimatedReward = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 0;
    const holdValue = settings.fdaPrice > 0 ? parsedAmount * settings.fdaPrice : 0;
    const rewardValue = holdValue > 0 ? (holdValue * activeRewardRate) / 100 : 0;
    const rewardInFda = settings.fdaPrice > 0 ? rewardValue / settings.fdaPrice : (parsedAmount * activeRewardRate) / 100;
    return Number(rewardInFda.toFixed(8));
  }, [amount, activeRewardRate, settings.fdaPrice]);

  const resolveFdaPrice = useCallback(async (): Promise<number> => {
    if (auth?.token) {
      try {
        const res = await fetch(getApiUrl('auth/profile'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const d = (await res.json().catch(() => ({}))) as { fda_price?: number };
          const p = Number(d?.fda_price);
          if (Number.isFinite(p) && p > 0) return p;
        }
      } catch {
        // ignore
      }
    }
    try {
      const res = await fetch(getApiUrl('fdaPrice'));
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.includes('application/json')) {
        const d = (await res.json().catch(() => ({}))) as { data?: number; price?: number; fda_price?: number };
        const p = Number(d.data ?? d.price ?? d.fda_price);
        if (Number.isFinite(p) && p > 0) return p;
      }
    } catch {
      // ignore
    }
    return 0;
  }, [auth?.token]);

  const loadRewardStatus = async () => {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('internal/holdings/reward-status'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load holding status');
      let fdaPrice = Number(data?.settings?.fdaPrice ?? 0);
      if (!fdaPrice) fdaPrice = await resolveFdaPrice();
      setSettings({
        rewardRate: Number(data?.settings?.rewardRate ?? 5),
        rewardMinAmount: Number(data?.settings?.rewardMinAmount ?? 25),
        rewardPeriodMonths: Number(data?.settings?.rewardPeriodMonths ?? 12),
        merchantBuyRewardRate: Number(data?.settings?.merchantBuyRewardRate ?? 2),
        merchantBuyRewardMinAmount: Math.max(10, Number(data?.settings?.merchantBuyRewardMinAmount ?? 10)),
        merchantBuyRewardPeriodMonths: Math.max(12, Number(data?.settings?.merchantBuyRewardPeriodMonths ?? 12)),
        fdaPrice,
      });
      setPendingReward(Number(data?.pendingReward ?? 0));
      setHoldings(Array.isArray(data?.holdings) ? data.holdings : []);
    } catch (err: any) {
      pushError(err?.message || 'Failed to load holding status');
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
      pushError('Please select an active wallet first.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < activeMinAmount) {
      pushError(`⚠️ Minimum hold amount for ${holdPlan === 'merchant_buy' ? 'Merchant Buy' : 'Standard'} plan is ${activeMinAmount} FDA.`);
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
          plan: holdPlan,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to start holding');
      pushSuccess(`✅ Holding started. Estimated maturity total: ${data?.holding?.estimatedTotalAfterMaturity ?? 0} FDA`);
      setAmount(String(activeMinAmount));
      await loadRewardStatus();
      onHoldingStarted?.();
    } catch (err: any) {
      pushError(err?.message || 'Failed to start holding');
    } finally {
      setSubmitting(false);
    }
  };

  const claimRewards = async () => {
    if (!walletAddress) {
      pushError('Please select an active wallet first.');
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
      if (!res.ok) {
        const msg = String(data?.error || 'Failed to claim rewards');
        if (res.status === 400 && msg.toLowerCase().includes('no eligible holding reward')) {
          pushInfo(`ℹ️ ${msg}`);
          return;
        }
        throw new Error(msg);
      }
      pushSuccess(data?.message || '✅ Rewards claimed successfully');
      await loadRewardStatus();
      onHoldingStarted?.();
    } catch (err: any) {
      pushError(err?.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  const openBreakFlow = (holdingId: number) => {
    if (!auth?.token) return;
    setBreakFlow({ open: true, holdingId, step: 1, note: '' });
  };

  const closeBreakFlow = () => {
    setBreakFlow({ open: false, holdingId: null, step: 1, note: '' });
  };

  const requestBreakHolding = async (holdingId: number, note: string) => {
    if (!auth?.token) return;
    setRequestingBreakId(holdingId);
    try {
      const res = await fetch(getApiUrl(`internal/holdings/${holdingId}/break-request`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create break request');
      pushSuccess(data?.message || '✅ Break request submitted to admin');
      closeBreakFlow();
      await loadRewardStatus();
    } catch (err: any) {
      pushError(err?.message || 'Failed to create break request');
    } finally {
      setRequestingBreakId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">🔒 Hold FDA Program</h2>
      <div className="offer-form-card">
        <p className="text-sm text-gray-700 mb-3">
          Hold starts only when user submits this form. It is not automatic for all users.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Reward Rate</div>
            <div className="font-semibold">{activeRewardRate}%</div>
          </div>
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Minimum Hold</div>
            <div className="font-semibold">{activeMinAmount} FDA</div>
          </div>
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Lock Period</div>
            <div className="font-semibold">{activePeriodMonths} months</div>
          </div>
          <div className="card-dark p-3 text-sm">
            <div className="text-xs text-slate-500 mb-1">Current FDA Price</div>
            <div className="font-semibold">{settings.fdaPrice > 0 ? settings.fdaPrice : 'Not set'}</div>
          </div>
        </div>

        <div className="mb-3">
          <label className="modal-label">Wallet Address</label>
          <input className="form-input w-full" value={walletAddress || ''} disabled />
        </div>

        <div className="mb-3">
          <label className="modal-label">Hold Plan</label>
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn ${holdPlan === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHoldPlan('standard')}
            >
              Standard ({settings.rewardRate}% / {settings.rewardPeriodMonths}m, min {settings.rewardMinAmount})
            </button>
            <button
              type="button"
              className={`btn ${holdPlan === 'merchant_buy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHoldPlan('merchant_buy')}
            >
              Merchant Buy (2% monthly, min 10, min 1 year)
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Use Merchant Buy plan when FDA was bought inside MerchantCoinWallet.
          </p>
        </div>

        <div className="mb-3">
          <label className="modal-label">Hold Amount (FDA)</label>
          <input
            type="number"
            min={activeMinAmount}
            step="0.000000000000000001"
            className="form-input w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-gray-600 mt-1">
            Estimated on maturity: {Number(parseFloat(amount || '0') + estimatedReward).toFixed(8)} FDA
          </p>
          {Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0 && settings.fdaPrice > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Value formula: {parseFloat(amount)} * {settings.fdaPrice} = {(parseFloat(amount) * settings.fdaPrice).toFixed(4)} INR.V.
              Reward value ({activeRewardRate}%): {((parseFloat(amount) * settings.fdaPrice * activeRewardRate) / 100).toFixed(4)} INR.V (locked).
              Estimated FDA at current price: {estimatedReward.toFixed(8)} FDA.
              If FDA price changes at claim time, FDA quantity will change, but reward value stays fixed.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button className={`btn btn-primary ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={startHolding} disabled={submitting}>
            {submitting ? 'Starting...' : 'Start Holding'}
          </button>
          <button
            className={`btn btn-yellow ${(claiming || pendingReward <= 0) ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={claimRewards}
            disabled={claiming || pendingReward <= 0}
          >
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
                  <span>
                    #{h.id} · {h.amount} FDA · {h.holdingPeriod} · {h.plan === 'merchant_buy' ? 'Merchant Buy' : 'Standard'}
                  </span>
                  <span>{h.eligible ? '✅ Eligible' : '⏳ Locked'}</span>
                </div>
                <div className="text-slate-500 mt-1">
                  Reward {h.rewardRate}% = {h.rewardAmount} FDA · Total {h.projectedTotal} FDA
                </div>
                <div className="text-slate-500 mt-1">
                  Break request: {h.breakRequestStatus || 'NONE'}
                  {h.breakRequestedAt ? ` · Requested: ${new Date(h.breakRequestedAt).toLocaleString()}` : ''}
                  {h.breakDecidedAt ? ` · Decided: ${new Date(h.breakDecidedAt).toLocaleString()}` : ''}
                </div>
                {h.breakRequestNote ? (
                  <div className="text-slate-500 mt-1">Note: {h.breakRequestNote}</div>
                ) : null}
                {h.breakRequestStatus !== 'PENDING' && h.breakRequestStatus !== 'APPROVED' && !h.eligible && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className={`btn btn-red ${requestingBreakId === h.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={requestingBreakId === h.id}
                      onClick={() => openBreakFlow(h.id)}
                    >
                      {requestingBreakId === h.id ? 'Requesting...' : 'Request Early Unlock'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {breakFlow.open && breakFlow.holdingId != null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="break-flow-title">
          <div className="card-dark p-3 sm:p-4 max-w-md w-full text-sm text-gray-200 shadow-lg border border-slate-600 rounded-xl max-h-[88vh] overflow-y-auto">
            <h3 id="break-flow-title" className="text-base sm:text-lg font-semibold text-white mb-1">
              Request early unlock
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-2">
              Holding #{breakFlow.holdingId}
            </p>
            {breakFlow.step === 1 && (
              <div className="space-y-3">
                <p className="text-sm leading-5">
                  This sends a request to an admin. Early unlock is not guaranteed; someone must review and approve
                  it.
                </p>
                <p className="text-slate-400 text-[11px] sm:text-xs">Step 1 of 3</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button type="button" className="btn btn-secondary w-full sm:w-auto min-h-10" onClick={closeBreakFlow}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary w-full sm:w-auto min-h-10" onClick={() => setBreakFlow((b) => ({ ...b, step: 2 }))}>
                    Next
                  </button>
                </div>
              </div>
            )}
            {breakFlow.step === 2 && (
              <div className="space-y-3">
                <label className="block text-xs text-slate-400" htmlFor="break-note">Optional reason for admin</label>
                <textarea
                  id="break-note"
                  className="form-input w-full min-h-[100px] text-gray-900"
                  value={breakFlow.note}
                  onChange={(e) => setBreakFlow((b) => ({ ...b, note: e.target.value }))}
                  placeholder="e.g. need liquidity for…"
                />
                <p className="text-slate-400 text-[11px] sm:text-xs">Step 2 of 3</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button type="button" className="btn btn-secondary w-full sm:w-auto min-h-10" onClick={() => setBreakFlow((b) => ({ ...b, step: 1 }))}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary w-full sm:w-auto min-h-10" onClick={() => setBreakFlow((b) => ({ ...b, step: 3 }))}>
                    Next
                  </button>
                </div>
              </div>
            )}
            {breakFlow.step === 3 && (
              <div className="space-y-3">
                <p className="text-sm leading-5">
                  You are about to submit a break request for holding <strong>#{breakFlow.holdingId}</strong>.
                </p>
                {breakFlow.note.trim() ? (
                  <p className="text-slate-300 text-xs whitespace-pre-wrap border border-slate-600 rounded p-2 bg-slate-900/40">{breakFlow.note}</p>
                ) : (
                  <p className="text-slate-400 text-xs">No extra note was added.</p>
                )}
                <p className="text-slate-400 text-[11px] sm:text-xs">Step 3 of 3 - Confirm and submit</p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button type="button" className="btn btn-secondary w-full sm:w-auto min-h-10" onClick={() => setBreakFlow((b) => ({ ...b, step: 2 }))} disabled={requestingBreakId === breakFlow.holdingId}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-red w-full sm:w-auto min-h-10"
                    disabled={requestingBreakId === breakFlow.holdingId}
                    onClick={() => {
                      if (breakFlow.holdingId != null) void requestBreakHolding(breakFlow.holdingId, breakFlow.note);
                    }}
                  >
                    {requestingBreakId === breakFlow.holdingId ? 'Submitting...' : 'Submit request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
