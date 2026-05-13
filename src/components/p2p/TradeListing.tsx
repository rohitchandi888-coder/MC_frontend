import React, { useState, useEffect, useMemo } from 'react';
import { type AuthState } from '../types';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';
import { buyerCanDisputeAfterPaid, getReleaseTimeline } from './p2pTradeTimers';

const MY_TRADES_PER_PAGE = 12;

interface TradeListingProps {
  auth: AuthState | null;
  inMobileShell?: boolean;
  p2pFeeRate: number;
  filteredOffers: any[];
  paginatedOffers: any[];
  totalPages: number;
  offersPage: number;
  setOffersPage: (page: number | ((prev: number) => number)) => void;
  offersSearch: string;
  setOffersSearch: (search: string) => void;
  offersFilterType: 'ALL' | 'BUY' | 'SELL';
  setOffersFilterType: (type: 'ALL' | 'BUY' | 'SELL') => void;
  loadingOffers: boolean;
  loadingMyTrades: boolean;
  acceptingOffer: number | null;
  cancellingOffer: number | null;
  markingAsPaid: number | null;
  cancellingTrade: number | null;
  disputingTrade: number | null;
  releasingTokens: number | null;
  myTrades: any[];
  setSelectedTradeForPayment: (trade: any) => void;
  setPaymentScreenshot: (screenshot: string | null) => void;
  setShowPaymentModal: (show: boolean) => void;
  loadOffers: () => Promise<void>;
  loadMyTrades: () => Promise<void>;
  openAcceptModal: (offer: any) => void;
  /** When false, user already has a non-terminal trade — hide/disable accepting other offers. */
  canAcceptAnotherOffer?: boolean;
  openCancelOfferModal: (offer: any) => void;
  cancelTrade: (tradeId: number) => Promise<void>;
  openDisputeModal: (trade: any) => void;
  openReleaseConfirmModal: (trade: any) => void;
  openTradeChatModal: (trade: any) => void;
}

