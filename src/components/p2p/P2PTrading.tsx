import React, { useState, useEffect } from 'react';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';
import { type AuthState } from '../types';
import { MM } from '../../theme/metaMaskShell';

interface P2PTradingProps {
  /** Light MetaMask-style cards/inputs on mobile (matches app shell). */
  inMobileShell?: boolean;
  auth: AuthState | null;
  /** When false, USDT is hidden and any USDT selection is coerced to INR. */
  canUseUsdt?: boolean;
  internalFdaBalance: number | null;
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
  internalFdaBalance,
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
}) => {
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

  const canBuyerCreateDispute = (trade: any) => {
    if (trade.status !== 'PAID_PENDING_RELEASE') return false;
    if (!trade.paid_at) return false;
    const paidAt = new Date(trade.paid_at);
    if (Number.isNaN(paidAt.getTime())) return false;
    const deadline = new Date(paidAt.getTime() + 2 * 60 * 60 * 1000);
    return Date.now() <= deadline.getTime();
  };

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
          {internalFdaBalance !== null && (
            <div className="balance-display-card">
              <div className="balance-display-header">
                <div>
                  <p className="balance-label">Available FDA Balance</p>
                  <p className="balance-amount">
                    {internalFdaBalance.toFixed(2)} FDA
                  </p>
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
                  Amount (FDA) {offerType === 'SELL' && internalFdaBalance !== null && (
                    <span className="text-slate-200" style={{ fontSize: '0.7rem' }}>
                      (Available: {internalFdaBalance.toFixed(2)})
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
                    {offerType === "SELL" && internalFdaBalance !== null && (
                      <button
                        type="button"
                        className="btn btn-yellow text-sm py-3 w-full"
                        onClick={() =>
                          setOfferAmount(internalFdaBalance.toFixed(2))
                        }
                        style={{
                          boxSizing: "border-box",
                          maxWidth: "100%",
                        }}
                      >
                        Use max ({internalFdaBalance.toFixed(2)} FDA)
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
                    {offerType === "SELL" && internalFdaBalance !== null && (
                      <button
                        type="button"
                        className="btn btn-yellow text-xs py-3 px-4"
                        onClick={() =>
                          setOfferAmount(internalFdaBalance.toFixed(2))
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
                  {offerFiatCurrency === 'INR' ? (
                    <>INR sells use Profile UPI / QR.</>
                  ) : (
                    <>USDT: price above; transfer off-app.</>
                  )}
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
              <p className="text-sm font-semibold text-slate-300">My Trades ({myTrades.length})</p>
              <button
                className="btn btn-secondary text-xs py-2 px-3"
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
                      const statusLabel =
                        trade.status === 'COMPLETED'
                          ? '✅ COMPLETED'
                          : trade.status === 'PAID_PENDING_RELEASE'
                            ? '💰 PAID'
                            : trade.status === 'PENDING' || trade.status === 'PENDING_PAYMENT'
                              ? '⏳ PENDING'
                              : trade.status;
                      return (
                        <div key={trade.id} className="card-dark p-3 rounded-xl border border-slate-700">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-slate-100">#{trade.id}</p>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                              isBuyer ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isBuyer ? 'BUY' : 'SELL'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <span className="text-slate-400">Amount</span>
                            <span className="text-right text-slate-100">{parseFloat(trade.amount).toFixed(4)} {trade.asset_symbol}</span>
                            <span className="text-slate-400">Price</span>
                            <span className="text-right text-slate-100">{parseFloat(trade.price).toFixed(2)} {trade.fiat_currency}</span>
                            <span className="text-slate-400">Total</span>
                            <span className="text-right text-slate-100 font-semibold">{(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}</span>
                            <span className="text-slate-400">Status</span>
                            <span className="text-right text-slate-200">{statusLabel}</span>
                            <span className="text-slate-400">Counterparty</span>
                            <span className="text-right text-slate-200 break-words">{isBuyer ? (trade.seller_name || trade.seller_email || trade.seller_phone || 'Unknown') : (trade.buyer_name || trade.buyer_email || trade.buyer_phone || 'Unknown')}</span>
                            <span className="text-slate-400">Received</span>
                            <span className="text-right text-slate-200">
                              {trade.status === 'COMPLETED' && feeAmount > 0 ? `${amountReceived.toFixed(4)} FDA` : trade.status === 'COMPLETED' ? `${parseFloat(trade.amount).toFixed(4)} FDA` : '-'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2">
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
                                  disputingTrade === trade.id || !canBuyerCreateDispute(trade)
                                }
                                className="btn w-full text-xs py-2"
                                style={{
                                  background:
                                    disputingTrade === trade.id || !canBuyerCreateDispute(trade)
                                      ? '#9ca3af'
                                      : '#f59e0b',
                                  color: '#fff',
                                }}
                              >
                                {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                              </button>
                            )}
                            {trade.status === 'COMPLETED' && (
                              <p className="text-xs text-emerald-400 font-semibold text-center">✅ Done</p>
                            )}
                            {trade.status === 'DISPUTED' && (
                              <p className="text-xs text-amber-400 font-semibold text-center">⚠️ Disputed</p>
                            )}
                            {trade.status === 'CANCELLED' && (
                              <p className="text-xs text-slate-400 font-semibold text-center">❌ Cancelled</p>
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
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Received</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMyTrades.map((trade: any) => {
                        const isBuyer = trade.buyer_id === auth?.user.id;
                        const isSeller = trade.seller_id === auth?.user.id;
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
                            </td>

                            {/* Received */}
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                              {trade.status === 'COMPLETED' && feeAmount > 0 ? (
                                <span>
                                  {amountReceived.toFixed(4)} FDA
                                  <br />
                                  <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                                    (fee: {feeAmount.toFixed(4)})
                                  </span>
                                </span>
                              ) : trade.status === 'COMPLETED' ? (
                                <span>{parseFloat(trade.amount).toFixed(4)} FDA</span>
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
                                      disputingTrade === trade.id || !canBuyerCreateDispute(trade)
                                    }
                                    style={{
                                      padding: '0.375rem 0.75rem',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      background:
                                        disputingTrade === trade.id || !canBuyerCreateDispute(trade)
                                          ? '#d1d5db'
                                          : '#f59e0b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor:
                                        disputingTrade === trade.id || !canBuyerCreateDispute(trade)
                                          ? 'not-allowed'
                                          : 'pointer',
                                      width: '100%',
                                    }}
                                  >
                                    {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                  </button>
                                )}
                                {trade.status === 'COMPLETED' && (
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600' }}>✅ Done</span>
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
