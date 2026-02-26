import React from 'react';
import { getApiUrl } from '../../config';
import { type AuthState } from '../types';

interface P2PTradingProps {
  auth: AuthState | null;
  internalFdaBalance: number | null;
  internalFdaLocked: number | null;
  p2pFeeRate: number;
  addFdaAmount: string;
  setAddFdaAmount: (amount: string) => void;
  addingFdaBalance: boolean;
  offerType: 'BUY' | 'SELL';
  setOfferType: (type: 'BUY' | 'SELL') => void;
  offerFiatCurrency: string;
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
  upi_id: string;
  qr_code: string | null;
  is_active: boolean;
}

export const P2PTrading: React.FC<P2PTradingProps> = ({
  auth,
  internalFdaBalance,
  internalFdaLocked,
  p2pFeeRate,
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

  // Load payment methods from database
  React.useEffect(() => {
    if (auth) {
      loadPaymentMethods();
    }
  }, [auth]);

  const loadPaymentMethods = async () => {
    if (!auth) return;
    setLoadingPaymentMethods(true);
    try {
      const res = await fetch(getApiUrl('payment-methods'), {
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
    if (offerFiatCurrency === 'INR' && offerPaymentMethods && paymentMethods.length > 0) {
      // Try to match existing payment methods string with database payment methods
      const methods = offerPaymentMethods.split(',').map(m => m.trim());
      const matchedIds: number[] = [];
      paymentMethods.forEach((pm) => {
        if (methods.some(m => m === pm.upi_id || m.includes(pm.upi_id))) {
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
  }, [offerFiatCurrency, paymentMethods]); // Only run when currency or payment methods change

  // Update payment methods string when selected payment methods change
  React.useEffect(() => {
    if (offerFiatCurrency === 'INR') {
      if (selectedPaymentMethodIds.length > 0) {
        const selectedMethods = paymentMethods
          .filter(pm => selectedPaymentMethodIds.includes(pm.id) && pm.is_active)
          .map(pm => pm.upi_id);
        setOfferPaymentMethods(selectedMethods.join(', '));
      } else {
        setOfferPaymentMethods('');
      }
    }
  }, [selectedPaymentMethodIds, offerFiatCurrency, paymentMethods, setOfferPaymentMethods]);

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
    <div>
      <div className="section-header">
        <h2 className="section-title" style={{ padding: '0.5rem 1rem' }}>P2P Trading</h2>
        <p className="section-subtitle" style={{ padding: '0.5rem 1rem' }}>
          Buy and sell tokens with other users using MC Wallet to MC Wallet transfers only. {p2pFeeRate}% trading fee applies.
        </p>
        <div className="p2p-info-box">
          <p className="p2p-info-title">
            ⚠️ Important: P2P Trading is MC Wallet to MC Wallet only (Internal System)
          </p>
          <p className="p2p-info-text">
            • Not connected to BSCScan/Blockchain • {p2pFeeRate}% fee on trades
          </p>
        </div>
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
              <p className="action-card-title" style={{color: 'rgb(249, 250, 251)'}}>Create Offer (MC Wallet to MC Wallet Only)</p>
            </div>
            <div className="p2p-info-box mb-4">
              <p className="p2p-info-text" style={{ lineHeight: '1.4',color:'#fde68a' }}>
                ⚠️ This is MC Wallet internal trading only. {offerType === 'SELL' ? 'For SELL offers, you need tokens in your internal wallet balance.' : 'For BUY offers, you are looking to buy tokens from sellers.'} {p2pFeeRate > 0 ? `${p2pFeeRate}% trading fee applies.` : 'No trading fee applies.'}
              </p>
            </div>
            
            {/* BUY/SELL Dropdown */}
            <div className="mb-4">
              <p className="text-xs text-white mb-2 font-semibold p2p-subheading">Offer Type</p>
              <select
                className="form-select-dark w-full py-3"
                value={offerType}
                onChange={(e) => {
                  const newType = e.target.value as 'BUY' | 'SELL';
                  console.log('[P2PTrading] ========================================');
                  console.log('[P2PTrading] 🎯 DROPDOWN CHANGED 🎯');
                  console.log('[P2PTrading] Old type:', offerType);
                  console.log('[P2PTrading] New type from event:', newType);
                  console.log('[P2PTrading] Event target value:', e.target.value);
                  console.log('[P2PTrading] Calling setOfferType with:', newType);
                  setOfferType(newType);
                  // Verify state was updated after a short delay
                  setTimeout(() => {
                    console.log('[P2PTrading] ⚠️ State should be updated now. Check parent component state.');
                  }, 100);
                  console.log('[P2PTrading] ========================================');
                }}
              >
                <option value="BUY">📥 BUY (Looking to Buy)</option>
                <option value="SELL">📤 SELL (Looking to Sell)</option>
              </select>
              <p className="text-xs text-slate-300 mt-1">
                Current selection: <strong className={offerType === 'BUY' ? 'text-green-400' : 'text-yellow-400'}>{offerType}</strong>
              </p>
            </div>
            
            <div className="mb-4">
              <div>
                <p className="text-xs  mb-2 p2p-subheading">Fiat Currency</p>
                <select
                  className="form-select-dark w-full py-3"
                  value={offerFiatCurrency}
                  onChange={(e) => setOfferFiatCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
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
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    className="form-input-dark form-input-dark-focus flex-1 py-3"
                    placeholder="0.00"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                  />
                  {offerType === 'SELL' && internalFdaBalance !== null && (
                    <button
                      className="btn btn-yellow text-xs py-3 px-4"
                      onClick={() => setOfferAmount(internalFdaBalance.toFixed(2))}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs  mb-2 font-semibold p2p-subheading">Price per FDA</p>
                <input
                  type="number"
                  step="any"
                  className="form-input-dark form-input-dark-focus w-full py-3"
                  placeholder="0.00"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs mb-2 font-semibold p2p-subheading">Min Limit ({offerFiatCurrency})</p>
                <input
                  type="number"
                  step="any"
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
              <div>
                <p className="text-xs  mb-2 font-semibold p2p-subheading">Max Limit ({offerFiatCurrency})</p>
                <input
                  type="number"
                  step="any"
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

            <div className="mb-4">
              <p className="text-xs  mb-2 p2p-subheading">Payment Methods</p>
              {offerFiatCurrency === 'INR' ? (
                <div className="space-y-2">
                  {loadingPaymentMethods ? (
                    <p className="text-xs text-slate-400">Loading payment methods...</p>
                  ) : paymentMethods.filter(pm => pm.is_active).length === 0 ? (
                    <div className="warning-box p-3">
                      <p className="text-xs text-slate-300 mb-2">⚠️ No active payment methods found</p>
                      <p className="text-xs text-slate-400">
                        Please add payment methods in the "Payment Methods" section first.
                      </p>
                    </div>
                  ) : (
                      <>
                      {paymentMethods
                        .filter(pm => pm.is_active)
                        .map((method) => (
                          <label
                            key={method.id}
                            className=" flex items-start gap-3 p-3 rounded cursor-pointer hover:bg-slate-800 transition-colors border border-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPaymentMethodIds.includes(method.id)}
                              onChange={() => handlePaymentMethodToggle(method.id)}
                              className="w-4 h-4 mt-1 text-yellow-500 bg-slate-700 border-slate-600 rounded focus:ring-yellow-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              {/* <span className="text-xs  text-slate-200 block p2p-subheading">{method.upi_id}</span> */}
                              {method.qr_code && (method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http')) && (
                                <img
                                  src={method.qr_code}
                                  alt="QR Code"
                                  className="
                                      w-40 h-40              
                                      sm:w-44 sm:h-44        
                                      md:w-48 md:h-48         
                                      object-contain 
                                      border-2 border-slate-500 
                                      rounded-lg 
                                      mt-2 
                                      shadow-md 
                                      hover:shadow-lg 
                                      transition-shadow
                                      cursor-zoom-in"
                                />
                              )}

                              <span className="text-xs  text-slate-200 block p2p-subheading">{method.upi_id}</span>
                            </div>

                            
                          </label>
                        ))}
                      {selectedPaymentMethodIds.length === 0 && (
                        <p className="text-xs mt-2" style={{ color: '#93b65a' }}>⚠️ Please select at least one payment method</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className="form-input-dark w-full py-3"
                  placeholder="e.g. Bank Transfer, PayPal, Cash"
                  value={offerPaymentMethods}
                  onChange={(e) => setOfferPaymentMethods(e.target.value)}
                />
              )}
            </div>

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
              className={`btn btn-yellow w-full ${
                (creatingOffer || 
                 !offerAmount || 
                 !offerPrice || 
                 (offerFiatCurrency === 'INR' && paymentMethods.filter(pm => pm.is_active).length === 0) ||
                 (offerFiatCurrency === 'INR' && selectedPaymentMethodIds.length === 0)
                ) ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              onClick={createOffer}
              disabled={
                creatingOffer || 
                !offerAmount || 
                !offerPrice || 
                (offerFiatCurrency === 'INR' && paymentMethods.filter(pm => pm.is_active).length === 0) ||
                (offerFiatCurrency === 'INR' && selectedPaymentMethodIds.length === 0)
              }
            >
              {creatingOffer ? 'Creating...' : offerType === 'BUY' ? '📥 Create Buy Offer' : '📤 Create Sell Offer'}
            </button>
          </div>

          {/* My Trades */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold text-slate-300">My Trades</p>
              <button
                className="btn btn-secondary text-xs py-2 px-3"
                onClick={loadMyTrades}
              >
                🔄 Refresh
              </button>
            </div>
            {myTrades.length > 0 ? (
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
                {myTrades.map((trade: any) => {
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
                          {trade.status === 'COMPLETED' ? '✅ COMPLETED' : trade.status === 'PAID_PENDING_RELEASE' ? '💰 PAID' : trade.status === 'PENDING' ? '⏳ PENDING' : trade.status}
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
                          {trade.status === 'PENDING' && isBuyer && (
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
                              {trade.payment_screenshot && (
                                <button
                                  onClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`<html><head><title>Payment Screenshot - Trade #${trade.id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${trade.payment_screenshot}" alt="Payment Screenshot" /></body></html>`);
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
  );
};
