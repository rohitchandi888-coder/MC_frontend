import React, { useState, useEffect, useMemo } from 'react';
import { type AuthState } from '../types';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';

const MY_TRADES_PER_PAGE = 12;

interface TradeListingProps {
  auth: AuthState | null;
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
  openCancelOfferModal: (offer: any) => void;
  cancelTrade: (tradeId: number) => Promise<void>;
  openDisputeModal: (trade: any) => void;
  openReleaseConfirmModal: (trade: any) => void;
}

export const TradeListing: React.FC<TradeListingProps> = ({
  auth,
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
  openCancelOfferModal,
  cancelTrade,
  openDisputeModal,
  openReleaseConfirmModal,
}) => {
  const [myTradesSearch, setMyTradesSearch] = useState('');
  // const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  // Helper function to check if buyer can create dispute (within 2 hours of payment upload)
  const canBuyerCreateDispute = (trade: any) => {
    if (trade.status !== 'PAID_PENDING_RELEASE') return false;
    if (!trade.paid_at) return false;

    const paidAt = new Date(trade.paid_at);
    const now = new Date();

    // Validate date parsing
    if (isNaN(paidAt.getTime())) {
      console.error('Invalid paid_at date:', trade.paid_at);
      return false;
    }

    // Calculate deadline: paid_at + 2 hours
    const deadline = new Date(paidAt.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours in milliseconds

    // Return true if current time is BEFORE or EQUAL to deadline (within 2 hours)
    return now.getTime() <= deadline.getTime();
  };

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

const renderPaymentMethod = (methods: any) => {

  if (!methods) return 'Not specified';

  if (typeof methods === 'string') {
    try {
      methods = JSON.parse(methods);
    } catch {
      return <span>{methods}</span>;
    }
  }

  if (!Array.isArray(methods)) {
    methods = [methods];
  }

  if (!methods.length) return 'Not specified';

  return methods.map((pm: any, index: number) => {
    if (!pm) return null;

    const isValidQR =
      pm.qr_code &&
      (pm.qr_code.startsWith('data:image') ||
       pm.qr_code.startsWith('http'));

    return (
      <div key={index} style={{ marginBottom: '12px' }}>

        <p style={{ fontSize: '12px', fontWeight: '600' }}>
          {pm.paymentname || 'Unknown'}
        </p>

        {pm.upi_id && (
          <span style={{ display: 'block', fontSize: '11px' }}>
            {pm.upi_id}
          </span>
        )}

        {isValidQR && (
          <img
            src={pm.qr_code}
            alt="QR"
            style={{ width: '80px', height: '80px', cursor: 'pointer' }}
          />
        )}
      </div>
    );
  });
};
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
      ${trade.seller_name || ''}
      ${trade.seller_email || ''}
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

  const getHoursRemainingForDispute = (trade: any) => {
    if (!trade.paid_at) return 0;
    const paidAt = new Date(trade.paid_at);
    const now = new Date();

    if (isNaN(paidAt.getTime())) return 0;

    // Calculate deadline: paid_at + 2 hours
    const deadline = new Date(paidAt.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours in milliseconds
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hoursRemaining);
  };


  return (
    <div>
      <div className="section-header">
        <h2 className="section-title-light" style={{ padding: '0.5rem 1rem' }}>📊 Trade Listing</h2>
        <p className="section-subtitle-light" style={{ padding: '0.5rem 1rem' }}>
          Browse all available offers and manage your trades. All trades are MC Wallet to MC Wallet only.
        </p>
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
                Available Offers ({filteredOffers.length})
              </h3>
              <button
                className={`btn btn-yellow text-xs py-2 px-4 flex items-center gap-2 ${loadingOffers ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={loadOffers}
                disabled={loadingOffers}
              >
                🔄 {loadingOffers ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Search and Filters */}
            <div className="search-filter-container">
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
            </div>

            {filteredOffers.length === 0 ? (
              <div className="empty-state" style={{ background: '#f9fafb', border: '1px dashed #e5e7eb' }}>
                <p className="empty-state-icon">📊</p>
                <p className="empty-state-title" style={{ color: '#6b7280' }}>No offers found</p>
                <p className="empty-state-description" style={{ color: '#9ca3af' }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="offers-grid mb-4">
                  {paginatedOffers.map((offer) => {
                    const isMyOffer = offer.maker?.id === auth?.user.id;
                    const minValue = (offer.minLimit || offer.min_limit || 0) * (offer.price || 0);
                    const maxValue = (offer.maxLimit || offer.max_limit || 0) * (offer.price || 0);

                    return (
                      <div
                        key={offer.id}
                        className={`offer-card-listing ${isMyOffer ? 'offer-card-listing-my' : 'offer-card-listing-other'}`}
                      >
                        <div className="flex-1 flex flex-col">
                          <div className="offer-card-header-listing">
                            <div className="buyAndOffer">
                              {(() => {
                                const offerType = (offer.type || offer.offer_type || 'SELL').toUpperCase();
                                // Debug log for first offer
                                if (offer.id === filteredOffers[0]?.id) {
                                  console.log('[TradeListing] Offer type debug:', {
                                    id: offer.id,
                                    rawType: offer.type,
                                    offer_type: offer.offer_type,
                                    normalized: offerType,
                                    fullOffer: offer
                                  });
                                }
                                return (
                                  <div className='buy'>
                                    <span className={offerType === 'SELL' ? 'offer-badge-sell' : 'offer-badge-buy'}>
                                      {offerType}
                                    </span>
                                    <span className='buyTxt'>
                                      {offer.assetSymbol || offer.asset_symbol} / {offer.fiatCurrency || offer.fiat_currency}
                                    </span>
                                  </div>
                                );
                              })()}

                              {isMyOffer && (
                                <span className="yourOffer">
                                  Your Offer
                                </span>
                              )}
                            </div>
                            <div className={`${isMyOffer ? 'offer-price-box-my' : 'offer-price-box-other'}`}>
                              <div className='perItemParent'>
                                <p className="offer-price-large">
                                  {offer.price} <span className="offer-price-currency">{offer.fiatCurrency || offer.fiat_currency}</span>
                                </p>
                                <p className="perItemBottonCorner">per {offer.assetSymbol || offer.asset_symbol}</p>
                              </div>
                            </div>
                            <div className="offer-info-list">
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
                              <div className="offer-info-row offer-info-divider">
                                <span className="offer-info-label">Payment:</span>
                                <span className="offer-info-value">
                                  {/* {offer.paymentMethods || offer.payment_method || 'Not specified'} */}
{                                  renderPaymentMethod(
  offer.paymentMethods ||
  offer.payment_method ||
  offer.seller_payment_methods
)}
                                </span>
                              </div>
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
                                className={`btn btn-success w-full text-base font-bold py-3 btn-hover-lift ${acceptingOffer === offer.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                onClick={() => openAcceptModal(offer)}
                                disabled={acceptingOffer === offer.id}
                                style={{
                                  whiteSpace: 'nowrap',
                                  minWidth: '120px',
                                  boxShadow: acceptingOffer === offer.id ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)'
                                }}
                              >
                                {acceptingOffer === offer.id ? 'Accepting...' : (offer.type || offer.offer_type || 'SELL').toUpperCase() === 'SELL' ? '📥 Buy Now' : '📤 Sell Now'}
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
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMyTrades.map((trade) => {
                        const isBuyer = trade.buyer_id === auth?.user.id;
                        const isSeller = trade.seller_id === auth?.user.id;
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

                            {/* Counterparty */}
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {isBuyer ? (trade.seller_name || trade.seller_email || trade.seller_phone || 'Unknown') : (trade.buyer_name || trade.buyer_email || trade.buyer_phone || 'Unknown')}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                              {trade.created_at ? new Date(trade.created_at).toLocaleDateString() : '-'}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', minWidth: '120px' }}>
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
                                    disabled={disputingTrade === trade.id || !canBuyerCreateDispute(trade)}
                                    style={{
                                      padding: '0.375rem 0.75rem',
                                      fontSize: '0.7rem',
                                      fontWeight: '600',
                                      background: disputingTrade === trade.id || !canBuyerCreateDispute(trade) ? '#d1d5db' : '#f59e0b',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: disputingTrade === trade.id || !canBuyerCreateDispute(trade) ? 'not-allowed' : 'pointer',
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
