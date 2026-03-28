import React, { useState, useEffect, useMemo } from 'react';
import { type AuthState } from '../types';
import { getApiUrl } from '../../config';
import { SitePagination } from '../common/SitePagination';

interface DisputesPanelProps {
  auth: AuthState | null;
  adminDisputes: any[];
  loadAdminData: () => Promise<void>;
}

export const DisputesPanel: React.FC<DisputesPanelProps> = ({
  auth,
  adminDisputes,
  loadAdminData,
}) => {
  const [resolvingDispute, setResolvingDispute] = useState<number | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'REJECTED' | 'CLOSED'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [tradeAction, setTradeAction] = useState<'release' | 'cancel' | 'none'>('none');
  const [disputeSearch, setDisputeSearch] = useState('');

  const filteredDisputes = useMemo(() => {
    if (!disputeSearch.trim()) return adminDisputes;

    const s = disputeSearch.toLowerCase();

    return adminDisputes.filter((d) => {
      const combined = `
      ${d.id}
      ${d.trade_id}
      ${d.amount}
      ${d.asset_symbol}
      ${d.fiat_currency}
      ${d.status}
      ${d.reason || ''}
      ${d.buyer_name || ''}
      ${d.buyer_email || ''}
      ${d.seller_name || ''}
      ${d.seller_email || ''}
      ${d.raised_by_name || ''}
      ${d.raised_by_email || ''}
    `.toLowerCase();

      return combined.includes(s);
    });
  }, [adminDisputes, disputeSearch]);
  const DISPUTES_PER_PAGE = 12;
  const [disputesPage, setDisputesPage] = useState(1);
  // const totalDisputesPages = Math.max(1, Math.ceil(adminDisputes.length / DISPUTES_PER_PAGE));
  const totalDisputesPages = Math.max(1, Math.ceil(filteredDisputes.length / DISPUTES_PER_PAGE));
  const paginatedDisputes = filteredDisputes.slice(
    (disputesPage - 1) * DISPUTES_PER_PAGE,
    disputesPage * DISPUTES_PER_PAGE
  );
  useEffect(() => {
    if (disputesPage > totalDisputesPages && totalDisputesPages > 0) {
      setDisputesPage(totalDisputesPages);
    }
  }, [adminDisputes.length, totalDisputesPages, disputesPage]);

  const openResolveModal = (dispute: any) => {
    setSelectedDispute(dispute);
    setResolutionStatus('RESOLVED');
    setResolutionNote('');
    setTradeAction('none'); // default to release so FDA is released when resolving in buyer's favor
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setSelectedDispute(null);
    setResolutionNote('');
    setTradeAction('none');
  };

  const resolveDispute = async () => {
    if (!auth || !selectedDispute) return;

    setResolvingDispute(selectedDispute.id);
    try {
      const res = await fetch(getApiUrl(`admin/disputes/${selectedDispute.id}/resolve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          status: resolutionStatus,
          resolution_note: resolutionNote.trim() || null,
          trade_action: tradeAction,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        closeResolveModal();
        await loadAdminData();
        alert(`✅ Dispute ${resolutionStatus.toLowerCase()} successfully!`);
      } else {
        alert(`❌ ${data.error || 'Failed to resolve dispute'}`);
      }
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
      alert('❌ Failed to resolve dispute. Please try again.');
    } finally {
      setResolvingDispute(null);
    }
  };

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
      </div>
    );
  }

  return (
    <>
      <div className="section-header">
        <h2 className="section-title">⚠️ Disputes Management</h2>
        <p className="section-subtitle">
          Review and manage all trade disputes
        </p>
      </div>

      <div className="offer-form-card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="offer-form-title text-base">
            Active Disputes {adminDisputes.length > 0 && <span className="text-gray-500 font-normal">({adminDisputes.length})</span>}
          </h3>
          <button
            className="btn btn-yellow text-sm py-2 px-4 flex items-center gap-2"
            onClick={loadAdminData}
          >
            🔄 Refresh
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Search disputes..."
          value={disputeSearch}
          onChange={(e) => {
            setDisputeSearch(e.target.value);
            setDisputesPage(1);
          }}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}
        />
        {adminDisputes.length > 0 ? (
          <>
            <div className="disputes-grid">
              {paginatedDisputes.map((d) => {
                const statusSlug = (d.status || '').toLowerCase();
                const statusBadgeClass = statusSlug === 'open' ? 'dispute-status-badge--open' : statusSlug === 'resolved' ? 'dispute-status-badge--resolved' : statusSlug === 'rejected' ? 'dispute-status-badge--rejected' : statusSlug === 'closed' ? 'dispute-status-badge--closed' : 'dispute-status-badge--closed';
                return (
                  <div
                    key={d.id}
                    className="dispute-card"
                    data-status={d.status || ''}
                  >
                    {/* Header: Trade #, Dispute #, Status, Date */}
                    <div className="flex justify-between items-start flex-wrap gap-0.5 mb-0.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">Trade #{d.trade_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap" style={{ marginBlock: 10 }}>
                      <span className="text-[10px] text-gray-500">#{d.id}</span>

                      {d.status && (
                        <span className={`dispute-status-badge ${statusBadgeClass}`}>
                          {d.status}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {/* Trade amount & total */}
                    <div className="mb-0.5 p-0.5 rounded bg-gray-50 border border-gray-100">
                      <div className='amountCont' >
                        <span className="amountSpan">
                          Amount
                        </span>
                        <span className='font-semibold amountText'>{d.amount} {d.asset_symbol} @ {d.price} {d.fiat_currency}</span>
                      </div>
                      <span className="totalPrice">
                        Total: {(parseFloat(d.amount || 0) * parseFloat(d.price || 0)).toFixed(2)} {d.fiat_currency}
                      </span>
                      <p className="mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.trade_status === 'DISPUTED' ? 'bg-amber-100 text-amber-800' :
                            d.trade_status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              d.trade_status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-700'
                          }`}>
                          {d.trade_status}
                        </span>
                      </p>
                    </div>

                    {/* Parties */}
                    <div className="mb-0.5 text-[10px]">
                      <p className="font-semibold text-gray-600 mb-0 leading-tight">
                        Raised by: <span className="text-gray-900 font-medium">{d.raised_by_name || d.raised_by_email || d.raised_by_phone || '—'}</span>
                      </p>
                      <p className="text-gray-600 truncate leading-tight" title={`Buyer: ${d.buyer_name || d.buyer_email || '—'} / Seller: ${d.seller_name || d.seller_email || '—'}`}>
                        Buyer / Seller: {d.buyer_name || d.buyer_email || '—'} / {d.seller_name || d.seller_email || '—'}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="mb-0.5 p-0.5 rounded bg-amber-50 border border-amber-200">
                      <p className="text-[10px] font-semibold text-amber-900 mb-0 leading-tight">Reason</p>
                      <p className={`text-[10px] text-gray-700 dispute-reason-clamp leading-tight`} title={d.reason || ''}>
                        {d.reason || 'No reason provided'}
                      </p>
                    </div>

                    {/* Payment Screenshot */}
                    {d.payment_screenshot && (
                      <div className="mb-0.5">
                        <p className="text-[10px] font-semibold text-gray-500 mb-0 leading-tight">Screenshot</p>
                        <img
                          src={d.payment_screenshot}
                          alt="Payment"
                          className="w-full max-h-8 object-contain rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const w = window.open();
                            if (w) w.document.write(`<html><head><title>Payment - Trade #${d.trade_id}</title><style>body{margin:0;padding:20px;background:#f3f4f6;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:90vh;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}</style></head><body><img src="${d.payment_screenshot}" alt="Payment" /></body></html>`);
                          }}
                        />
                      </div>
                    )}

                    {/* Resolution note (when resolved/rejected/closed) */}
                    {d.status !== 'OPEN' && d.resolution_note && (
                      <div className="mb-0.5 p-0.5 rounded bg-blue-50 border border-blue-200">
                        <p className="text-[10px] font-semibold text-blue-900 mb-0 leading-tight">Resolution</p>
                        <p className="text-[10px] text-gray-700 dispute-reason-clamp leading-tight" title={d.resolution_note}>
                          {d.resolution_note}
                        </p>
                      </div>
                    )}

                    {/* Resolve button - OPEN only */}
                    {d.status === 'OPEN' && (
                      <div className="mt-auto pt-0.5">
                        <button
                          type="button"
                          onClick={() => openResolveModal(d)}
                          className="dispute-resolve-btn"
                        >
                          Resolve dispute
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <SitePagination
              id="disputes-pagination"
              currentPage={disputesPage}
              totalPages={totalDisputesPages}
              onPageChange={setDisputesPage}
            />
          </>
        ) : (
          <div className="py-12 px-6 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-base font-semibold text-gray-800 mb-1">
              No active disputes
            </p>
            <p className="text-sm text-gray-600">
              All disputes have been resolved or there are no disputes at this time.
            </p>
          </div>
        )}
      </div>

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="modal-overlay" onClick={closeResolveModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-large">⚖️</div>
              <h3 className="modal-title p2p-subheading">Resolve Dispute</h3>
            </div>
            <div className="modal-content">
              <p className="modal-text p2p-subheading">
                Trade #{selectedDispute.trade_id} - Dispute #{selectedDispute.id}
              </p>

              <div className="modal-info-box mb-4 p2p-subheading">
                <p className="modal-info-text">
                  <strong style={{ color: '#9b9595' }} >Amount:</strong> {selectedDispute.amount} {selectedDispute.asset_symbol}
                </p>
                <p className="modal-info-text">
                  <strong style={{ color: '#9b9595' }} >Total:</strong> {(parseFloat(selectedDispute.amount || 0) * parseFloat(selectedDispute.price || 0)).toFixed(2)} {selectedDispute.fiat_currency}
                </p>
                <p className="modal-info-text">
                  <strong style={{ color: '#9b9595' }}>Dispute Reason:</strong> {selectedDispute.reason}
                </p>
              </div>

              <label className="modal-label p2p-subheading">
                Resolution Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="modal-input"
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as 'RESOLVED' | 'REJECTED' | 'CLOSED')}
                disabled={resolvingDispute === selectedDispute.id}
              >
                <option value="RESOLVED">✅ RESOLVED - Dispute is valid and resolved</option>
                <option value="REJECTED">❌ REJECTED - Dispute is invalid</option>
                <option value="CLOSED">🔒 CLOSED - Dispute closed without action</option>
              </select>

              <label className="modal-label mt-3 p2p-subheading">
                Trade Action
              </label>
              <select
                className="modal-input"
                value={tradeAction}
                onChange={(e) => setTradeAction(e.target.value as 'release' | 'cancel' | 'none')}
                disabled={resolvingDispute === selectedDispute.id}
              >
                {/* <option value="none">No Action - Keep trade as is</option> */}
                <option value='none' hidden>Choose option</option>
                <option value="release" >Release Tokens - Complete trade and release tokens to buyer</option>
                <option value="cancel">Cancel Trade - Cancel trade and return funds</option>
              </select>

              <label className="modal-label mt-3 p2p-subheading">
                Resolution Note
              </label>
              <textarea
                className="modal-input"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter resolution details and notes..."
                rows={4}
                disabled={resolvingDispute === selectedDispute.id}
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <p className="modal-info-text-small mt-1" style={{ color: '#d7ea9a' }}>
                This note will be visible to all parties involved.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="modal-button modal-button-secondary"
                onClick={closeResolveModal}
                disabled={resolvingDispute === selectedDispute.id}
              >
                Cancel
              </button>
              <button
                className={`modal-button ${resolvingDispute === selectedDispute.id ? 'modal-button-secondary' : 'modal-button-success'}`}
                onClick={resolveDispute}
                disabled={resolvingDispute === selectedDispute.id}
                style={{ fontWeight: '700' }}
              >
                {resolvingDispute === selectedDispute.id ? 'Resolving...' : '✅ Resolve Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
