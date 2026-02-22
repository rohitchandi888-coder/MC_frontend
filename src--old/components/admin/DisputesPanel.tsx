import React, { useState } from 'react';
import { type AuthState } from '../types';
import { getApiUrl } from '../../config';

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

  const openResolveModal = (dispute: any) => {
    setSelectedDispute(dispute);
    setResolutionStatus('RESOLVED');
    setResolutionNote('');
    setTradeAction('none');
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

      <div className="offer-form-card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="offer-form-title">
            Active Disputes
          </h3>
          <button 
            className="btn btn-yellow text-sm py-2 px-4 flex items-center gap-2"
            onClick={loadAdminData}
          >
            🔄 Refresh
          </button>
        </div>

        {adminDisputes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {adminDisputes.map((d) => (
              <div 
                key={d.id} 
                className="card-dark"
                style={{
                  width: '33%',
                  minWidth: '300px',
                  border: '2px solid #f59e0b',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.875rem',
                }}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-gray-900" style={{ padding: 0 }}>
                        Trade #{d.trade_id}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-yellow-200 text-yellow-800">
                        #{d.id}
                      </span>
                      {d.status && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-200 text-blue-800">
                          {d.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600" style={{ padding: 0 }}>
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mb-1.5">
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5" style={{ padding: 0 }}>Trade: {d.amount} {d.asset_symbol} @ {d.price} {d.fiat_currency}</p>
                    <p className="text-xs text-gray-800" style={{ padding: 0 }}>
                      <strong>Total:</strong> {(parseFloat(d.amount || 0) * parseFloat(d.price || 0)).toFixed(2)} {d.fiat_currency}
                    </p>
                    <p className="text-xs text-gray-800 mt-0.5" style={{ padding: 0 }}>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        d.trade_status === 'DISPUTED' ? 'bg-yellow-200 text-yellow-800' :
                        d.trade_status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                        d.trade_status === 'CANCELLED' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {d.trade_status}
                      </span>
                    </p>
                  </div>

                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5" style={{ padding: 0 }}>Parties</p>
                    <p className="text-xs text-gray-800 mb-0.5" style={{ padding: 0 }}>
                      <strong>Raised:</strong> {d.raised_by_name || d.raised_by_email || d.raised_by_phone || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-800" style={{ padding: 0 }}>
                      <strong>Buyer/Seller:</strong> {d.buyer_name || d.buyer_email || d.buyer_phone || 'Unknown'} / {d.seller_name || d.seller_email || d.seller_phone || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 p-1.5 bg-white rounded border-2 border-yellow-400">
                  <p className="text-xs font-bold text-gray-900 mb-0.5" style={{ padding: 0 }}>
                    ⚠️ Reason:
                  </p>
                  <p className="text-xs text-gray-800 whitespace-pre-wrap bg-gray-50 p-1 rounded line-clamp-3" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    maxHeight: '3.6rem',
                    padding: '0.25rem'
                  }}>
                    {d.reason || 'No reason provided'}
                  </p>
                </div>

                {/* Payment Screenshot - Admin View */}
                {d.payment_screenshot && (
                  <div className="mt-1.5 p-1 bg-white rounded border border-blue-300">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5" style={{ padding: 0 }}>
                      📸 Screenshot:
                    </p>
                    <img
                      src={d.payment_screenshot}
                      alt="Payment Screenshot"
                      className="w-full max-h-20 object-contain rounded border border-gray-300 cursor-pointer"
                      onClick={() => {
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(`<html><head><title>Payment Screenshot - Trade #${d.trade_id}</title><style>body { margin: 0; padding: 20px; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }</style></head><body><img src="${d.payment_screenshot}" alt="Payment Screenshot" /></body></html>`);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Resolution Info */}
                {d.status !== 'OPEN' && d.resolution_note && (
                  <div className="mt-1.5 p-1.5 bg-blue-50 rounded border border-blue-300">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5" style={{ padding: 0 }}>
                      Resolution ({d.status}):
                    </p>
                    <p className="text-xs text-gray-800 whitespace-pre-wrap line-clamp-2" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      maxHeight: '2.4rem'
                    }}>
                      {d.resolution_note}
                    </p>
                  </div>
                )}

                {/* Resolve Button - Only for OPEN disputes */}
                {d.status === 'OPEN' && (
                  <div className="mt-1.5">
                    <button
                      onClick={() => openResolveModal(d)}
                      className="btn btn-success w-full py-1"
                      style={{ fontWeight: '700', fontSize: '0.8125rem' }}
                    >
                      ✅ Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-gray-50 rounded border border-gray-200 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              No Active Disputes
            </p>
            <p className="text-xs text-gray-600">
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
              <h3 className="modal-title">Resolve Dispute</h3>
            </div>
            <div className="modal-content">
              <p className="modal-text">
                Trade #{selectedDispute.trade_id} - Dispute #{selectedDispute.id}
              </p>
              
              <div className="modal-info-box mb-4">
                <p className="modal-info-text">
                  <strong>Amount:</strong> {selectedDispute.amount} {selectedDispute.asset_symbol}
                </p>
                <p className="modal-info-text">
                  <strong>Total:</strong> {(parseFloat(selectedDispute.amount || 0) * parseFloat(selectedDispute.price || 0)).toFixed(2)} {selectedDispute.fiat_currency}
                </p>
                <p className="modal-info-text">
                  <strong>Dispute Reason:</strong> {selectedDispute.reason}
                </p>
              </div>

              <label className="modal-label">
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

              <label className="modal-label mt-3">
                Trade Action
              </label>
              <select
                className="modal-input"
                value={tradeAction}
                onChange={(e) => setTradeAction(e.target.value as 'release' | 'cancel' | 'none')}
                disabled={resolvingDispute === selectedDispute.id}
              >
                <option value="none">No Action - Keep trade as is</option>
                <option value="release">Release Tokens - Complete trade and release tokens to buyer</option>
                <option value="cancel">Cancel Trade - Cancel trade and return funds</option>
              </select>

              <label className="modal-label mt-3">
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
              <p className="modal-info-text-small mt-1">
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