export const TradeListing: React.FC<TradeListingProps> = ({
  auth,
  inMobileShell = false,
  p2pFeeRate,
  filteredOffers,
  paginatedOffers,
  totalPages,
  offersPage,
  setOffersPage,
  offersSearch,
  setOffersSearch,
  offersFilterType,
  setOffersFilterType,
  loadingOffers,
  loadingMyTrades,
  acceptingOffer,
  cancellingOffer,
  markingAsPaid,
  cancellingTrade,
  disputingTrade,
  releasingTokens,
  myTrades,
  setSelectedTradeForPayment,
  setPaymentScreenshot,
  setShowPaymentModal,
  loadOffers,
  loadMyTrades,
  openAcceptModal,
  canAcceptAnotherOffer = true,
  openCancelOfferModal,
  cancelTrade,
  openDisputeModal,
  openReleaseConfirmModal,
  openTradeChatModal,
}) => {
  const [myTradesSearch, setMyTradesSearch] = useState('');
  const [isCompactMobile, setIsCompactMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );
  useEffect(() => {
    const onResize = () => setIsCompactMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const formatParticipantFdaId = (fdaUserId: unknown, userId: unknown) => {
    if (fdaUserId != null && String(fdaUserId).trim() !== '') return String(fdaUserId).trim();
    if (userId != null && String(userId).trim() !== '') return String(userId);
    return '—';
  };

  const formatTradeDateTime = (value: unknown) => {
    if (value == null || String(value).trim() === '') return '—';
    const d = new Date(value as string | number | Date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  /** Public FDA user id only (e.g. 88474) — never substitute internal DB user id. */
  const formatFdaUserIdPublic = (fdaUserId: unknown) => {
    if (fdaUserId == null) return '—';
    const s = String(fdaUserId).trim();
    return s !== '' ? s : '—';
  };

  /** Maker FDA id from API; if missing but this is your offer, use session (same profile id). */
  const resolveMakerFdaUserIdForOffer = (offer: any): unknown => {
    const fromApi = offer?.maker?.fdaUserId ?? offer?.maker?.fda_user_id;
    if (fromApi != null && String(fromApi).trim() !== '') return fromApi;
    const mid = offer?.maker?.id;
    const uid = auth?.user?.id;
    if (mid != null && uid != null && Number(mid) === Number(uid)) {
      return auth?.user?.fdaUserId ?? null;
    }
    return null;
  };

  /** FDA USER ID of whoever created the offer (maker), not the counterparty row. */
  const formatOfferMakerFdaId = (trade: any) =>
    formatFdaUserIdPublic(trade.offer_maker_fda_user_id);

  const [myTradesPage, setMyTradesPage] = useState(1);


//   useEffect(() => {
//   loadPaymentMethods();
// }, []);

// const loadPaymentMethods = async () => {
//   try {
//     const res = await fetch(getApiUrl('payment-methods'), {
//       headers: {
//         Authorization: `Bearer ${auth?.token}`,
//       },
//     });

//     if (res.ok) {
//       const data = await res.json();
//       console.log('Payment Methods:', data); // ✅ DEBUG
//       setPaymentMethods(data || []);
//     }
//   } catch (err) {
//     console.error('Failed to load payment methods:', err);
//   }
// };

  const filteredMyTrades = useMemo(() => {
    if (!myTradesSearch.trim()) return myTrades;

    const s = myTradesSearch.toLowerCase();

    return myTrades.filter((trade) => {
      const combined = `
      ${trade.id}
      ${trade.asset_symbol}
      ${trade.fiat_currency}
      ${trade.status}
      ${trade.buyer_name || ''}
      ${trade.buyer_email || ''}
      ${trade.buyer_phone || ''}
      ${trade.seller_name || ''}
      ${trade.seller_email || ''}
      ${trade.seller_phone || ''}
      ${trade.buyer_fda_user_id || ''}
      ${trade.seller_fda_user_id || ''}
      ${trade.offer_maker_fda_user_id || ''}
      ${trade.created_at || ''}
    `.toLowerCase();

      return combined.includes(s);
    });
  }, [myTrades, myTradesSearch]);
  // const totalMyTradesPages = Math.max(1, Math.ceil(myTrades.length / MY_TRADES_PER_PAGE));
  const totalMyTradesPages = Math.max(1, Math.ceil(filteredMyTrades.length / MY_TRADES_PER_PAGE));
  const paginatedMyTrades = filteredMyTrades.slice(
    (myTradesPage - 1) * MY_TRADES_PER_PAGE,
    myTradesPage * MY_TRADES_PER_PAGE
  );
  useEffect(() => {
    if (myTradesPage > totalMyTradesPages && totalMyTradesPages > 0) setMyTradesPage(totalMyTradesPages);
  }, [myTrades.length, totalMyTradesPages, myTradesPage]);

  const needsPaidReleaseClock = useMemo(
    () =>
      myTrades.some((t) => String(t.status || '').toUpperCase() === 'PAID_PENDING_RELEASE'),
    [myTrades],
  );
  const [paidReleaseClock, setPaidReleaseClock] = useState(() => Date.now());
  useEffect(() => {
    if (!needsPaidReleaseClock) return;
    setPaidReleaseClock(Date.now());
    const id = window.setInterval(() => setPaidReleaseClock(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [needsPaidReleaseClock]);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title-light" style={{ padding: '0.5rem 1rem' }}>
          {isCompactMobile && inMobileShell ? 'P2P' : '📊 Trade Listing'}
        </h2>
        {!isCompactMobile && (
          <p className="section-subtitle-light" style={{ padding: '0.5rem 1rem' }}>
            Browse all available offers and manage your trades. All trades are MC Wallet to MC Wallet only.
          </p>
        )}
      </div>

      {!auth && (
        <div className="card mb-6">
          <p className="section-subtitle-light" style={{ padding: '0.5rem 1rem' }}>
            Please log in to view and create trades.
          </p>
        </div>
      )}

      {auth && (
        <>
          {/* Available Offers Section */}
          <div className="offer-form-card mb-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <h3 className="offer-form-title">
                Available Offers ({loadingOffers ? '…' : filteredOffers.length})
              </h3>
              <button
                className={`btn btn-yellow text-xs py-2 px-4 flex items-center gap-2 ${loadingOffers ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={loadOffers}
                disabled={loadingOffers}
              >
                🔄 {loadingOffers ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {!canAcceptAnotherOffer && (
              <p
                className="text-sm mb-3"
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                }}
              >
                You can only have <strong>one active trade</strong> at a time. Complete, cancel, or wait for your current
                trade to finish before accepting another offer.
              </p>
            )}

            {/* Search and Filters */}
            <div className="search-filter-container">
              {isCompactMobile && inMobileShell ? (
                <div style={{ width: '100%', display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: 4,
                      borderRadius: 999,
                      border: '1px solid #334155',
                      background: '#0f172a',
                      width: 'fit-content',
                      gap: 4,
                    }}
                  >
                    {(['BUY', 'SELL'] as const).map((t) => {
                      const active = offersFilterType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setOffersFilterType(t);
                            setOffersPage(1);
                          }}
                          style={{
                            borderRadius: 999,
                            border: 'none',
                            minWidth: 66,
                            height: 30,
                            background: active ? '#f8fafc' : 'transparent',
                            color: active ? '#0f172a' : '#cbd5e1',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {t === 'BUY' ? 'Buy' : 'Sell'}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by payment / currency..."
                    value={offersSearch}
                    onChange={(e) => {
                      setOffersSearch(e.target.value);
                      setOffersPage(1);
                    }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
                    }}
                  />
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Search by currency, payment method..."
                    value={offersSearch}
                    onChange={(e) => {
                      setOffersSearch(e.target.value);
                      setOffersPage(1);
                    }}
                  />
                  <select
                    className="filter-select"
                    value={offersFilterType}
                    onChange={(e) => {
                      setOffersFilterType(e.target.value as 'ALL' | 'SELL');
                      setOffersPage(1);
                    }}
                  >
                    <option value="ALL">All Offers</option>
                    <option value="BUY">Buy Offers</option>
                    <option value="SELL">Sell Offers</option>
                  </select>
                </>
              )}
            </div>

            {loadingOffers ? (
              <div
                className="empty-state"
                style={{ background: '#f9fafb', border: '1px dashed #e5e7eb' }}
              >
                <p className="empty-state-icon">⏳</p>
                <p className="empty-state-title" style={{ color: '#6b7280' }}>Loading offers…</p>
                <p className="empty-state-description" style={{ color: '#9ca3af' }}>
                  Fetching the latest OPEN offers from the server.
                </p>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="empty-state" style={{ background: '#f9fafb', border: '1px dashed #e5e7eb' }}>
                <p className="empty-state-icon">📊</p>
                <p className="empty-state-title" style={{ color: '#6b7280' }}>No offers found</p>
                <p className="empty-state-description" style={{ color: '#9ca3af' }}>
                  No OPEN offers match your filters, or none exist yet. Create one under P2P Trading, or check that your
                  backend is reachable.
                </p>
              </div>
            ) : (
              <>
                <div className="offers-grid mb-4">
                  {paginatedOffers.map((offer) => {
                    const isMyOffer = offer.maker?.id === auth?.user.id;
                    const priceNum = Number(offer.price || 0);
                    const remainingNum = Number(offer.remaining || offer.available_amount || 0);
                    const minRaw = Number(offer.minLimit ?? offer.min_limit ?? 0);
                    const maxRaw = Number(offer.maxLimit ?? offer.max_limit ?? 0);
                    /**
                     * Backward compatibility:
                     * - Some rows store min/max in FDA units (legacy): convert to fiat via × price.
                     * - New rows already store min/max in fiat: show as-is.
                     */
                    const minValue = minRaw > 0 && minRaw <= remainingNum ? minRaw * priceNum : minRaw;
                    const maxValue = maxRaw > 0 && maxRaw <= remainingNum ? maxRaw * priceNum : maxRaw;
                    const offerType = (offer.type || offer.offer_type || 'SELL').toUpperCase();
                    const makerFdaDisplay = formatFdaUserIdPublic(resolveMakerFdaUserIdForOffer(offer));

                    return (
                      <div
                        key={offer.id}
                        className={`offer-card-listing ${isMyOffer ? 'offer-card-listing-my' : 'offer-card-listing-other'}`}
                      >
                        <div className="flex-1 flex flex-col">
                          <div className="offer-card-header-listing">
                            <div className="buyAndOffer">
                              <div className='buy'>
                                <span className={offerType === 'SELL' ? 'offer-badge-sell' : 'offer-badge-buy'}>
                                  {offerType}
                                </span>
                                <span className='buyTxt'>
                                  {offer.assetSymbol || offer.asset_symbol} / {offer.fiatCurrency || offer.fiat_currency}
                                </span>
                              </div>

                              {isMyOffer && (
                                <span className="yourOffer">
                                  Your Offer
                                </span>
                              )}
                            </div>
                            <div
                              className={`${isMyOffer ? 'offer-price-box-my' : 'offer-price-box-other'}`}
                            >
                              <div className='perItemParent'>
                                <p className="offer-price-large">
                                  {offer.price} <span className="offer-price-currency">{offer.fiatCurrency || offer.fiat_currency}</span>
                                </p>
                                <p className="perItemBottonCorner">
                                  per {offer.assetSymbol || offer.asset_symbol}
                                </p>
                              </div>
                            </div>
                            <div className="offer-info-list">
                              <div className="offer-info-row">
                                <span className="offer-info-label">FDA USER ID:</span>
                                <span className="offer-info-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {makerFdaDisplay}
                                </span>
                              </div>
                              <div className="offer-info-row">
                                <span className="offer-info-label">Created:</span>
                                <span className="offer-info-value" style={{ fontSize: 12 }}>
                                  {formatTradeDateTime(offer.created_at)}
                                </span>
                              </div>
                              <div className="offer-info-row">
                                <span className="offer-info-label">Available:</span>
                                <span className="offer-info-value">
                                  {offer.remaining || offer.available_amount || 0} {offer.assetSymbol || offer.asset_symbol}
                                </span>
                              </div>
                              {(offer.minLimit || offer.min_limit) ? (
                                <>
                                  <div className="offer-info-row">
                                    <span className="offer-info-label">Min:</span>
                                    <span className="offer-info-value">
                                      {minValue.toFixed(2)} {offer.fiatCurrency || offer.fiat_currency}
                                    </span>
                                  </div>
                                  <div className="offer-info-row">
                                    <span className="offer-info-label">Max:</span>
                                    <span className="offer-info-value">
                                      {maxValue.toFixed(2)} {offer.fiatCurrency || offer.fiat_currency}
                                    </span>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="offer-card-actions-listing">
                            {isMyOffer && (offer.status === 'OPEN' || !offer.status) && (
                              <button
                                className={`btn btn-danger w-full text-sm py-2.5 ${cancellingOffer === offer.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                onClick={() => openCancelOfferModal(offer)}
                                disabled={cancellingOffer === offer.id}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {cancellingOffer === offer.id ? 'Cancelling...' : '❌ Cancel Offer'}
                              </button>
                            )}
                            {!isMyOffer && (offer.status === 'OPEN' || !offer.status) && (
                              <button
                                className={`btn btn-success w-full text-base font-bold py-3 btn-hover-lift ${acceptingOffer === offer.id || !canAcceptAnotherOffer ? 'opacity-60 cursor-not-allowed' : ''}`}
                                onClick={() => openAcceptModal(offer)}
                                disabled={acceptingOffer === offer.id || !canAcceptAnotherOffer}
                                title={
                                  !canAcceptAnotherOffer
                                    ? 'Finish or cancel your current trade before accepting another offer'
                                    : undefined
                                }
                                style={{
                                  whiteSpace: 'nowrap',
                                  minWidth: '120px',
                                  boxShadow: acceptingOffer === offer.id ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)',
                                }}
                              >
                                {acceptingOffer === offer.id
                                  ? 'Accepting...'
                                  : !canAcceptAnotherOffer
                                    ? 'Active trade — wait'
                                    : offerType === 'SELL'
                                      ? 'Buy'
                                      : 'Sell'}
                              </button>
                            )}
                            {offer.status === 'CANCELLED' && (
                              <span className="text-xs text-gray-600 italic p-2">
                                ❌ This offer has been cancelled.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="trade-listing-pagination-wrap">
                  <SitePagination
                    id="offers-pagination"
                    currentPage={offersPage}
                    totalPages={totalPages}
                    onPageChange={setOffersPage}
                  />
                </div>
              </>
            )}
          </div>

          {/* My Trades Section */}
          <div className="offer-form-card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="offer-form-title">My Trades ({myTrades.length})</h3>
              <button
                className={`btn btn-yellow text-xs py-2 px-4 flex items-center gap-2 ${loadingMyTrades ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={loadMyTrades}
                disabled={loadingMyTrades}
              >
                🔄 {loadingMyTrades ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 Search trades..."
              value={myTradesSearch}
              onChange={(e) => {
                setMyTradesSearch(e.target.value);
                setMyTradesPage(1);
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}
            />
            {myTrades.length === 0 ? (
              <p className="text-sm text-gray-600 mb-1" style={{ padding: '0.5rem 1rem' }}>No trades yet.</p>
            ) : (
              <>
                {isCompactMobile ? (
                  <div className="space-y-3">
                    {paginatedMyTrades.map((trade) => {
                      const isBuyer = trade.buyer_id === auth?.user.id;
                      const isSeller = trade.seller_id === auth?.user.id;
                      const chatClosed = ['COMPLETED', 'CANCELLED'].includes(String(trade.status || '').toUpperCase());
                      const feeAmount = parseFloat(trade.fee_amount) || 0;
                      const amountReceived = parseFloat(trade.amount) - feeAmount;
                      const statusUpper = String(trade.status || '').toUpperCase();
                      const releaseTl =
                        statusUpper === 'PAID_PENDING_RELEASE'
                          ? getReleaseTimeline(trade, paidReleaseClock, isSeller ? 'seller' : 'buyer')
                          : null;
                      const statusColor =
                        statusUpper === 'COMPLETED'
                          ? '#059669'
                          : statusUpper === 'CANCELLED'
                            ? '#991b1b'
                            : statusUpper === 'PAID_PENDING_RELEASE'
                              ? '#c2410c'
                              : statusUpper === 'DISPUTED'
                                ? '#b45309'
                                : '#334155';
                      const counterpartyDisplay = isBuyer
                        ? trade.seller_name || trade.seller_email || trade.seller_phone || '—'
                        : trade.buyer_name || trade.buyer_email || trade.buyer_phone || '—';
                      const offerCreatorFdaDisplay = formatOfferMakerFdaId(trade);
                      return (
                        <div key={trade.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong style={{ color: '#111827', fontSize: 14 }}>#{trade.id}</strong>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isBuyer ? '#dbeafe' : '#fee2e2', color: isBuyer ? '#1d4ed8' : '#b91c1c' }}>
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
                            <span style={{ color: '#111827', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}
                            </span>
                            <span style={{ color: '#6b7280' }}>Status</span>
                            <span style={{ color: statusColor, textAlign: 'right', fontWeight: 700, fontSize: 11, letterSpacing: '0.02em' }}>
                              {trade.status}
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
                                Offer creator FDA USER ID {offerCreatorFdaDisplay}
                              </div>
                            </span>
                          </div>
                          {String(trade.status || '').toUpperCase() === 'PAID_PENDING_RELEASE' && releaseTl && (
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
                              <div style={{ fontWeight: 700, color: releaseTl.overdue ? '#b91c1c' : '#0f172a' }}>
                                {releaseTl.headline}
                              </div>
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
                            <button
                              type="button"
                              className="btn w-full text-xs py-2"
                              onClick={() => openTradeChatModal(trade)}
                              style={{ background: chatClosed ? '#94a3b8' : '#2563eb', color: '#fff' }}
                            >
                              {chatClosed ? '💬 Chat Closed' : '💬 Chat'}
                            </button>
                            {isBuyer && (trade.status === 'PENDING' || trade.status === 'PENDING_PAYMENT') && (
                              <>
                                <button
                                  className="btn btn-yellow w-full text-xs py-2"
                                  type="button"
                                  onClick={() => {
                                    setSelectedTradeForPayment(trade);
                                    setPaymentScreenshot(null);
                                    setShowPaymentModal(true);
                                  }}
                                  disabled={markingAsPaid === trade.id}
                                >
                                  {markingAsPaid === trade.id ? '...' : '✅ Pay'}
                                </button>
                                <button
                                  type="button"
                                  className="btn w-full text-xs py-2"
                                  onClick={() => void cancelTrade(trade.id)}
                                  disabled={cancellingTrade === trade.id}
                                  style={{
                                    background: cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                    color: '#fff',
                                  }}
                                >
                                  {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                </button>
                              </>
                            )}
                            {isBuyer && trade.status === 'PAID_PENDING_RELEASE' && (
                              <button
                                type="button"
                                className="btn w-full text-xs py-2"
                                onClick={() => openDisputeModal(trade)}
                                disabled={disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)}
                                style={{
                                  background:
                                    disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)
                                      ? '#d1d5db'
                                      : '#f59e0b',
                                  color: '#fff',
                                }}
                              >
                                {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                              </button>
                            )}
                            {isSeller && trade.status === 'PAID_PENDING_RELEASE' && (
                              <>
                                <button
                                  type="button"
                                  className="btn w-full text-xs py-2"
                                  style={{
                                    background: releasingTokens === trade.id ? '#d1d5db' : '#10b981',
                                    color: '#fff',
                                  }}
                                  onClick={() => openReleaseConfirmModal(trade)}
                                  disabled={releasingTokens === trade.id}
                                >
                                  {releasingTokens === trade.id ? '...' : '🚀 Release'}
                                </button>
                                {(trade.payment_screenshot || trade.paymentScreenshot) && (
                                  <button
                                    type="button"
                                    className="btn w-full text-xs py-2"
                                    style={{ background: '#6366f1', color: '#fff' }}
                                    onClick={() => {
                                      const src = trade.payment_screenshot || trade.paymentScreenshot;
                                      const newWindow = window.open();
                                      if (newWindow && src) {
                                        newWindow.document.write(
                                          `<html><head><title>Payment Screenshot - Trade #${trade.id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${src}" alt="Payment Screenshot" /></body></html>`,
                                        );
                                      }
                                    }}
                                  >
                                    📸 View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn w-full text-xs py-2"
                                  onClick={() => openDisputeModal(trade)}
                                  disabled={disputingTrade === trade.id}
                                  style={{
                                    background: disputingTrade === trade.id ? '#d1d5db' : '#f59e0b',
                                    color: '#fff',
                                  }}
                                >
                                  {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                </button>
                              </>
                            )}
                            {isSeller && trade.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  className="btn w-full text-xs py-2"
                                  onClick={() => void cancelTrade(trade.id)}
                                  disabled={cancellingTrade === trade.id}
                                  style={{
                                    background: cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                    color: '#fff',
                                  }}
                                >
                                  {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                </button>
                                <button
                                  type="button"
                                  className="btn w-full text-xs py-2"
                                  onClick={() => openDisputeModal(trade)}
                                  disabled={disputingTrade === trade.id}
                                  style={{
                                    background: disputingTrade === trade.id ? '#d1d5db' : '#f59e0b',
                                    color: '#fff',
                                  }}
                                >
                                  {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                </button>
                              </>
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
                              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textAlign: 'center' }}>
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
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Created</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMyTrades.map((trade) => {
                        const isBuyer = trade.buyer_id === auth?.user.id;
                        const isSeller = trade.seller_id === auth?.user.id;
                        const statusUpper = String(trade.status || '').toUpperCase();
                        const releaseTlDesktop =
                          statusUpper === 'PAID_PENDING_RELEASE'
                            ? getReleaseTimeline(trade, paidReleaseClock, isSeller ? 'seller' : 'buyer')
                            : null;
                        const chatClosed = ['COMPLETED', 'CANCELLED'].includes(String(trade.status || '').toUpperCase());
                        const feeAmount = parseFloat(trade.fee_amount) || 0;
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
                                {trade.status}
                              </span>
                            </td>

                            {/* Counterparty + offer creator FDA USER ID */}
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {isBuyer ? (trade.seller_name || trade.seller_email || trade.seller_phone || 'Unknown') : (trade.buyer_name || trade.buyer_email || trade.buyer_phone || 'Unknown')}
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.35 }}>
                                Offer creator FDA USER ID{' '}
                                <strong style={{ color: '#334155' }}>{formatOfferMakerFdaId(trade)}</strong>
                              </div>
                              {releaseTlDesktop && (
                                <div
                                  style={{
                                    fontSize: '0.7rem',
                                    color: releaseTlDesktop.overdue ? '#b91c1c' : '#64748b',
                                    marginTop: '0.35rem',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  <strong>{releaseTlDesktop.headline}</strong>
                                  <div style={{ marginTop: 4, fontWeight: 400 }}>{releaseTlDesktop.detail}</div>
                                </div>
                              )}
                            </td>

                            {/* Created (date & time) */}
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {formatTradeDateTime(trade.created_at)}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', minWidth: '120px' }}>
                                <button
                                  onClick={() => openTradeChatModal(trade)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    background: chatClosed ? '#94a3b8' : '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    width: '100%',
                                  }}
                                >
                                  {chatClosed ? '💬 Chat Closed' : '💬 Chat'}
                                </button>
                                {isBuyer && (trade.status === 'PENDING' || trade.status === 'PENDING_PAYMENT') && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedTradeForPayment(trade);
                                        setPaymentScreenshot(null);
                                        setShowPaymentModal(true);
                                      }}
                                      disabled={markingAsPaid === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background: markingAsPaid === trade.id ? '#d1d5db' : '#fbbf24',
                                        color: '#1e293b',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: markingAsPaid === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {markingAsPaid === trade.id ? '...' : '✅ Pay'}
                                    </button>
                                    <button
                                      onClick={() => cancelTrade(trade.id)}
                                      disabled={cancellingTrade === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background: cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: cancellingTrade === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                    </button>
                                  </>
                                )}
                                {isBuyer && trade.status === 'PAID_PENDING_RELEASE' && (
                                  <button
                                    onClick={() => openDisputeModal(trade)}
                                    disabled={disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade)}
                                      style={{
                                      padding: '0.375rem 0.75rem',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      background: disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade) ? '#d1d5db' : '#f59e0b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: disputingTrade === trade.id || !buyerCanDisputeAfterPaid(trade) ? 'not-allowed' : 'pointer',
                                      width: '100%',
                                    }}
                                  >
                                    {disputingTrade === trade.id ? '...' : '⚠️ Dispute'}
                                  </button>
                                )}
                                {isSeller && trade.status === 'PAID_PENDING_RELEASE' && (
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
                                        onClick={() => {
                                          const newWindow = window.open();
                                          if (newWindow) {
                                            newWindow.document.write(`<html><head><title>Payment Screenshot - Trade #${trade.id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${trade.payment_screenshot || trade.paymentScreenshot}" alt="Payment Screenshot" /></body></html>`);
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
                                {isSeller && trade.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => cancelTrade(trade.id)}
                                      disabled={cancellingTrade === trade.id}
                                      style={{
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        background: cancellingTrade === trade.id ? '#d1d5db' : '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: cancellingTrade === trade.id ? 'not-allowed' : 'pointer',
                                        width: '100%',
                                      }}
                                    >
                                      {cancellingTrade === trade.id ? '...' : '❌ Cancel'}
                                    </button>
                                    <button
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
                <div className="trade-listing-pagination-wrap">
                  <SitePagination
                    id="my-trades-pagination"
                    currentPage={myTradesPage}
                    totalPages={totalMyTradesPages}
                    onPageChange={setMyTradesPage}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
