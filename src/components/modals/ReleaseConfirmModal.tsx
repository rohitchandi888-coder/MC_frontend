import React from 'react';

interface ReleaseConfirmModalProps {
  show: boolean;
  trade: any | null;
  releasingTokens: number | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ReleaseConfirmModal: React.FC<ReleaseConfirmModalProps> = ({
  show,
  trade,
  releasingTokens,
  onClose,
  onConfirm,
}) => {
  if (!show || !trade) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-large">⚠️</div>
          <h3 className="modal-title">Confirm Token Release</h3>
        </div>
        <div className="modal-content">
          <p className="modal-text" style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Are you 100% sure payment received?
          </p>
          <div className="modal-info-box" style={{ background: '#fef2f2', border: '2px solid #ef4444', marginBottom: '1rem' }}>
            <p className="modal-info-text" style={{ color: '#991b1b', fontWeight: '600' }}>
              ⚠️ After release, company will not be responsible for any issues.
            </p>
          </div>
          <div className="modal-info-box">
            <p className="modal-info-text">
              <strong>Trade ID:</strong> #{trade.id}
            </p>
            <p className="modal-info-text">
              <strong>Amount:</strong> {trade.amount} {trade.asset_symbol}
            </p>
            <p className="modal-info-text">
              <strong>Total:</strong> {(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}
            </p>
            <p className="modal-info-text">
              <strong>Buyer:</strong> {trade.buyer_name || trade.buyer_email || trade.buyer_phone || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`modal-button ${releasingTokens === trade.id ? 'modal-button-secondary' : 'modal-button-success'}`}
            onClick={onConfirm}
            disabled={releasingTokens === trade.id}
            style={{ 
              background: releasingTokens === trade.id 
                ? '#d1d5db' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              fontWeight: '700'
            }}
          >
            {releasingTokens === trade.id ? 'Releasing...' : 'Yes, Release Tokens'}
          </button>
        </div>
      </div>
    </div>
  );
};
