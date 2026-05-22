import React, { useState, useEffect, useMemo } from 'react';
import { type AuthState } from '../types';
import { getApiUrl } from '../../config';
import { SitePagination } from '../common/SitePagination';

interface DisputesPanelProps {
  auth: AuthState | null;
  adminDisputes: any[];
  loadAdminData: () => Promise<void>;
}

function formatPartyPhone(phone: unknown): string {
  if (phone == null) return '—';
  const s = String(phone).trim();
  return s !== '' ? s : '—';
}

function formatPartyFdaId(fdaUserId: unknown): string {
  if (fdaUserId == null) return '—';
  const s = String(fdaUserId).trim();
  return s !== '' ? s : '—';
}

/** Admin API returns snake_case; tolerate camelCase if a proxy ever rewrites keys. */
function pickFdaId(
  row: Record<string, unknown>,
  snake: string,
  camel: string,
): string | number | null {
  const a = row[snake];
  if (a != null && String(a).trim() !== '') return a as string | number;
  const b = row[camel];
  if (b != null && String(b).trim() !== '') return b as string | number;
  return null;
}

function DisputePartyBlock({
  label,
  name,
  email,
  phone,
  fdaUserId,
  userDbId,
}: {
  label: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  fdaUserId?: string | number | null;
  /** `users.id` for this party — helps match pgAdmin when FDA id is missing on that row. */
  userDbId?: number | null;
}) {
  const headline = [name, email].find((s) => s && String(s).trim()) || '—';
  const fdaLabel = formatPartyFdaId(fdaUserId);
  return (
    <div className="dispute-card__people-row">
      <div className="dispute-card__people-label">{label}</div>
      <div className="dispute-card__people-value">
        <div>{headline}</div>
        <div className="dispute-card__people-sub">
          <div>
            <span className="dispute-card__people-sub-k">Phone</span>
            {formatPartyPhone(phone)}
          </div>
          <div>
            <span className="dispute-card__people-sub-k">FDA user ID</span>
            {fdaLabel}
            {fdaLabel === '—' && userDbId != null && (
              <span className="text-slate-500 font-medium"> · users.id = {userDbId}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

  /** Open disputes whose linked trade is not already completed (no admin action needed). */
  const openDisputesOnly = useMemo(
    () =>
      adminDisputes.filter((d) => {
        const disputeOpen = String(d.status || '').trim().toUpperCase() === 'OPEN';
        const tradeCompleted = String(d.trade_status || '').trim().toUpperCase() === 'COMPLETED';
        return disputeOpen && !tradeCompleted;
      }),
    [adminDisputes],
  );

  const filteredDisputes = useMemo(() => {
    if (!disputeSearch.trim()) return openDisputesOnly;

    const s = disputeSearch.toLowerCase();

    return openDisputesOnly.filter((d) => {
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
      ${d.raised_by_phone || ''}
      ${d.raised_by_fda_user_id || ''}
      ${d.buyer_phone || ''}
      ${d.buyer_fda_user_id || ''}
      ${d.seller_phone || ''}
      ${d.seller_fda_user_id || ''}
    `.toLowerCase();

      return combined.includes(s);
    });
  }, [openDisputesOnly, disputeSearch]);
  const DISPUTES_PER_PAGE = 8;
  const [disputesPage, setDisputesPage] = useState(1);
  const totalDisputesPages = Math.max(1, Math.ceil(filteredDisputes.length / DISPUTES_PER_PAGE));
  const paginatedDisputes = filteredDisputes.slice(
    (disputesPage - 1) * DISPUTES_PER_PAGE,
    disputesPage * DISPUTES_PER_PAGE
  );
  useEffect(() => {
    if (disputesPage > totalDisputesPages && totalDisputesPages > 0) {
      setDisputesPage(totalDisputesPages);
    }
  }, [filteredDisputes.length, totalDisputesPages, disputesPage]);

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
          Open disputes on active trades only. Completed trades are hidden. Resolved disputes stay in the database but are not listed here.
        </p>
      </div>

      <div className="offer-form-card mb-4 disputes-panel-shell">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h3 className="offer-form-title text-base">
            Open queue
            {openDisputesOnly.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 ml-2 px-2 rounded-full bg-amber-100 text-amber-900 text-sm font-bold">
                {openDisputesOnly.length}
              </span>
            )}
          </h3>
          <button
            className="btn btn-yellow text-sm py-2 px-4 flex items-center gap-2"
            onClick={loadAdminData}
          >
            🔄 Refresh
          </button>
        </div>

        <input
          type="search"
          className="disputes-search-input"
          placeholder="Search by trade id, name, email, reason…"
          value={disputeSearch}
          onChange={(e) => {
            setDisputeSearch(e.target.value);
            setDisputesPage(1);
          }}
        />
        {openDisputesOnly.length === 0 ? (
          <div className="py-12 px-6 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-base font-semibold text-gray-800 mb-1">
              No open disputes
            </p>
            <p className="text-sm text-gray-600">
              Nothing needs admin action right now. Disputes on completed trades and resolved disputes are not shown here.
            </p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="py-10 px-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <p className="text-sm font-semibold text-amber-900 mb-1">No matches</p>
            <p className="text-sm text-amber-800 mb-3">Try a different search term.</p>
            <button type="button" className="btn btn-yellow text-sm py-2 px-4" onClick={() => setDisputeSearch('')}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="disputes-grid">
              {paginatedDisputes.map((d) => {
                const statusSlug = (d.status || '').toLowerCase();
                const statusBadgeClass =
                  statusSlug === 'open'
                    ? 'dispute-status-badge--open'
                    : statusSlug === 'resolved'
                      ? 'dispute-status-badge--resolved'
                      : statusSlug === 'rejected'
                        ? 'dispute-status-badge--rejected'
                        : statusSlug === 'closed'
                          ? 'dispute-status-badge--closed'
                          : 'dispute-status-badge--closed';
                const ts = String(d.trade_status || '').toUpperCase();
                const tradeStatusClass =
                  ts === 'DISPUTED'
                    ? 'dispute-card__trade-status--disputed'
                    : ts === 'COMPLETED'
                      ? 'dispute-card__trade-status--completed'
                      : ts === 'CANCELLED'
                        ? 'dispute-card__trade-status--cancelled'
                        : 'dispute-card__trade-status--other';
                return (
                  <div
                    key={d.id}
                    className="dispute-card"
                    data-status={d.status || ''}
                  >
                    <div className="dispute-card__head">
                      <div className="dispute-card__head-left">
                        <div className="dispute-card__head-trade">Trade #{d.trade_id}</div>
                        <div className="dispute-card__head-meta">Dispute #{d.id}</div>
                        {d.created_at && (
                          <div className="dispute-card__head-date">
                            {new Date(d.created_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        )}
                      </div>
                      {d.status && (
                        <span className={`dispute-status-badge ${statusBadgeClass}`} style={{ flexShrink: 0 }}>
                          {d.status}
                        </span>
                      )}
                    </div>

                    <div className="dispute-card__finance">
                      <div className="dispute-card__finance-row">
                        <span>Size &amp; rate</span>
                        <span className="dispute-card__finance-value">
                          {parseFloat(String(d.amount || 0)).toFixed(4)} {d.asset_symbol} @{' '}
                          {parseFloat(String(d.price || 0)).toFixed(2)} {d.fiat_currency}
                        </span>
                      </div>
                      <div className="dispute-card__finance-row">
                        <span>Order total</span>
                        <span className="dispute-card__finance-total">
                          {(parseFloat(String(d.amount || 0)) * parseFloat(String(d.price || 0))).toFixed(2)}{' '}
                          {d.fiat_currency}
                        </span>
                      </div>
                      <div className="dispute-card__finance-row" style={{ alignItems: 'center' }}>
                        <span>Linked trade status</span>
                        <span className={`dispute-card__trade-status ${tradeStatusClass}`}>{d.trade_status || '—'}</span>
                      </div>
                    </div>

                    <div className="dispute-card__people">
                      <DisputePartyBlock
                        label="Raised by"
                        name={d.raised_by_name}
                        email={d.raised_by_email}
                        phone={d.raised_by_phone}
                        fdaUserId={pickFdaId(d, 'raised_by_fda_user_id', 'raisedByFdaUserId')}
                        userDbId={typeof d.raised_by_id === 'number' ? d.raised_by_id : Number(d.raised_by_id) || null}
                      />
                      <DisputePartyBlock
                        label="Buyer"
                        name={d.buyer_name}
                        email={d.buyer_email}
                        phone={d.buyer_phone}
                        fdaUserId={pickFdaId(d, 'buyer_fda_user_id', 'buyerFdaUserId')}
                        userDbId={typeof d.buyer_id === 'number' ? d.buyer_id : Number(d.buyer_id) || null}
                      />
                      <DisputePartyBlock
                        label="Seller"
                        name={d.seller_name}
                        email={d.seller_email}
                        phone={d.seller_phone}
                        fdaUserId={pickFdaId(d, 'seller_fda_user_id', 'sellerFdaUserId')}
                        userDbId={typeof d.seller_id === 'number' ? d.seller_id : Number(d.seller_id) || null}
                      />
                    </div>

                    <div className="dispute-card__reason">
                      <div className="dispute-card__reason-title">Dispute reason</div>
                      <div className="dispute-card__reason-text dispute-reason-clamp" title={d.reason || ''}>
                        {d.reason || 'No reason provided'}
                      </div>
                    </div>

                    {d.payment_screenshot && (
                      <div className="dispute-card__screenshot">
                        <div className="dispute-card__screenshot-label">Payment proof</div>
                        <img
                          src={d.payment_screenshot}
                          alt="Payment proof"
                          className="dispute-card__screenshot-thumb"
                          onClick={() => {
                            const w = window.open();
                            if (w)
                              w.document.write(
                                `<html><head><title>Payment - Trade #${d.trade_id}</title><style>body{margin:0;padding:20px;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:92vh;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5)}</style></head><body><img src="${d.payment_screenshot}" alt="Payment" /></body></html>`,
                              );
                          }}
                        />
                        <div className="dispute-card__screenshot-hint">Tap image to open full size</div>
                      </div>
                    )}

                    <div className="mt-auto pt-0.5">
                      <button type="button" onClick={() => openResolveModal(d)} className="dispute-resolve-btn">
                        Resolve dispute
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalDisputesPages > 1 ? (
              <SitePagination
                id="disputes-pagination"
                currentPage={disputesPage}
                totalPages={totalDisputesPages}
                onPageChange={setDisputesPage}
              />
            ) : (
              <p className="text-center text-sm text-gray-500 mt-3 mb-1">
                Showing {filteredDisputes.length} open dispute{filteredDisputes.length === 1 ? '' : 's'}
              </p>
            )}
          </>
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
                <p className="modal-info-text mt-2" style={{ fontSize: '0.8rem' }}>
                  <strong style={{ color: '#9b9595' }}>Raised by</strong> —{' '}
                  {selectedDispute.raised_by_name || selectedDispute.raised_by_email || '—'} · Phone:{' '}
                  {formatPartyPhone(selectedDispute.raised_by_phone)} · FDA ID:{' '}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'raised_by_fda_user_id', 'raisedByFdaUserId'))}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'raised_by_fda_user_id', 'raisedByFdaUserId')) === '—' &&
                    selectedDispute.raised_by_id != null &&
                    ` · users.id=${selectedDispute.raised_by_id}`}
                </p>
                <p className="modal-info-text" style={{ fontSize: '0.8rem' }}>
                  <strong style={{ color: '#9b9595' }}>Buyer</strong> —{' '}
                  {selectedDispute.buyer_name || selectedDispute.buyer_email || '—'} · Phone:{' '}
                  {formatPartyPhone(selectedDispute.buyer_phone)} · FDA ID:{' '}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'buyer_fda_user_id', 'buyerFdaUserId'))}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'buyer_fda_user_id', 'buyerFdaUserId')) === '—' &&
                    selectedDispute.buyer_id != null &&
                    ` · users.id=${selectedDispute.buyer_id}`}
                </p>
                <p className="modal-info-text" style={{ fontSize: '0.8rem' }}>
                  <strong style={{ color: '#9b9595' }}>Seller</strong> —{' '}
                  {selectedDispute.seller_name || selectedDispute.seller_email || '—'} · Phone:{' '}
                  {formatPartyPhone(selectedDispute.seller_phone)} · FDA ID:{' '}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'seller_fda_user_id', 'sellerFdaUserId'))}
                  {formatPartyFdaId(pickFdaId(selectedDispute, 'seller_fda_user_id', 'sellerFdaUserId')) === '—' &&
                    selectedDispute.seller_id != null &&
                    ` · users.id=${selectedDispute.seller_id}`}
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
