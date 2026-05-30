import React, { useState, useEffect, useMemo } from 'react';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';
import { type AuthState } from '../types';
import { MM } from '../../theme/metaMaskShell';
import { buyerCanDisputeAfterPaid, getReleaseTimeline } from './p2pTradeTimers';
import { myTradesMobileStatusPill } from './p2pMobileMyTradesCard';

interface P2PTradingProps {
  /** Light MetaMask-style cards/inputs on mobile (matches app shell). */
  inMobileShell?: boolean;
  auth: AuthState | null;
  /** When false, USDT is hidden and any USDT selection is coerced to INR. */
  canUseUsdt?: boolean;
  walletAddress?: string | null;
  internalFdaBalance: number | null;
  /** FDA you can list in new SELL offers (excludes active holds + holding reserve). Matches home "Available". */
  internalFdaUsable: number | null;
  internalFdaLocked: number | null;
  p2pFeeRate: number;
  /** Minimum price per FDA when offer fiat is INR. */
  p2pMinPricePerFda: number;
  /** Minimum price per FDA when offer fiat is USDT. */
  p2pMinPricePerFdaUsdt: number;
  addFdaAmount: string;
  setAddFdaAmount: (amount: string) => void;
  addingFdaBalance: boolean;
  offerType: 'BUY' | 'SELL';
  setOfferType: (type: 'BUY' | 'SELL') => void;
  offerFiatCurrency: 'INR' | 'USDT';
  setOfferFiatCurrency: (currency: string) => void;
  offerAmount: string;
  setOfferAmount: (amount: string) => void;
  offerPrice: string;
  setOfferPrice: (price: string) => void;
  offerMinLimit: string;
  setOfferMinLimit: (limit: string) => void;
  offerMaxLimit: string;
  setOfferMaxLimit: (limit: string) => void;
  offerPaymentMethods: string;
  setOfferPaymentMethods: (methods: string) => void;
  creatingOffer: boolean;
  myTrades: any[];
  releasingTokens: number | null;
  disputingTrade: number | null;
  cancellingTrade: number | null;
  cancelTrade: (tradeId: number) => Promise<void>;
  setSelectedTradeForPayment: (trade: any) => void;
  setPaymentScreenshot: (screenshot: string | null) => void;
  setShowPaymentModal: (show: boolean) => void;
  handleAddFdaBalance: () => Promise<void>;
  createOffer: () => Promise<void>;
  loadMyTrades: () => Promise<void>;
  openReleaseConfirmModal: (trade: any) => void;
  openDisputeModal: (trade: any) => void;
  /** When set (e.g. from Dashboard), mobile shell shows Chat / Chat Closed like Trade Listing. */
  openTradeChatModal?: (trade: any) => void;
}

interface PaymentMethod {
  id: number;
  paymentname: string;
  upi_id: string;
  qr_code: string | null;
  is_active: boolean;
}

function getPaymentMethodLabel(pm: PaymentMethod): string {
  const raw = String(pm.paymentname || '').trim();
  if (!raw) return 'Payment method';
  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return parts[0];
}

/** Avoid duplicate lines when saved name matches UPI (e.g. both "gpay"). */
function shouldShowUpiLine(pm: PaymentMethod, revealed: boolean): boolean {
  if (!revealed) return false;
  const upi = pm.upi_id?.trim();
  if (!upi) return false;
  return upi.toLowerCase() !== getPaymentMethodLabel(pm).toLowerCase();
}

