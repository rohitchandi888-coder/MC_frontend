import React, { useState, useEffect } from 'react';
import { type AuthState } from '../types';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';

const ADMIN_TRADES_PER_PAGE_DESKTOP = 12;
const ADMIN_TRADES_PER_PAGE_MOBILE = 6;
const BREAK_REQUESTS_PER_PAGE = 8;

interface AdminPanelProps {
  auth: AuthState | null;
  newTokenAddress: string;
  onAddressChange: (address: string) => void;
  isValidAddress: (address: string) => boolean;
  onFetchTokenInfo: (address: string) => void;
  newTokenSymbol: string;
  newTokenName: string;
  tokenInfoLoading: boolean;
  p2pFeeRate: number;
  editingFeeRate: boolean;
  newFeeRate: string;
  setNewFeeRate: (rate: string) => void;
  updatingFeeRate: boolean;
  holdingFdaAmount: string;
  editingHoldingFda: boolean;
  newHoldingFda: string;
  setNewHoldingFda: (amount: string) => void;
  updatingHoldingFda: boolean;
  adminTrades: any[];
  adminDisputes: any[];
  setEditingFeeRate: (editing: boolean) => void;
  setEditingHoldingFda: (editing: boolean) => void;
  updateFeeRate: () => Promise<void>;
  updateHoldingFda: () => Promise<void>;
  loadAdminData: () => Promise<void>;
  onShowSuccessModal?: (message: string) => void;
  onShowErrorModal?: (message: string) => void;
  /** After admin saves INR/USDT minimum price per FDA, refresh P2P trade form limits. */
  onP2PMinPricesUpdated?: () => void;
}

// https://merchantcoinwallet.com/admin/addGlobalWallet