export const P2PTrading: React.FC<P2PTradingProps> = ({
  inMobileShell = false,
  auth,
  canUseUsdt = false,
  walletAddress = null,
  internalFdaBalance,
  internalFdaUsable,
  internalFdaLocked,
  p2pFeeRate,
  p2pMinPricePerFda,
  p2pMinPricePerFdaUsdt,
  addFdaAmount,
  setAddFdaAmount,
  addingFdaBalance,
  offerType,
  setOfferType,
  offerFiatCurrency,
  setOfferFiatCurrency,
  offerAmount,
  setOfferAmount,
  offerPrice,
  setOfferPrice,
  offerMinLimit,
  setOfferMinLimit,
  offerMaxLimit,
  setOfferMaxLimit,
  offerPaymentMethods,
  setOfferPaymentMethods,
  creatingOffer,
  myTrades,
  releasingTokens,
  disputingTrade,
  cancellingTrade,
  cancelTrade,
  setSelectedTradeForPayment,
  setPaymentScreenshot,
  setShowPaymentModal,
  handleAddFdaBalance,
  createOffer,
  loadMyTrades,
  openReleaseConfirmModal,
  openDisputeModal,
  openTradeChatModal,
}) => {
  const [holdingUsableForNewHold, setHoldingUsableForNewHold] = useState<number | null>(null);

  useEffect(() => {
    const loadHoldingUsable = async () => {
      if (!auth?.token || !walletAddress) {
        setHoldingUsableForNewHold(null);
        return;
      }
      try {
        const res = await fetch(
          `${getApiUrl('internal/holdings/reward-status')}?wallet_address=${encodeURIComponent(String(walletAddress))}`,
          { headers: { Authorization: `Bearer ${auth.token}` } },
        );
        if (!res.ok) {
          setHoldingUsableForNewHold(null);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const value = data?.holdingBalanceSummary?.usableForNewHold;
        if (typeof value === 'number' && Number.isFinite(value)) {
          setHoldingUsableForNewHold(Math.max(0, Number(value)));
        } else {
          setHoldingUsableForNewHold(null);
        }
      } catch {
        setHoldingUsableForNewHold(null);
      }
    };
    void loadHoldingUsable();
  }, [auth?.token, walletAddress]);

  const sellableInternalFda = useMemo(() => {
    const balance =
      internalFdaBalance !== null && Number.isFinite(internalFdaBalance)
        ? Math.max(0, internalFdaBalance)
        : null;
    // Prefer the same holding-adjusted available value used on Home.
    const homeAvailable =
      holdingUsableForNewHold !== null && Number.isFinite(holdingUsableForNewHold)
        ? Math.max(0, holdingUsableForNewHold)
        : null;
    const usable =
      internalFdaUsable !== null && Number.isFinite(internalFdaUsable)
        ? Math.max(0, internalFdaUsable)
        : null;
    const locked =
      internalFdaLocked !== null && Number.isFinite(internalFdaLocked)
        ? Math.max(0, internalFdaLocked)
        : 0;

    if (homeAvailable !== null) {
      return balance === null ? homeAvailable : Math.min(homeAvailable, balance);
    }
    if (balance === null) return null;
    if (usable === null) return balance;
    // If everything says unlocked and usable is stale 0, keep a safe fallback.
    if (usable <= 0 && balance > 0 && locked <= 0) return balance;
    return Math.min(usable, balance);
  }, [internalFdaBalance, internalFdaUsable, internalFdaLocked, holdingUsableForNewHold]);

  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = React.useState(false);
  const [selectedPaymentMethodIds, setSelectedPaymentMethodIds] = React.useState<number[]>([]);
  /** Per method: when true, show UPI / QR preview for that row only (privacy). Selection still works. */
  const [revealPaymentDetailsById, setRevealPaymentDetailsById] = useState<Record<number, boolean>>({});

  const P2P_MY_TRADES_PER_PAGE = 12;
  const [myTradesPage, setMyTradesPage] = useState(1);
  const totalMyTradesPages = Math.max(1, Math.ceil(myTrades.length / P2P_MY_TRADES_PER_PAGE));
  const paginatedMyTrades = myTrades.slice(
    (myTradesPage - 1) * P2P_MY_TRADES_PER_PAGE,
    myTradesPage * P2P_MY_TRADES_PER_PAGE
  );
  useEffect(() => {
    if (myTradesPage > totalMyTradesPages && totalMyTradesPages > 0) setMyTradesPage(totalMyTradesPages);
  }, [myTrades.length, totalMyTradesPages, myTradesPage]);

  const needsPaidReleaseClock = useMemo(
    () =>
      myTrades.some((t: any) => String(t.status || '').toUpperCase() === 'PAID_PENDING_RELEASE'),
    [myTrades],
  );
  const [paidReleaseClock, setPaidReleaseClock] = useState(() => Date.now());
  useEffect(() => {
    if (!needsPaidReleaseClock) return;
    setPaidReleaseClock(Date.now());
    const id = window.setInterval(() => setPaidReleaseClock(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [needsPaidReleaseClock]);

  const formatParticipantFdaId = (fdaUserId: unknown, userId: unknown) => {
    if (fdaUserId != null && String(fdaUserId).trim() !== '') return String(fdaUserId).trim();
    if (userId != null && String(userId).trim() !== '') return String(userId);
    return '—';
  };

  const formatFdaUserIdPublic = (fdaUserId: unknown) => {
    if (fdaUserId == null) return '—';
    const s = String(fdaUserId).trim();
    return s !== '' ? s : '—';
  };

  const formatTradeDateTime = (value: unknown) => {
    if (value == null || String(value).trim() === '') return '—';
    const d = new Date(value as string | number | Date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatOfferMakerFdaId = (trade: any) =>
    formatFdaUserIdPublic(trade.offer_maker_fda_user_id);

  // Load payment methods from database
  React.useEffect(() => {
    if (auth) {
      loadPaymentMethods();
    }
  }, [auth,offerFiatCurrency]);

  React.useEffect(() => {
    const canUseUsdtNow = canUseUsdt || offerType === 'BUY';
    if (!canUseUsdtNow && offerFiatCurrency === 'USDT') {
      setOfferFiatCurrency('INR');
    }
  }, [canUseUsdt, offerType, offerFiatCurrency, setOfferFiatCurrency]);

  const loadPaymentMethods = async () => {
    if (!auth) return;
    setLoadingPaymentMethods(true);
    try {
      const res = await fetch(getApiUrl(`payment-methods?fiat=${offerFiatCurrency}`), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data || []);
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Initialize selected payment methods from existing payment methods string
  React.useEffect(() => {
    if (offerFiatCurrency && paymentMethods.length > 0) {
      // Try to match existing payment methods string with database payment methods
      const methods = offerPaymentMethods.split(',').map(m => m.trim());
      const matchedIds: number[] = [];
      paymentMethods.forEach((pm) => {
        if (
        methods.some(m =>
          m === pm.upi_id ||
          m === pm.paymentname ||
          m === `QR:${pm.id}`
        )
      ) {
          matchedIds.push(pm.id);
        }
      });
      if (matchedIds.length > 0) {
        setSelectedPaymentMethodIds(matchedIds);
      }
    } else if (offerFiatCurrency !== 'INR') {
      setSelectedPaymentMethodIds([]);
      setOfferPaymentMethods('');
    }
  }, [offerFiatCurrency, paymentMethods]);

  // Update payment methods string when selected payment methods change
  React.useEffect(() => {
    
      if (selectedPaymentMethodIds.length > 0) {
        const selectedMethods = paymentMethods
          .filter(pm => selectedPaymentMethodIds.includes(pm.id) && pm.is_active)
          .flatMap(pm => {
            const tokens: string[] = [];
            // Keep UPI and QR as separate tokens so buyer modal can render both.
            if (pm.upi_id) tokens.push(pm.upi_id);
            if (pm.qr_code) tokens.push(`QR:${pm.id}`);
            if (tokens.length === 0 && pm.paymentname) tokens.push(pm.paymentname);
            return tokens;
          });
        setOfferPaymentMethods(selectedMethods.join(', '));
      } else {
        setOfferPaymentMethods('');
      }
    
  }, [selectedPaymentMethodIds, paymentMethods]);

  const activePaymentMethodIds = paymentMethods
    .filter((pm) => pm.is_active)
    .map((pm) => pm.id);
  const canUseUsdtNow = canUseUsdt || offerType === 'BUY';
  const selectedActivePaymentMethodCount = selectedPaymentMethodIds.filter((id) =>
    activePaymentMethodIds.includes(id),
  ).length;
  /** UPI/QR in Profile is only used for INR settlement. Other fiats / USDT do not use those rows. */
  const sellRequiresProfilePaymentMethods = offerFiatCurrency === 'INR';
  const effectiveMinPricePerFda =
    offerFiatCurrency === 'USDT' ? p2pMinPricePerFdaUsdt : p2pMinPricePerFda;
  const isCreateOfferDisabled =
    creatingOffer ||
    !offerAmount ||
    !offerPrice ||
    Number(offerPrice) < effectiveMinPricePerFda ||
    (offerType === 'SELL' &&
      sellRequiresProfilePaymentMethods &&
      selectedActivePaymentMethodCount === 0);
  const createOfferDisabledReason =
    !offerAmount
      ? 'Enter FDA amount.'
      : !offerPrice
        ? 'Enter price per FDA.'
      : Number(offerPrice) < effectiveMinPricePerFda
        ? `Minimum price per FDA is ${effectiveMinPricePerFda} ${offerFiatCurrency === 'USDT' ? 'USDT' : 'INR'}.`
        : offerType === 'SELL' &&
            sellRequiresProfilePaymentMethods &&
            selectedActivePaymentMethodCount === 0
          ? 'Select at least one active payment method (required for INR / UPI).'
          : '';

  // UX: when SELL + INR has active methods but nothing selected, preselect first one.
  React.useEffect(() => {
    if (offerType !== 'SELL') return;
    if (offerFiatCurrency !== 'INR') return;
    if (activePaymentMethodIds.length === 0) return;
    if (selectedActivePaymentMethodCount > 0) return;
    setSelectedPaymentMethodIds((prev) => {
      const hasActiveSelection = prev.some((id) => activePaymentMethodIds.includes(id));
      return hasActiveSelection ? prev : [activePaymentMethodIds[0]];
    });
  }, [offerType, offerFiatCurrency, activePaymentMethodIds.join(','), selectedActivePaymentMethodCount]);

  const handlePaymentMethodToggle = (id: number) => {
    setSelectedPaymentMethodIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((methodId) => methodId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <>
      {inMobileShell && (
        <style>
          {`
          [data-p2p-mm="1"] .section-header { background: transparent !important; }
          [data-p2p-mm="1"] .section-title { color: ${MM.text} !important; }
          [data-p2p-mm="1"] .section-subtitle { color: ${MM.textSecondary} !important; }
          [data-p2p-mm="1"] .p2p-info-box { background: #fffbeb !important; border: 1px solid #fcd34d !important; }
          [data-p2p-mm="1"] .p2p-info-title { color: #92400e !important; }
          [data-p2p-mm="1"] .p2p-info-text { color: #78350f !important; }
          [data-p2p-mm="1"] .balance-display-card {
            background: ${MM.surface} !important;
            border: 1px solid ${MM.borderLight} !important;
            box-shadow: 0 1px 3px rgba(15,23,42,0.06) !important;
            padding: 10px 12px !important;
            margin: 0 12px 10px !important;
            border-radius: 12px !important;
          }
          [data-p2p-mm="1"] .balance-label { color: ${MM.textSecondary} !important; }
          [data-p2p-mm="1"] .balance-amount { color: ${MM.text} !important; }
          [data-p2p-mm="1"] .balance-locked { color: ${MM.textMuted} !important; }
          [data-p2p-mm="1"] .balance-display-header {
            align-items: center !important;
            min-height: 0 !important;
            gap: 8px !important;
          }
          [data-p2p-mm="1"] .balance-label {
            font-size: 11px !important;
            margin-bottom: 4px !important;
          }
          [data-p2p-mm="1"] .balance-amount {
            font-size: 32px !important;
            margin-bottom: 2px !important;
          }
          [data-p2p-mm="1"] .balance-locked {
            font-size: 11px !important;
            margin-top: 0 !important;
          }
          [data-p2p-mm="1"] .balance-icon {
            width: 28px !important;
            height: 28px !important;
            font-size: 15px !important;
          }
          [data-p2p-mm="1"] .section-header {
            margin-bottom: 10px !important;
            padding: 0 12px !important;
          }
          [data-p2p-mm="1"] .section-title {
            font-size: 30px !important;
            line-height: 1.15 !important;
            padding: 0 !important;
            margin-bottom: 6px !important;
          }
          [data-p2p-mm="1"] .section-subtitle {
            font-size: 12px !important;
            line-height: 1.35 !important;
            padding: 0 !important;
            margin-bottom: 8px !important;
          }
          [data-p2p-mm="1"] .action-card {
            background: ${MM.surface} !important;
            border: 1px solid ${MM.borderLight} !important;
            box-shadow: 0 1px 3px rgba(15,23,42,0.06) !important;
            overflow-x: hidden !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          [data-p2p-mm="1"] .action-card-header { border-bottom-color: ${MM.borderLight} !important; }
          [data-p2p-mm="1"] .action-card-title { color: ${MM.text} !important; }
          [data-p2p-mm="1"] .form-input-dark,
          [data-p2p-mm="1"] .form-select-dark {
            background: ${MM.surface} !important;
            color: ${MM.text} !important;
            border: 1px solid ${MM.border} !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            min-height: 48px !important;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }
          [data-p2p-mm="1"] .p2p-subheading { color: #374151 !important; }
          [data-p2p-mm="1"] .card-dark {
            background: ${MM.pageBg} !important;
            border: 1px solid ${MM.borderLight} !important;
          }
          [data-p2p-mm="1"] .warning-box { background: #fff7ed !important; border-color: #fed7aa !important; }
          [data-p2p-mm="1"] .warn-text { color: #9a3412 !important; }
          [data-p2p-mm="1"] .text-slate-300 { color: ${MM.text} !important; }
          [data-p2p-mm="1"] .p2p-info-box {
            padding: 8px 10px !important;
            margin-bottom: 8px !important;
            border-radius: 10px !important;
          }
          [data-p2p-mm="1"] .p2p-info-title {
            font-size: 11px !important;
            line-height: 1.35 !important;
            margin: 0 0 4px !important;
          }
          [data-p2p-mm="1"] .p2p-info-text {
            font-size: 11px !important;
            line-height: 1.35 !important;
            margin: 0 !important;
          }
          /* Light-shell cards: Tailwind slate-100/200 is for dark UI — force readable contrast */
          [data-p2p-mm="1"] .card-dark {
            color: ${MM.text} !important;
            background: ${MM.surface} !important;
          }
          [data-p2p-mm="1"] .card-dark .text-slate-100,
          [data-p2p-mm="1"] .card-dark .text-slate-200 {
            color: ${MM.text} !important;
          }
          [data-p2p-mm="1"] .card-dark .text-slate-400 {
            color: ${MM.textSecondary} !important;
          }
          [data-p2p-mm="1"] .card-dark .text-blue-300 {
            color: #1d4ed8 !important;
          }
          [data-p2p-mm="1"] .card-dark .text-rose-300 {
            color: #be123c !important;
          }
          [data-p2p-mm="1"] .card-dark .text-emerald-400 {
            color: #059669 !important;
          }
          [data-p2p-mm="1"] .card-dark .text-amber-400 {
            color: #d97706 !important;
          }
          /* Payment method pickers (same light card issue) */
          [data-p2p-mm="1"] .p2p-payment-option {
            color: ${MM.text} !important;
            background: ${MM.surface} !important;
            border-color: ${MM.border} !important;
          }
          [data-p2p-mm="1"] .p2p-payment-option[data-selected="true"] {
            border: 1px solid ${MM.border} !important;
            background: #f8fafc !important;
            border-left: 1px solid ${MM.border} !important;
          }
          [data-p2p-mm="1"] .p2p-payment-option[data-selected="false"]:hover {
            background: #f9fafb !important;
          }
          `}
        </style>
      )}
    <div className="pb-32 md:pb-6" data-p2p-mm={inMobileShell ? '1' : undefined}>
      <div className="section-header">
        <h2 className="section-title" style={{ padding: inMobileShell ? 0 : '0.5rem 1rem' }}>P2P Trading</h2>
        <p className="section-subtitle" style={{ padding: inMobileShell ? 0 : '0.5rem 1rem' }}>
          Buy and sell tokens with other users using MC Wallet to MC Wallet transfers only. {p2pFeeRate}% trading fee applies.
        </p>
      </div>

      {!auth && (
        <div className="warning-box">
          <div className="warning-box-content">
            <span className="warning-icon">⚠️</span>
            <p className="text-sm font-semibold warn-text" style={{ padding: '0.5rem 1rem' }}>Login Required</p>
          </div>
          <p className="text-xs waring-para" style={{ padding: '0.5rem 1rem' }}>
            Please login to use P2P trading features.
          </p>
        </div>
      )}

      {auth && (
        <>
          {/* Balance Info */}
          {sellableInternalFda !== null && (
            <div className="balance-display-card">
              <div className="balance-display-header">
                <div>
                  <p className="balance-label">Available FDA Balance</p>
                  <p className="balance-amount">
                    {sellableInternalFda.toFixed(2)} FDA
                  </p>
                  {internalFdaBalance !== null &&
                    sellableInternalFda !== null &&
                    internalFdaBalance > sellableInternalFda + 1e-9 && (
                      <p className="balance-locked" style={{ fontSize: '0.7rem', lineHeight: 1.35 }}>
                        {internalFdaBalance.toFixed(2)} FDA custodial · difference is active holds / minimum reserve
                      </p>
                    )}
                  {internalFdaLocked !== null && internalFdaLocked > 0 && (
                    <p className="balance-locked">
                      {internalFdaLocked.toFixed(2)} FDA locked in offers
                    </p>
                  )}
                </div>
                <div className="balance-icon">💰</div>
              </div>
            </div>
          )}

          {/* Create Offer Section */}
          <div className="action-card mb-6">
            <div className="action-card-header">
              <span className="action-card-icon">📝</span>
              <p className="action-card-title" style={{ color: 'rgb(249, 250, 251)' }}>Create Offer (MC Wallet to MC Wallet Only)</p>
            </div>
            {/* Offer type — segmented control (no native OS dropdown) */}
            <div className="mb-4">
              <p className="text-xs text-white mb-2 font-semibold p2p-subheading">Offer Type</p>
              <div
                role="group"
                aria-label="Offer type"
                style={{
                  display: "flex",
                  gap: inMobileShell ? 10 : 8,
                  padding: 4,
                  borderRadius: MM.radius,
                  background: inMobileShell ? MM.pageBg : "rgba(15,23,42,0.5)",
                  border: `1px solid ${inMobileShell ? MM.border : "#475569"}`,
                  boxSizing: "border-box",
                }}
              >
                {(
                  [
                    { key: "BUY" as const, title: "Buy", short: "You buy FDA" },
                    { key: "SELL" as const, title: "Sell", short: "You sell FDA" },
                  ]
                ).map(({ key, title, short }) => {
                  const active = offerType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOfferType(key)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "12px 10px",
                        borderRadius: MM.radius - 2,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        background: active
                          ? MM.accent
                          : inMobileShell
                            ? MM.surface
                            : "#0f172a",
                        color: active ? "#fff" : inMobileShell ? MM.text : "#e2e8f0",
                        boxShadow: active
                          ? "0 2px 8px rgba(37, 99, 235, 0.35)"
                          : "none",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontWeight: 800,
                          fontSize: 15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {title}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          opacity: active ? 0.95 : 0.75,
                          lineHeight: 1.3,
                          wordBreak: "break-word",
                        }}
                      >
                        {short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <div>
                <p className="text-xs  mb-2 p2p-subheading">Price currency (per 1 FDA)</p>
                <select
                  className="form-select-dark w-full py-3"
                  value={offerFiatCurrency}
                  onChange={(e) => setOfferFiatCurrency(e.target.value)}
                >
                  <option value="INR">INR</option>
                  {canUseUsdtNow ? <option value="USDT">USDT</option> : null}
                </select>
                {offerFiatCurrency === 'INR' && (
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">UPI / QR from Profile.</p>
                )}
                {offerFiatCurrency === 'USDT' && (
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">USDT from your saved payout address.</p>
                )}
                {!canUseUsdtNow && (
                  <p className="text-[11px] text-amber-300/90 mt-1.5 leading-snug">
                    Add a USDT (BEP20) address under Payment Methods for USDT.
                  </p>
                )}
              </div>
            </div>

            <div
              className={
                inMobileShell
                  ? "flex flex-col gap-4 mb-4"
                  : "grid grid-cols-2 gap-4 mb-4"
              }
            >
              <div style={{ minWidth: 0 }}>
                <p className="text-xs  mb-2 font-semibold p2p-subheading">
                  Amount (FDA) {offerType === 'SELL' && sellableInternalFda !== null && (
                    <span className="text-slate-200" style={{ fontSize: '0.7rem' }}>
                      (Available: {sellableInternalFda.toFixed(2)})
                    </span>
                  )}
                  {offerType === 'BUY' && (
                    <span className="text-slate-400" style={{ fontSize: '0.7rem' }}>
                      (Amount you want to buy)
                    </span>
                  )}
                </p>
                {inMobileShell ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className="form-input-dark form-input-dark-focus py-3 w-full"
                      placeholder="FDA AMOUNT"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      aria-label="FDA amount"
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                    {offerType === "SELL" && sellableInternalFda !== null && (
                      <button
                        type="button"
                        className="btn btn-yellow text-sm py-3 w-full"
                        onClick={() =>
                          setOfferAmount(sellableInternalFda.toFixed(2))
                        }
                        style={{
                          boxSizing: "border-box",
                          maxWidth: "100%",
                        }}
                      >
                        Use max ({sellableInternalFda.toFixed(2)} FDA)
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex gap-2 items-stretch"
                    style={{ width: "100%", minWidth: 0, maxWidth: "100%" }}
                  >
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className="form-input-dark form-input-dark-focus py-3"
                      placeholder="FDA AMOUNT"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      aria-label="FDA amount"
                      style={{
                        flex: "1 1 0%",
                        minWidth: 0,
                        width: "auto",
                        maxWidth: "100%",
                      }}
                    />
                    {offerType === "SELL" && sellableInternalFda !== null && (
                      <button
                        type="button"
                        className="btn btn-yellow text-xs py-3 px-4"
                        onClick={() =>
                          setOfferAmount(sellableInternalFda.toFixed(2))
                        }
                        style={{
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          alignSelf: "stretch",
                        }}
                      >
                        MAX
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs  mb-2 font-semibold p2p-subheading">Price per FDA</p>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input-dark form-input-dark-focus w-full py-3"
                  placeholder="0.00"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
                {offerFiatCurrency === 'INR' && (
                  <p className="text-xs mt-2 mb-0" style={{ color: inMobileShell ? MM.textSecondary : '#94a3b8' }}>
                    Minimum price per FDA: {p2pMinPricePerFda}
                  </p>
                )}
                {offerFiatCurrency === 'USDT' && (
                  <p className="text-xs mt-2 mb-0" style={{ color: inMobileShell ? MM.textSecondary : '#94a3b8' }}>
                    Minimum price per FDA: {p2pMinPricePerFdaUsdt} USDT
                  </p>
                )}
              </div>
            </div>

            <div
              className={
                inMobileShell
                  ? "flex flex-col gap-4 mb-4"
                  : "grid grid-cols-2 gap-4 mb-4"
              }
            >
              <div style={{ minWidth: 0 }}>
                <p className="text-xs mb-2 font-semibold p2p-subheading">Min Limit ({offerFiatCurrency})</p>
                {offerFiatCurrency === 'USDT' && (
                  <p className="text-xs mb-1" style={{ color: inMobileShell ? MM.textMuted : '#64748b' }}>
                    Smallest slice (1 FDA × price). Admin USDT minimum applies to price per FDA above, not this field.
                  </p>
                )}
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input-dark w-full py-3"
                  placeholder="Auto-calculated"
                  value={offerMinLimit}
                  onChange={(e) => setOfferMinLimit(e.target.value)}
                  readOnly={!!(offerAmount && offerPrice)}
                  style={offerAmount && offerPrice ? { backgroundColor: '#1e293b', cursor: 'not-allowed' } : {}}
                />
                {offerAmount && offerPrice && (
                  <p className="text-xs text-slate-400 mt-1">Auto: 1 FDA × {offerPrice} = {offerMinLimit}</p>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="text-xs  mb-2 font-semibold p2p-subheading">Max Limit ({offerFiatCurrency})</p>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input-dark w-full py-3"
                  placeholder="Auto-calculated"
                  value={offerMaxLimit}
                  onChange={(e) => setOfferMaxLimit(e.target.value)}
                  readOnly={!!(offerAmount && offerPrice)}
                  style={offerAmount && offerPrice ? { backgroundColor: '#1e293b', cursor: 'not-allowed' } : {}}
                />
                {offerAmount && offerPrice && (
                  <p className="text-xs text-slate-400 mt-1">Auto: {offerAmount} FDA × {offerPrice} = {offerMaxLimit}</p>
                )}
              </div>
            </div>

            {offerType === 'SELL' && sellRequiresProfilePaymentMethods && (
              <div className="mb-4">
              <p className="text-xs  mb-2 p2p-subheading">Payment Methods</p>
              <p className="text-xs mb-2" style={{ color: inMobileShell ? MM.textSecondary : '#94a3b8' }}>
                Choose how buyers will pay you (UPI / QR saved under Profile → Payment Methods). Tap a row to select.
                Each row has a switch to show or hide that method&apos;s UPI / QR preview.
              </p>
              {selectedActivePaymentMethodCount === 0 && (
                <p className="text-xs mt-1 mb-2 font-medium" style={{ color: '#b45309' }}>⚠️ Select at least one payment method to create a sell offer.</p>
              )}


              {offerFiatCurrency  &&  (
                
                <div className="space-y-2">
                  {loadingPaymentMethods ? (
                    <p className="text-xs text-slate-400">Loading payment methods...</p>
                  ) : paymentMethods.length === 0 ? (
                    <div className="warning-box p-3">
                      <p className="text-xs text-slate-300 mb-2">⚠️ No active payment methods found {offerFiatCurrency}</p>
                      <p className="text-xs text-slate-400">
                        Please add payment methods in the "Payment Methods" section first.
                      </p>
                    </div>
                    
                  ) : (
                    <>

                      {paymentMethods
                        .filter(pm => pm.is_active)
                        .map((method) => {
                          const selected = selectedPaymentMethodIds.includes(method.id);
                          const revealed = !!revealPaymentDetailsById[method.id];
                          const hasQr =
                            !!method.qr_code &&
                            (method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http'));
                          const showPreviewToggle = !!(method.upi_id?.trim() || hasQr);
                          return (
                            <div
                              key={method.id}
                              className={`p2p-payment-option rounded-xl border p-3 transition-colors ${
                                inMobileShell ? '' : selected ? '' : 'hover:bg-slate-800/60'
                              }`}
                              style={
                                selected
                                  ? inMobileShell
                                    ? { borderColor: MM.border, background: '#f8fafc', borderLeft: `1px solid ${MM.border}` }
                                    : { borderColor: '#475569', background: 'rgba(241,245,249,0.7)', borderLeft: '1px solid #475569' }
                                  : undefined
                              }
                            >
                              <div className="flex items-start gap-2">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    style={{
                                      position: 'absolute',
                                      opacity: 0,
                                      pointerEvents: 'none',
                                      width: 1,
                                      height: 1,
                                    }}
                                    checked={selected}
                                    onChange={() => handlePaymentMethodToggle(method.id)}
                                    aria-label={`Select payment method ${getPaymentMethodLabel(method)}`}
                                  />
                                  <span
                                    className="mt-0.5 flex shrink-0 items-center justify-center rounded border-2 bg-white"
                                    style={
                                      selected
                                        ? {
                                            width: 18,
                                            height: 18,
                                            borderColor: '#475569',
                                            backgroundColor: '#ffffff',
                                          }
                                        : {
                                            width: 18,
                                            height: 18,
                                            borderColor: '#94a3b8',
                                            backgroundColor: '#ffffff',
                                          }
                                    }
                                    aria-hidden
                                  >
                                    {selected && (
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                                        <path
                                          d="M2 6l2.5 2.5L10 3"
                                          stroke="#334155"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold p2p-subheading break-words">
                                      {getPaymentMethodLabel(method)}
                                    </p>
                                    {(method.upi_id?.trim() || hasQr) && (
                                      <p className="text-xs mt-0.5" style={{ color: inMobileShell ? MM.textMuted : '#94a3b8' }}>
                                        {method.upi_id?.trim() && hasQr
                                          ? 'UPI + QR'
                                          : hasQr
                                            ? 'QR payment'
                                            : 'UPI payment'}
                                      </p>
                                    )}
                                    {shouldShowUpiLine(method, revealed) && (
                                      <p className="text-xs mt-1 text-slate-300 break-all">
                                        {method.upi_id}
                                      </p>
                                    )}
                                    {revealed && hasQr && (
                                      <img
                                        src={method.qr_code!}
                                        alt="QR Code"
                                        className={`mt-2 max-h-24 w-auto max-w-[140px] object-contain rounded-lg border ${
                                          inMobileShell ? 'border-gray-200' : 'border-slate-500'
                                        }`}
                                      />
                                    )}
                                  </div>
                                </label>
                                {showPreviewToggle ? (
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span
                                      className="text-[10px] font-medium leading-tight text-right max-w-[72px]"
                                      style={{ color: inMobileShell ? MM.textSecondary : '#94a3b8' }}
                                    >
                                      UPI / QR
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={revealed}
                                      aria-label={`${revealed ? 'Hide' : 'Show'} UPI and QR for ${getPaymentMethodLabel(method)}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setRevealPaymentDetailsById((prev) => ({
                                          ...prev,
                                          [method.id]: !prev[method.id],
                                        }));
                                      }}
                                      style={{
                                        width: 46,
                                        height: 28,
                                        borderRadius: 999,
                                        border: `1px solid ${inMobileShell ? MM.border : '#64748b'}`,
                                        background: revealed ? '#64748b' : inMobileShell ? MM.chipBg : '#334155',
                                        position: 'relative',
                                        flexShrink: 0,
                                        transition: 'background 0.2s',
                                      }}
                                    >
                                      <span
                                        style={{
                                          position: 'absolute',
                                          top: 3,
                                          left: revealed ? 22 : 4,
                                          width: 20,
                                          height: 20,
                                          borderRadius: '50%',
                                          background: '#fff',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                          transition: 'left 0.2s',
                                        }}
                                      />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      {/* {selectedPaymentMethodIds.length === 0 && (
                        <p className="text-xs mt-2" style={{ color: '#93b65a' }}>⚠️ Please select at least one payment method</p>
                      )} */}
                    </>
                  )}
                </div>
              ) }
            </div>
            )}

            {offerType === 'SELL' && !sellRequiresProfilePaymentMethods && (
              <div
                className="mb-4 rounded-xl border p-3"
                style={{
                  borderColor: inMobileShell ? MM.borderLight : '#475569',
                  background: inMobileShell ? MM.pageBg : 'rgba(15,23,42,0.35)',
                }}
              >
                <p className="text-xs font-semibold p2p-subheading">Settlement ({offerFiatCurrency})</p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: inMobileShell ? MM.textSecondary : '#94a3b8' }}>
                  USDT: price above; transfer off-app.
                </p>
              </div>
            )}

            {offerType === 'BUY' &&(
               <input
                  type="text"
                  className="form-input-dark w-full py-3"
                  placeholder="e.g. Bank Transfer, PayPal, Cash"
                  value={offerPaymentMethods}
                  onChange={(e) => setOfferPaymentMethods(e.target.value)}
                />
            )}

            {offerAmount && offerPrice && (
              <div className="card-dark mb-4 p-3">
                <p className="text-xs text-slate-400 mb-1">Total Value</p>
                <p className="text-base font-semibold text-slate-50 mb-2">
                  {(Number(offerAmount) * Number(offerPrice)).toFixed(2)} {offerFiatCurrency}
                </p>
                <div className="p2p-info-box p-2">
                  <p className="p2p-info-title">
                    💰 Trading Fee: {p2pFeeRate}% ({(Number(offerAmount) * (p2pFeeRate / 100)).toFixed(4)} FDA)
                  </p>
                  <p className="p2p-info-text">
                    Buyer receives: {(Number(offerAmount) * (1 - p2pFeeRate / 100)).toFixed(4)} FDA
                  </p>
                </div>
              </div>
            )}

            <button
              className={`btn btn-yellow w-full ${isCreateOfferDisabled ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              onClick={createOffer}
              disabled={isCreateOfferDisabled}
            >
              {creatingOffer ? 'Creating...' : offerType === 'BUY' ? '📥 Create Buy Offer' : '📤 Create Sell Offer'}
            </button>
            {isCreateOfferDisabled && !creatingOffer && createOfferDisabledReason && (
              <p className="text-xs mt-2 text-center" style={{ color: '#b45309' }}>
                {createOfferDisabledReason}
              </p>
            )}
          </div>

          {/* My Trades */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <p
                className={`text-sm font-semibold ${inMobileShell ? '' : 'text-slate-300'}`}
                style={inMobileShell ? { color: MM.text } : undefined}
              >
                My Trades ({myTrades.length})
              </p>
              <button
                type="button"
                className={`btn text-xs py-2 px-3 ${inMobileShell ? '' : 'btn-secondary'}`}
                style={
                  inMobileShell
                    ? { background: MM.surface, color: MM.text, border: `1px solid ${MM.border}` }
                    : undefined
                }
                onClick={loadMyTrades}
              >
                🔄 Refresh
              </button>
            </div>
            {myTrades.length > 0 ? (
              <>
                {inMobileShell ? (
                  <div className="space-y-3 px-1">
                    {paginatedMyTrades.map((trade: any) => {
                      const isBuyer = trade.buyer_id === auth?.user.id;
                      const isSeller = trade.seller_id === auth?.user.id;
                      const feeAmount = parseFloat(trade.fee_amount || trade.fee || 0);
                      const amountReceived = parseFloat(trade.amount) - feeAmount;
                      const statusUpper = String(trade.status || '').toUpperCase();
                      const statusPill = myTradesMobileStatusPill(statusUpper);
                      const chatClosed = ['COMPLETED', 'CANCELLED'].includes(statusUpper);
                      const releaseTl =
                        statusUpper === 'PAID_PENDING_RELEASE'
                          ? getReleaseTimeline(trade, paidReleaseClock, isSeller ? 'seller' : 'buyer')
                          : null;
                      const counterpartyDisplay = isBuyer
                        ? trade.seller_name || trade.seller_email || trade.seller_phone || '—'
                        : trade.buyer_name || trade.buyer_email || trade.buyer_phone || '—';
                      return (
                        <div
                          key={trade.id}
                          style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            padding: 12,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong style={{ color: '#111827', fontSize: 14 }}>#{trade.id}</strong>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 999,
                                background: isBuyer ? '#2563eb' : '#dc2626',
                                color: '#fff',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {isBuyer ? 'BUY' : 'SELL'}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                              gap: '6px 10px',
                              fontSize: 12,
                              alignItems: 'baseline',
                            }}
                          >
                            <span style={{ color: '#6b7280' }}>Amount</span>
                            <span style={{ color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {parseFloat(trade.amount).toFixed(4)} {trade.asset_symbol}
                            </span>
                            <span style={{ color: '#6b7280' }}>Price</span>
                            <span style={{ color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {parseFloat(trade.price).toFixed(2)} {trade.fiat_currency}
                            </span>
                            <span style={{ color: '#6b7280' }}>Total</span>
                            <span
                              style={{
                                color: '#111827',
                                textAlign: 'right',
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}
                            </span>
                            <span style={{ color: '#6b7280' }}>Status</span>
                            <span style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  background: statusPill.bg,
                                  color: '#fff',
                                }}
                              >
                                {statusPill.label}
                              </span>
                            </span>
                            <span style={{ color: '#6b7280' }}>Created</span>
                            <span
                              style={{
                                color: '#334155',
                                textAlign: 'right',
                                fontSize: 11,
                                lineHeight: 1.35,
                                wordBreak: 'break-word',
                              }}
                            >
                              {formatTradeDateTime(trade.created_at)}
                            </span>
                            <span style={{ color: '#6b7280' }}>Counterparty</span>
                            <span style={{ textAlign: 'right' }}>
                              <div style={{ color: '#111827', wordBreak: 'break-word', fontWeight: 500 }}>{counterpartyDisplay}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                Offer creator FDA USER ID {formatOfferMakerFdaId(trade)}
                              </div>
                            </span>
                            {statusUpper === 'COMPLETED' ? (
                              <>
                                <span style={{ color: '#6b7280' }}>{isBuyer ? 'Received' : 'Sent'}</span>
                                <span style={{ color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {feeAmount > 0 && isBuyer
                                    ? `${amountReceived.toFixed(4)} FDA`
                                    : `${parseFloat(trade.amount).toFixed(4)} FDA`}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {statusUpper === 'PAID_PENDING_RELEASE' && releaseTl && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: '8px 10px',
                                background: releaseTl.overdue ? '#fef2f2' : '#f8fafc',
                                borderRadius: 8,
                                fontSize: 11,
                                color: '#334155',
                                lineHeight: 1.45,
                                border: `1px solid ${releaseTl.overdue ? '#fecaca' : '#e2e8f0'}`,
                              }}
                            >
                              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Release step</div>
                              <div style={{ fontWeight: 700, color: releaseTl.overdue ? '#b91c1c' : '#0f172a' }}>{releaseTl.headline}</div>
                              <div style={{ marginTop: 6, color: '#475569' }}>{releaseTl.detail}</div>
                              {isSeller && (
                                <div style={{ marginTop: 6, color: '#b45309', fontWeight: 600 }}>
                                  You are the seller — tap Release after you confirm payment.
                                </div>
                              )}
                              {isBuyer && (
                                <div style={{ marginTop: 6, color: '#1d4ed8', fontWeight: 600 }}>
                                  You are the buyer — wait for the seller to release FDA.
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                            {openTradeChatModal && (
                              <button
                                type="button"
                                className="btn w-full text-xs py-2"
                                onClick={() => openTradeChatModal(trade)}
                                style={{ background: chatClosed ? '#94a3b8' : '#2563eb', color: '#fff' }}
                              >
                                {chatClosed ? '💬 Chat Closed' : '💬 Chat'}
                              </button>
                            )}
                            {isBuyer &&
                              (trade.status === 'PENDING' || trade.status === 'PENDING_PAYMENT') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedTradeForPayment(trade);
                                      setPaymentScreenshot(null);
                                      setShowPaymentModal(true);
                                    }}
                                    className="btn btn-yellow w-full text-xs py-2"
                                  >
                                    ✅ Pay
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void cancelTrade(trade.id)}
                                    disabled={cancellingTrade === trade.id}
                                    className="btn w-full text-xs py-2"
                                    style={{
                                      background:
                                        cancellingTrade === trade.id ? '#9ca3af' : '#ef4444',
                                      color: '#fff',
                                    }}
                                  >
                                    {cancellingTrade === trade.id ? '...' : '❌ Cancel trade'}
                                  </button>
                                </>
                              )}
                            {isSeller && trade.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void cancelTrade(trade.id)}
                                  disabled={cancellingTrade === trade.id}
                                  className="btn w-full text-xs py-2"
                                  style={{
                                    background:
                                      cancellingTrade === trade.id ? '#9ca3af' : '#ef4444',
                                    color: '#fff',
                                  }}
                                >
                                  {cancellingTrade === trade.id ? '...' : '❌ Cancel trade'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDisputeModal(trade)}
                                  disabled={disputingTrade === trade.id}
                                  className="btn w-full text-xs py-2"
                                  style={{
                                    background:
                                      disputingTrade === trade.id ? '#9ca3af' : '#f59e0b',
                                    color: '#fff',
                                  }}
                                >
                                  {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                </button>
                              </>
                            )}
                            {trade.status === 'PAID_PENDING_RELEASE' && isSeller && (
                              <>
                                <button
                                  onClick={() => openReleaseConfirmModal(trade)}
                                  disabled={releasingTokens === trade.id}
                                  className="btn w-full text-xs py-2"
                                  style={{ background: releasingTokens === trade.id ? '#9ca3af' : '#10b981', color: '#fff' }}
                                >
                                  {releasingTokens === trade.id ? '...' : '🚀 Release'}
                                </button>
                                {(trade.payment_screenshot || trade.paymentScreenshot) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const src = trade.payment_screenshot || trade.paymentScreenshot;
                                      const newWindow = window.open();
                                      if (newWindow && src) {
                                        newWindow.document.write(`<html><head><title>Payment Screenshot - Trade #${trade.id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${src}" alt="Payment Screenshot" /></body></html>`);
                                      }
                                    }}
                                    className="btn w-full text-xs py-2"
                                    style={{ background: '#6366f1', color: '#fff' }}
                                  >
                                    📸 View Screenshot
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openDisputeModal(trade)}
                                  disabled={disputingTrade === trade.id}
                                  className="btn w-full text-xs py-2"
                                  style={{ background: disputingTrade === trade.id ? '#9ca3af' : '#f59e0b', color: '#fff' }}
                                >
                                  {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                </button>
                              </>
                            )}
                            {trade.status === 'PAID_PENDING_RELEASE' && isBuyer && (
                              <button
                                type="button"
                                onClick={() => openDisputeModal(trade)}
                                disabled={
                                  disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                }
                                className="btn w-full text-xs py-2"
                                style={{
                                  background:
                                    disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                      ? '#9ca3af'
                                      : '#f59e0b',
                                  color: '#fff',
                                }}
                              >
                                {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                              </button>
                            )}
                            {trade.status === 'COMPLETED' && (
                              <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, textAlign: 'center' }}>
                                ✅ {isBuyer ? 'Received' : 'Sent'}{' '}
                                {isBuyer && feeAmount > 0
                                  ? `${amountReceived.toFixed(4)} FDA`
                                  : `${parseFloat(trade.amount).toFixed(4)} FDA`}
                              </span>
                            )}
                            {trade.status === 'DISPUTED' && (
                              <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600, textAlign: 'center' }}>
                                ⚠️ Disputed
                              </span>
                            )}
                            {trade.status === 'CANCELLED' && (
                              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                                ❌ Cancelled
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Trade ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Type</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Total</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Counterparty</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Created</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>FDA (you)</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMyTrades.map((trade: any) => {
                        const isBuyer = trade.buyer_id === auth?.user.id;
                        const isSeller = trade.seller_id === auth?.user.id;
                        const statusUpperRow = String(trade.status || '').toUpperCase();
                        const releaseTlRow =
                          statusUpperRow === 'PAID_PENDING_RELEASE'
                            ? getReleaseTimeline(trade, paidReleaseClock, isSeller ? 'seller' : 'buyer')
                            : null;
                        const feeAmount = parseFloat(trade.fee_amount || trade.fee || 0);
                        const amountReceived = parseFloat(trade.amount) - feeAmount;

                        return (
                          <tr
                            key={trade.id}
                            style={{
                              borderBottom: '1px solid #e5e7eb',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            {/* Trade ID */}
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              #{trade.id}
                            </td>

                            {/* Type */}
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                background: isBuyer ? '#dbeafe' : '#fef2f2',
                                color: isBuyer ? '#2563eb' : '#dc2626',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase'
                              }}>
                                {isBuyer ? 'BUY' : 'SELL'}
                              </span>
                            </td>

                            {/* Amount */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {parseFloat(trade.amount).toFixed(4)} {trade.asset_symbol}
                            </td>

                            {/* Price */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {parseFloat(trade.price).toFixed(2)} {trade.fiat_currency}
                            </td>

                            {/* Total */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>
                              {(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                background: trade.status === 'COMPLETED' ? '#d1fae5'
                                  : trade.status === 'PAID_PENDING_RELEASE' ? '#fef2f2'
                                    : trade.status === 'DISPUTED' ? '#fef3c7'
                                      : trade.status === 'CANCELLED' ? '#fee2e2'
                                        : '#e2e8f0',
                                color: trade.status === 'COMPLETED' ? '#065f46'
                                  : trade.status === 'PAID_PENDING_RELEASE' ? '#dc2626'
                                    : trade.status === 'DISPUTED' ? '#d97706'
                                      : trade.status === 'CANCELLED' ? '#991b1b'
                                        : '#475569',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                              }}>
                                {trade.status === 'COMPLETED' ? '✅ COMPLETED' : trade.status === 'PAID_PENDING_RELEASE' ? '💰 PAID' : trade.status === 'PENDING' || trade.status === 'PENDING_PAYMENT' ? '⏳ PENDING' : trade.status}
                              </span>
                            </td>

                            {/* Counterparty */}
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {isBuyer ? (trade.seller_name || trade.seller_email || trade.seller_phone || 'Unknown') : (trade.buyer_name || trade.buyer_email || trade.buyer_phone || 'Unknown')}
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.35 }}>
                                Offer creator FDA USER ID{' '}
                                <strong style={{ color: '#334155' }}>{formatOfferMakerFdaId(trade)}</strong>
                              </div>
                              {releaseTlRow && (
                                <div
                                  style={{
                                    fontSize: '0.65rem',
                                    color: releaseTlRow.overdue ? '#b91c1c' : '#64748b',
                                    marginTop: '0.35rem',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  <strong>{releaseTlRow.headline}</strong>
                                  <div style={{ marginTop: 4, fontWeight: 400 }}>{releaseTlRow.detail}</div>
                                </div>
                              )}
                            </td>

                            {/* Created */}
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {formatTradeDateTime(trade.created_at)}
                            </td>

                            {/* FDA settled from your perspective (buyer = received net, seller = sent gross) */}
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                              {trade.status === 'COMPLETED' && isBuyer && feeAmount > 0 ? (
                                <span>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Received</span>
                                  {amountReceived.toFixed(4)} FDA
                                  <br />
                                  <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                                    (fee: {feeAmount.toFixed(4)})
                                  </span>
                                </span>
                              ) : trade.status === 'COMPLETED' && isBuyer ? (
                                <span>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Received</span>
                                  {parseFloat(trade.amount).toFixed(4)} FDA
                                </span>
                              ) : trade.status === 'COMPLETED' && isSeller ? (
                                <span>
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 }}>Sent</span>
                                  {parseFloat(trade.amount).toFixed(4)} FDA
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', minWidth: '120px' }}>
                                {isBuyer &&
                                  (trade.status === 'PENDING' ||
                                    trade.status === 'PENDING_PAYMENT') && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedTradeForPayment(trade);
                                          setPaymentScreenshot(null);
                                          setShowPaymentModal(true);
                                        }}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          fontSize: '0.7rem',
                                          fontWeight: '600',
                                          background: '#fbbf24',
                                          color: '#1e293b',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          width: '100%',
                                        }}
                                      >
                                        ✅ Pay
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void cancelTrade(trade.id)}
                                        disabled={cancellingTrade === trade.id}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          fontSize: '0.7rem',
                                          fontWeight: '600',
                                          background:
                                            cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor:
                                            cancellingTrade === trade.id ? 'not-allowed' : 'pointer',
                                          width: '100%',
                                        }}
                                      >
                                        {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                      </button>
                                    </>
                                  )}
                                {isSeller && trade.status === 'PENDING' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void cancelTrade(trade.id)}
                                      disabled={cancellingTrade === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background:
                                          cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor:
                                          cancellingTrade === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDisputeModal(trade)}
                                      disabled={disputingTrade === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background:
                                          disputingTrade === trade.id ? '#d1d5db' : '#f59e0b',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor:
                                          disputingTrade === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                    </button>
                                  </>
                                )}
                                {trade.status === 'PAID_PENDING_RELEASE' && isSeller && (
                                  <>
                                    <button
                                      onClick={() => openReleaseConfirmModal(trade)}
                                      disabled={releasingTokens === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background: releasingTokens === trade.id ? '#d1d5db' : '#10b981',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: releasingTokens === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {releasingTokens === trade.id ? '...' : '🚀 Release'}
                                    </button>
                                    {(trade.payment_screenshot || trade.paymentScreenshot) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const src = trade.payment_screenshot || trade.paymentScreenshot;
                                          const newWindow = window.open();
                                          if (newWindow && src) {
                                            newWindow.document.write(`<html><head><title>Payment Screenshot - Trade #${trade.id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${src}" alt="Payment Screenshot" /></body></html>`);
                                          }
                                        }}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          fontSize: '0.7rem',
                                          fontWeight: '600',
                                          background: '#6366f1',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          width: '100%',
                                        }}
                                      >
                                        📸 View
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openDisputeModal(trade)}
                                      disabled={disputingTrade === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background: disputingTrade === trade.id ? '#d1d5db' : '#f59e0b',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: disputingTrade === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                    </button>
                                  </>
                                )}
                                {trade.status === 'PAID_PENDING_RELEASE' && isBuyer && (
                                  <button
                                    type="button"
                                    onClick={() => openDisputeModal(trade)}
                                    disabled={
                                      disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                    }
                                    style={{
                                      padding: '0.375rem 0.75rem',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      background:
                                        disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                          ? '#d1d5db'
                                          : '#f59e0b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor:
                                        disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                          ? 'not-allowed'
                                          : 'pointer',
                                      width: '100%',
                                    }}
                                  >
                                    {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                  </button>
                                )}
                                {trade.status === 'COMPLETED' && (
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600' }}>
                                    ✅ {isBuyer ? 'Received' : 'Sent'}{' '}
                                    {isBuyer && feeAmount > 0
                                      ? `${amountReceived.toFixed(4)} FDA`
                                      : `${parseFloat(trade.amount).toFixed(4)} FDA`}
                                  </span>
                                )}
                                {trade.status === 'DISPUTED' && (
                                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '600' }}>⚠️ Disputed</span>
                                )}
                                {trade.status === 'CANCELLED' && (
                                  <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600' }}>❌ Cancelled</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
                <SitePagination
                  id="p2p-my-trades-pagination"
                  currentPage={myTradesPage}
                  totalPages={totalMyTradesPages}
                  onPageChange={setMyTradesPage}
                />
              </>
            ) : (
              <div className="empty-state">
                <p className="empty-state-icon" >💼</p>
                <p className="empty-state-title" style={{ color: "#b09b9b" }}>No trades yet</p>
                <p className="empty-state-description" style={{ color: "#b09b9b" }}>Accept an offer above to start trading</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
};