export const AdminPanel: React.FC<AdminPanelProps> = ({
  auth,
  p2pFeeRate,
  editingFeeRate,
  newTokenAddress,
  tokenInfoLoading,
  newTokenName,
  newTokenSymbol,
  onFetchTokenInfo,
  isValidAddress,
  onAddressChange,
  newFeeRate,
  setNewFeeRate,
  updatingFeeRate,
  holdingFdaAmount,
  editingHoldingFda,
  newHoldingFda,
  setNewHoldingFda,
  updatingHoldingFda,
  adminTrades,
  adminDisputes,
  setEditingFeeRate,
  setEditingHoldingFda,
  updateFeeRate,
  updateHoldingFda,
  loadAdminData,
  onShowSuccessModal,
  onShowErrorModal,
  onP2PMinPricesUpdated,
}) => {
  const [adminTradesPage, setAdminTradesPage] = useState(1);
  const [fdaPrice, setFdaPrice] = useState("");
  const [minOfferAmount, setMinOfferAmount] = useState('1');
  const [editingMinOfferAmount, setEditingMinOfferAmount] = useState(false);
  const [updatingMinOfferAmount, setUpdatingMinOfferAmount] = useState(false);
  const [minOfferAmountUsdt, setMinOfferAmountUsdt] = useState('1');
  const [editingMinOfferAmountUsdt, setEditingMinOfferAmountUsdt] = useState(false);
  const [updatingMinOfferAmountUsdt, setUpdatingMinOfferAmountUsdt] = useState(false);
  const [updatingFdaPrice, setUpdatingFdaPrice] = useState(false);
  const [rewardRate, setRewardRate] = useState('5');
  const [rewardMinAmount, setRewardMinAmount] = useState('25');
  const [rewardPeriodMonths, setRewardPeriodMonths] = useState('12');
  const [merchantBuyRewardRate, setMerchantBuyRewardRate] = useState('2');
  const [merchantBuyRewardMinAmount, setMerchantBuyRewardMinAmount] = useState('10');
  const [merchantBuyRewardPeriodMonths, setMerchantBuyRewardPeriodMonths] = useState('12');
  const [savingRewardSettings, setSavingRewardSettings] = useState(false);
  const [save13thWordPlain, setSave13thWordPlain] = useState(false);
  const [updatingSave13thWord, setUpdatingSave13thWord] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [breakRequests, setBreakRequests] = useState<any[]>([]);
  const [loadingBreakRequests, setLoadingBreakRequests] = useState(false);
  const [decidingBreakId, setDecidingBreakId] = useState<number | null>(null);
  const [breakRequestsPage, setBreakRequestsPage] = useState(1);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );
  const [breakDecisionModal, setBreakDecisionModal] = useState<{
    open: boolean;
    holdingId: number | null;
    decision: 'APPROVE' | 'REJECT' | null;
    note: string;
  }>({ open: false, holdingId: null, decision: null, note: '' });
  const pushSuccess = (text: string) => {
    if (onShowSuccessModal) onShowSuccessModal(text);
    else setNotice({ type: 'success', text });
  };
  const pushError = (text: string) => {
    if (onShowErrorModal) onShowErrorModal(text);
    else setNotice({ type: 'error', text });
  };
  const adminTradesPerPage = isMobileViewport ? ADMIN_TRADES_PER_PAGE_MOBILE : ADMIN_TRADES_PER_PAGE_DESKTOP;
  const totalAdminTradesPages = Math.max(1, Math.ceil(adminTrades.length / adminTradesPerPage));
  const paginatedAdminTrades = adminTrades.slice(
    (adminTradesPage - 1) * adminTradesPerPage,
    adminTradesPage * adminTradesPerPage
  );
  const totalBreakRequestPages = Math.max(1, Math.ceil(breakRequests.length / BREAK_REQUESTS_PER_PAGE));
  const paginatedBreakRequests = breakRequests.slice(
    (breakRequestsPage - 1) * BREAK_REQUESTS_PER_PAGE,
    breakRequestsPage * BREAK_REQUESTS_PER_PAGE,
  );
  useEffect(() => {
    if (adminTradesPage > totalAdminTradesPages && totalAdminTradesPages > 0) {
      setAdminTradesPage(totalAdminTradesPages);
    }
  }, [adminTrades.length, totalAdminTradesPages, adminTradesPage]);
  useEffect(() => {
    if (breakRequestsPage > totalBreakRequestPages && totalBreakRequestPages > 0) {
      setBreakRequestsPage(totalBreakRequestPages);
    }
  }, [breakRequests.length, totalBreakRequestPages, breakRequestsPage]);
  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!auth?.user.isAdmin) {
    return (
      <div className="card text-center p-8">
        <div className="modal-icon-large">🔒</div>
        <h3 className="modal-title">
          Admin Access Required
        </h3>
        <p className="modal-text">
          You must be logged in as an admin user to access this panel.
        </p>
        <p className="text-xs text-gray-600">
          Contact your administrator to get admin access.
        </p>
      </div>
    );
  }

  const addToken = async () => {

    try {

      const res = await fetch(getApiUrl('admin/addGlobalWallet'), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          address: newTokenAddress,
          symbol: newTokenSymbol,
          name: newTokenName
        })
      });

      const data = await res.json();

      if (!data.success) {
        setNotice({ type: 'error', text: data.message || 'Failed to add token.' });
        return;
      }

      setNotice({ type: 'success', text: 'Token added successfully.' });

    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: 'Failed to add token.' });
    }
  };

  const updateFdaPrice = async () => {
    try {

      if (!fdaPrice || isNaN(Number(fdaPrice))) {
        setNotice({ type: 'error', text: 'Enter valid price.' });
        return;
      }

      setUpdatingFdaPrice(true);

      const res = await fetch(getApiUrl("admin/settings/fda_price"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth?.token}`
        },
        body: JSON.stringify({
          value: String(Number(fdaPrice)),
          description: "FDA Price (manual admin override)"
        })
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Non-JSON response from server" };
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to update FDA price (${res.status})`);
      }

      await loadFdaPrice();
      setNotice({ type: 'success', text: 'FDA price updated.' });

    } catch (err: any) {
      console.error(err);
      setNotice({ type: 'error', text: err?.message || 'Failed to update FDA price.' });
    } finally {
      setUpdatingFdaPrice(false);
    }
  };

  const loadFdaPrice = async () => {
    try {
      const res = await fetch(getApiUrl("admin/settings"), {
        headers: {
          Authorization: `Bearer ${auth?.token}`
        }
      });
      if (!res.ok) return;
      const settings = await res.json().catch(() => []);
      const fdaPriceSetting = Array.isArray(settings)
        ? settings.find((s: any) => s?.key === 'fda_price')
        : null;
      const minOfferSetting = Array.isArray(settings)
        ? (
          settings.find((s: any) => s?.key === 'p2p_min_price_per_fda') ||
          settings.find((s: any) => s?.key === 'p2p_min_offer_amount')
        )
        : null;
      const minOfferUsdtSetting = Array.isArray(settings)
        ? settings.find((s: any) => s?.key === 'p2p_min_price_per_fda_usdt')
        : null;
      if (fdaPriceSetting?.value) {
        const nextPrice = Number(fdaPriceSetting.value);
        if (Number.isFinite(nextPrice) && nextPrice > 0) {
          setFdaPrice(nextPrice.toString());
        }
      }
      if (minOfferSetting?.value) {
        setMinOfferAmount(String(minOfferSetting.value));
      }
      if (minOfferUsdtSetting?.value) {
        setMinOfferAmountUsdt(String(minOfferUsdtSetting.value));
      }
      const save13 = Array.isArray(settings)
        ? settings.find((s: any) => s?.key === 'admin_save_thirteenth_word_plain')
        : null;
      if (save13?.value !== undefined) {
        const v = String(save13.value ?? '0').trim();
        setSave13thWordPlain(v === '1' || v.toLowerCase() === 'true');
      }
    } catch (err) {
      console.error("Failed to load FDA price:", err);
    }
  };

  const updateSave13thWordPlain = async (enabled: boolean) => {
    if (!auth?.token) return;
    setUpdatingSave13thWord(true);
    try {
      const res = await fetch(getApiUrl('admin/settings/admin_save_thirteenth_word_plain'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          value: enabled ? '1' : '0',
          description:
            'When 1, store custom 13th word in wallet_phrases.thirteenth_word_plain. When 0, do not save plaintext (encrypted phrase still saved).',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update setting');
      setSave13thWordPlain(enabled);
      pushSuccess(
        enabled
          ? '✅ Plaintext 13th word storage enabled for new phrase saves.'
          : '✅ Plaintext 13th word storage disabled. Encrypted phrases are still saved.',
      );
    } catch (err: any) {
      setSave13thWordPlain(!enabled);
      pushError(err?.message || 'Failed to update 13th word storage setting');
    } finally {
      setUpdatingSave13thWord(false);
    }
  };

  useEffect(() => {
    loadFdaPrice();
  }, [auth?.token]);

  const updateMinOfferSetting = async () => {
    const valueStr = String(minOfferAmount || '').trim();
    if (!/^\d+(\.\d{0,18})?$/.test(valueStr)) {
      pushError('Minimum price per FDA must be a decimal with up to 18 places.');
      return;
    }
    const numeric = parseFloat(valueStr);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      pushError('Minimum price per FDA must be greater than 0.');
      return;
    }
    setUpdatingMinOfferAmount(true);
    try {
      const res = await fetch(getApiUrl('admin/settings/p2p_min_price_per_fda'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth?.token}`,
        },
        body: JSON.stringify({
          value: valueStr,
          description: 'Minimum price per FDA (INR) for INR-denominated P2P offers (BUY and SELL)',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update minimum price per FDA');
      setMinOfferAmount(String(data?.value || valueStr));
      setEditingMinOfferAmount(false);
      pushSuccess(`✅ Minimum price per FDA (INR) updated to ${String(data?.value || valueStr)}.`);
      onP2PMinPricesUpdated?.();
    } catch (err: any) {
      pushError(err?.message || 'Failed to update minimum price per FDA');
    } finally {
      setUpdatingMinOfferAmount(false);
    }
  };

  const updateMinOfferUsdtSetting = async () => {
    const valueStr = String(minOfferAmountUsdt || '').trim();
    if (!/^\d+(\.\d{0,18})?$/.test(valueStr)) {
      pushError('Minimum price per FDA (USDT) must be a decimal with up to 18 places.');
      return;
    }
    const numeric = parseFloat(valueStr);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      pushError('Minimum price per FDA (USDT) must be greater than 0.');
      return;
    }
    setUpdatingMinOfferAmountUsdt(true);
    try {
      const res = await fetch(getApiUrl('admin/settings/p2p_min_price_per_fda_usdt'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth?.token}`,
        },
        body: JSON.stringify({
          value: valueStr,
          description: 'Minimum price per FDA (USDT) for USDT-denominated P2P offers',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update USDT minimum');
      setMinOfferAmountUsdt(String(data?.value || valueStr));
      setEditingMinOfferAmountUsdt(false);
      pushSuccess(`✅ Minimum price per FDA (USDT) updated to ${String(data?.value || valueStr)}.`);
      onP2PMinPricesUpdated?.();
    } catch (err: any) {
      pushError(err?.message || 'Failed to update USDT minimum');
    } finally {
      setUpdatingMinOfferAmountUsdt(false);
    }
  };

  const loadRewardSettings = async () => {
    try {
      const res = await fetch(getApiUrl('settings/holding-reward'));
      if (!res.ok) return;
      const data = await res.json();
      setRewardRate(String(data?.rewardRate ?? 5));
      setRewardMinAmount(String(data?.rewardMinAmount ?? 25));
      setRewardPeriodMonths(String(data?.rewardPeriodMonths ?? 12));
      setMerchantBuyRewardRate(String(data?.merchantBuyRewardRate ?? 2));
      setMerchantBuyRewardMinAmount(String(data?.merchantBuyRewardMinAmount ?? 10));
      setMerchantBuyRewardPeriodMonths(String(data?.merchantBuyRewardPeriodMonths ?? 12));
    } catch (err) {
      console.error('Failed to load reward settings:', err);
    }
  };

  useEffect(() => {
    loadRewardSettings();
  }, []);

  const saveRewardSetting = async (key: string, value: string, description: string) => {
    const res = await fetch(getApiUrl(`admin/settings/${key}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth?.token}`,
      },
      body: JSON.stringify({ value, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save reward setting');
  };

  const updateRewardSettings = async () => {
    try {
      const rate = parseFloat(rewardRate);
      const minAmount = parseFloat(rewardMinAmount);
      const period = parseInt(rewardPeriodMonths, 10);
      const merchantRate = parseFloat(merchantBuyRewardRate);
      const merchantMinAmount = parseFloat(merchantBuyRewardMinAmount);
      const merchantPeriod = parseInt(merchantBuyRewardPeriodMonths, 10);

      if (!Number.isFinite(rate) || rate < 0) {
        pushError('Reward rate must be a valid non-negative number.');
        return;
      }
      if (!Number.isFinite(minAmount) || minAmount < 0) {
        pushError('Minimum hold amount must be a valid non-negative number.');
        return;
      }
      if (!Number.isFinite(period) || period <= 0) {
        pushError('Hold period must be a positive month value.');
        return;
      }
      if (!Number.isFinite(merchantRate) || merchantRate < 0) {
        pushError('Merchant buy reward rate must be a valid non-negative number.');
        return;
      }
      if (!Number.isFinite(merchantMinAmount) || merchantMinAmount < 10) {
        pushError('Merchant buy minimum hold amount must be at least 10 FDA.');
        return;
      }
      if (!Number.isFinite(merchantPeriod) || merchantPeriod < 12) {
        pushError('Merchant buy hold period must be at least 12 months (1 year).');
        return;
      }

      setSavingRewardSettings(true);
      await saveRewardSetting('holding_reward_rate', String(rate), 'FDA holding reward percentage');
      await saveRewardSetting('holding_reward_min_amount', String(minAmount), 'Minimum FDA amount eligible for holding reward');
      await saveRewardSetting('holding_reward_period_months', String(period), 'Holding reward lock period in months');
      await saveRewardSetting('holding_reward_rate_merchant_buy', String(merchantRate), 'Merchant buy hold reward percentage (monthly rate)');
      await saveRewardSetting('holding_reward_min_amount_merchant_buy', String(merchantMinAmount), 'Minimum FDA amount eligible for merchant buy hold');
      await saveRewardSetting('holding_reward_period_months_merchant_buy', String(merchantPeriod), 'Merchant buy hold lock period in months (minimum 12)');
      await loadRewardSettings();
      pushSuccess(`✅ Holding reward settings updated.`);
    } catch (err: any) {
      console.error(err);
      pushError(err?.message || 'Failed to update reward settings');
    } finally {
      setSavingRewardSettings(false);
    }
  };

  const loadBreakRequests = async () => {
    if (!auth?.token) return;
    setLoadingBreakRequests(true);
    try {
      const res = await fetch(getApiUrl('admin/holdings/break-requests'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || 'Failed to load break requests');
      setBreakRequests(Array.isArray(data) ? data : []);
      setBreakRequestsPage(1);
    } catch (err: any) {
      pushError(err?.message || 'Failed to load break requests');
    } finally {
      setLoadingBreakRequests(false);
    }
  };

  const openBreakDecisionModal = (holdingId: number, decision: 'APPROVE' | 'REJECT') => {
    setBreakDecisionModal({
      open: true,
      holdingId,
      decision,
      note: '',
    });
  };

  const closeBreakDecisionModal = () => {
    setBreakDecisionModal({ open: false, holdingId: null, decision: null, note: '' });
  };

  const submitBreakDecision = async () => {
    if (!auth?.token) return;
    if (!breakDecisionModal.holdingId || !breakDecisionModal.decision) return;
    const holdingId = breakDecisionModal.holdingId;
    const decision = breakDecisionModal.decision;
    const note = breakDecisionModal.note;
    setDecidingBreakId(holdingId);
    try {
      const res = await fetch(getApiUrl(`admin/holdings/${holdingId}/break-decision`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update break request');
      pushSuccess(data?.message || `Break request ${decision.toLowerCase()}d`);
      await loadBreakRequests();
      closeBreakDecisionModal();
    } catch (err: any) {
      pushError(err?.message || 'Failed to update break request');
    } finally {
      setDecidingBreakId(null);
    }
  };

  useEffect(() => {
    loadBreakRequests();
  }, [auth?.token]);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🛡️ Admin Panel
      </h2>
      {notice && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-300 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{notice.text}</span>
            <button
              type="button"
              className="text-xs underline opacity-80 hover:opacity-100"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark flex-1 text-xs"
            placeholder="Token contract address (0x...)"
            value={newTokenAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onBlur={() => {
              if (newTokenAddress.trim() && isValidAddress(newTokenAddress.trim()) && !newTokenSymbol.trim() && !tokenInfoLoading) {
                onFetchTokenInfo(newTokenAddress);
              }
            }}
          />
          <button
            className={`btn btn-yellow text-xs py-2 px-3 ${tokenInfoLoading || !newTokenAddress.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => onFetchTokenInfo(newTokenAddress)}
            disabled={tokenInfoLoading || !newTokenAddress.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tokenInfoLoading ? 'Loading...' : '🔍 Fetch Info'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token symbol (e.g. USDT)"
            value={newTokenSymbol}
            readOnly
          // onChange={(e) => onSymbolChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token name (optional)"
            value={newTokenName}
            readOnly
          // onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full" style={{ marginBottom: 20 }} onClick={addToken}>
          Add Token
        </button>
      </div>

      <div className="mb-6" style={{background: '#dddcdc', paddingInline: 10, paddingBlock: 25, borderRadius: 20}}>
        <label style={{fontSize: 18}}>
          FDA Price
        </label>

        <p className=" mb-3">
          Set the current FDA token price (used across the platform).
        </p>

        <div className="flex gap-3 items-center">
          <input
            type="number"
            step="0.0001"
            className="form-input flex-1 py-3 max-w-48"
            placeholder="Enter price"
            value={fdaPrice}
            onChange={(e) => setFdaPrice(e.target.value)}
          />

          <button
            className={`btn btn-success ${updatingFdaPrice ? "opacity-60 cursor-not-allowed" : ""
              }`}
            onClick={updateFdaPrice}
            disabled={updatingFdaPrice}
          >
            {updatingFdaPrice ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
      {/* Global Settings Section */}
      <div className="offer-form-card mb-6">
        <h3 className="offer-form-title">
          ⚙️ Global Settings
        </h3>

        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50/80">
          <label className="modal-label">
            13th word — database (plaintext)
          </label>
          <p className="text-xs text-gray-700 mb-3">
            Off by default. When <strong>enabled</strong>, create/import wallet will save the custom 13th word in{' '}
            <code className="text-[11px] bg-white/90 px-1 rounded">wallet_phrases.thirteenth_word_plain</code>.
            When <strong>disabled</strong>, that column is not written; encrypted phrase backup is unchanged. API will
            not return plaintext to the app when disabled.
          </p>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={save13thWordPlain}
              disabled={updatingSave13thWord}
              onChange={(e) => void updateSave13thWordPlain(e.target.checked)}
            />
            <span className="text-sm text-gray-900">
              {updatingSave13thWord ? 'Saving…' : 'Save 13th word (plaintext) when users create or import wallets'}
            </span>
          </label>
        </div>

        {/* P2P Trading Fee Rate */}
        <div className="mb-6">
          <label className="modal-label">
            P2P Trading Fee Rate (%)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Set the trading fee percentage (e.g., 1 for 1%, 5 for 5%). This fee is deducted from the seller when tokens are released.
          </p>
          {editingFeeRate ? (
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-input flex-1 py-3 max-w-48"
                value={newFeeRate}
                onChange={(e) => setNewFeeRate(e.target.value)}
              />
              <span className="text-sm text-gray-600">%</span>
              <button
                className={`btn btn-success ${updatingFeeRate ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateFeeRate}
                disabled={updatingFeeRate}
              >
                {updatingFeeRate ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingFeeRate(false);
                  setNewFeeRate(p2pFeeRate.toString());
                }}
                disabled={updatingFeeRate}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24 text-center">
                {p2pFeeRate}%
              </div>
              <button
                className="btn btn-blue"
                onClick={() => setEditingFeeRate(true)}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="modal-label">
            Minimum price per FDA (INR)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Applies to INR offers only (BUY and SELL). Users cannot set price per FDA below this in INR.
          </p>
          {editingMinOfferAmount ? (
            <div className="flex gap-3 items-center">
              <input
                type="text"
                pattern="^\d+(\.\d{0,18})?$"
                className="form-input flex-1 py-3 max-w-72"
                value={minOfferAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
                    setMinOfferAmount(value);
                  }
                }}
              />
              <span className="text-sm text-gray-600">INR / FDA</span>
              <button
                className={`btn btn-success ${updatingMinOfferAmount ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateMinOfferSetting}
                disabled={updatingMinOfferAmount}
              >
                {updatingMinOfferAmount ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingMinOfferAmount(false);
                  loadFdaPrice();
                }}
                disabled={updatingMinOfferAmount}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24">
                {minOfferAmount}
              </div>
              <button
                className="btn btn-blue"
                onClick={() => setEditingMinOfferAmount(true)}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="modal-label">Minimum price per FDA (USDT)</label>
          <p className="text-xs text-gray-600 mb-3">
            Applies to USDT offers only (BUY and SELL). Separate from the INR minimum.
          </p>
          {editingMinOfferAmountUsdt ? (
            <div className="flex gap-3 items-center">
              <input
                type="text"
                pattern="^\d+(\.\d{0,18})?$"
                className="form-input flex-1 py-3 max-w-72"
                value={minOfferAmountUsdt}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
                    setMinOfferAmountUsdt(value);
                  }
                }}
              />
              <span className="text-sm text-gray-600">USDT / FDA</span>
              <button
                className={`btn btn-success ${updatingMinOfferAmountUsdt ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateMinOfferUsdtSetting}
                disabled={updatingMinOfferAmountUsdt}
              >
                {updatingMinOfferAmountUsdt ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingMinOfferAmountUsdt(false);
                  loadFdaPrice();
                }}
                disabled={updatingMinOfferAmountUsdt}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24">
                {minOfferAmountUsdt}
              </div>
              <button
                className="btn btn-blue"
                onClick={() => setEditingMinOfferAmountUsdt(true)}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        {/* Holding FDA Amount */}
        <div className="mb-6">
          <label className="modal-label">
            Holding FDA Amount
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Set the minimum FDA balance users must maintain (supports up to 18 decimal places). Users cannot create offers or transfer if their usable balance would fall below this amount.{' '}
            <strong className="font-semibold text-gray-800">This is not the minimum USDT price per FDA for P2P</strong>
            — use &quot;Minimum price per FDA (USDT)&quot; in this same section for that.
          </p>
          {editingHoldingFda ? (
            <div className="flex gap-3 items-center">
              <input
                type="text"
                pattern="^\d+(\.\d{0,18})?$"
                className="form-input flex-1 py-3 max-w-72"
                placeholder="0.000000000000000000"
                value={newHoldingFda}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty, numbers, and decimal point with up to 18 decimal places
                  if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
                    setNewHoldingFda(value);
                  }
                }}
              />
              <span className="text-sm text-gray-600">FDA</span>
              <button
                className={`btn btn-success ${updatingHoldingFda ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateHoldingFda}
                disabled={updatingHoldingFda}
              >
                {updatingHoldingFda ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingHoldingFda(false);
                  setNewHoldingFda(holdingFdaAmount);
                }}
                disabled={updatingHoldingFda}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24">
                {holdingFdaAmount} FDA
              </div>
              <button
                className="btn btn-blue"
                onClick={() => {
                  setNewHoldingFda(holdingFdaAmount);
                  setEditingHoldingFda(true);
                }}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50">
          <label className="modal-label">FDA Hold Reward Rules</label>
          <p className="text-xs text-gray-700 mb-3">
            Users must keep funds unused until expiry to earn reward. Example: 25 FDA with 5% reward becomes 26.25 FDA after claim.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-700 block mb-1">Reward Rate (%)</label>
              <input
                type="number"
                min="5"
                max="10"
                step="0.01"
                className="form-input w-full"
                value={rewardRate}
                onChange={(e) => setRewardRate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700 block mb-1">Minimum Hold (FDA)</label>
              <input
                type="number"
                min="25"
                step="0.000000000000000001"
                className="form-input w-full"
                value={rewardMinAmount}
                onChange={(e) => setRewardMinAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700 block mb-1">Hold Period (Months)</label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-input w-full"
                value={rewardPeriodMonths}
                onChange={(e) => setRewardPeriodMonths(e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-700 block mb-1">Merchant Buy Reward Rate (% monthly)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input w-full"
                value={merchantBuyRewardRate}
                onChange={(e) => setMerchantBuyRewardRate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700 block mb-1">Merchant Buy Minimum Hold (FDA, min 10)</label>
              <input
                type="number"
                min="10"
                step="0.000000000000000001"
                className="form-input w-full"
                value={merchantBuyRewardMinAmount}
                onChange={(e) => setMerchantBuyRewardMinAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-700 block mb-1">Merchant Buy Hold Period (Months, min 12)</label>
              <input
                type="number"
                min="12"
                step="1"
                className="form-input w-full"
                value={merchantBuyRewardPeriodMonths}
                onChange={(e) => setMerchantBuyRewardPeriodMonths(e.target.value)}
              />
            </div>
          </div>
          <button
            className={`btn btn-yellow ${savingRewardSettings ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={savingRewardSettings}
            onClick={updateRewardSettings}
          >
            {savingRewardSettings ? 'Saving...' : 'Save Hold Reward Settings'}
          </button>
        </div>

        <div className="mb-6 p-4 rounded-lg border border-rose-200 bg-rose-50">
          <div className="flex items-center justify-between mb-3">
            <label className="modal-label mb-0">Holding Break Requests</label>
            <button
              type="button"
              className={`btn btn-secondary ${loadingBreakRequests ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={loadBreakRequests}
              disabled={loadingBreakRequests}
            >
              {loadingBreakRequests ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {breakRequests.length === 0 ? (
            <p className="text-xs text-gray-700">No break requests found.</p>
          ) : (
            <div className="space-y-2">
              {paginatedBreakRequests.map((req) => (
                <div key={req.id} className="card-dark p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      #{req.id} · {req.amount} FDA · {req.user?.fullName || req.user?.email || req.user?.phone || `User ${req.userId}`}
                    </span>
                    <span>{req.breakRequestStatus}</span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    Hold: {req.holdingPeriod} · Expires: {req.expiresAt ? new Date(req.expiresAt).toLocaleString() : '-'}
                  </div>
                  <div className="text-slate-500 mt-1">
                    Requested: {req.breakRequestedAt ? new Date(req.breakRequestedAt).toLocaleString() : '-'}
                  </div>
                  {req.breakRequestNote ? <div className="text-slate-500 mt-1">Note: {req.breakRequestNote}</div> : null}
                  {req.breakRequestStatus === 'PENDING' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-success ${decidingBreakId === req.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => openBreakDecisionModal(req.id, 'APPROVE')}
                        disabled={decidingBreakId === req.id}
                      >
                        Approve Unlock
                      </button>
                      <button
                        type="button"
                        className={`btn btn-red ${decidingBreakId === req.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => openBreakDecisionModal(req.id, 'REJECT')}
                        disabled={decidingBreakId === req.id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <SitePagination
                id="break-requests-pagination"
                currentPage={breakRequestsPage}
                totalPages={totalBreakRequestPages}
                onPageChange={setBreakRequestsPage}
              />
            </div>
          )}
        </div>
      </div>

      {breakDecisionModal.open && (
        <div
          role="presentation"
          onClick={closeBreakDecisionModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="break-decision-title"
            className="card-dark"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '28rem',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #475569',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            }}
          >
            <h3 id="break-decision-title" className="text-base font-semibold text-white mb-2">
              {breakDecisionModal.decision === 'APPROVE' ? 'Approve unlock request' : 'Reject unlock request'}
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              Holding #{breakDecisionModal.holdingId}
            </p>
            <label className="block text-xs text-slate-300 mb-2">
              Optional admin note
            </label>
            <textarea
              className="form-input w-full mb-3"
              rows={4}
              value={breakDecisionModal.note}
              onChange={(e) =>
                setBreakDecisionModal((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder={
                breakDecisionModal.decision === 'APPROVE'
                  ? 'Note for approval (optional)'
                  : 'Reason for rejection (optional)'
              }
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={closeBreakDecisionModal}
                disabled={decidingBreakId === breakDecisionModal.holdingId}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${breakDecisionModal.decision === 'APPROVE' ? 'btn-success' : 'btn-red'} w-full`}
                onClick={submitBreakDecision}
                disabled={decidingBreakId === breakDecisionModal.holdingId}
              >
                {decidingBreakId === breakDecisionModal.holdingId
                  ? 'Submitting...'
                  : breakDecisionModal.decision === 'APPROVE'
                    ? 'Approve'
                    : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Admin Monitoring Section */}
      <div className="offer-form-card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="offer-form-title">
            📊 Admin Monitoring
          </h3>
          <button
            className="btn btn-yellow text-sm py-2 px-4"
            onClick={loadAdminData}
          >
            🔄 Refresh Data
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Monitor recent trades (read-only). For disputes management, use the "Disputes" tab in the sidebar.
        </p>

        {/* Trades Section */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Recent Trades ({adminTrades.length})
          </p>
          {adminTrades.length > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                {paginatedAdminTrades.map((t) => (
                  <div key={t.id} className="card-dark p-3 text-xs text-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Trade #{t.id}:</strong> {t.amount} {t.asset_symbol} @ {t.price} {t.fiat_currency}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'DISPUTED' ? 'bg-yellow-200 text-yellow-800' :
                          t.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                            t.status === 'CANCELLED' ? 'bg-red-200 text-red-800' :
                              'bg-gray-200 text-gray-800'
                        }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <SitePagination
                id="admin-trades-pagination"
                currentPage={adminTradesPage}
                totalPages={totalAdminTradesPages}
                onPageChange={setAdminTradesPage}
              />
            </>
          ) : (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-600 text-center">No trades found.</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
};
