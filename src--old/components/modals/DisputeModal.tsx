import React, { useState } from 'react';

interface DisputeModalProps {
  show: boolean;
  trade: any | null;
  disputingTrade: number | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  show,
  trade,
  disputingTrade,
  onClose,
  onConfirm,
}) => {
  const [disputeReason, setDisputeReason] = useState('');

  if (!show || !trade) return null;

  const handleConfirm = () => {
    if (!disputeReason.trim()) {
      return;
    }
    onConfirm(disputeReason.trim());
    setDisputeReason('');
  };

  const handleClose = () => {
    setDisputeReason('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-large">⚠️</div>
          <h3 className="modal-title">Create Dispute</h3>
        </div>
        <div className="modal-content">
          <p className="modal-text">
            Please enter the reason for disputing this trade:
          </p>
          <div className="modal-info-box" style={{ marginBottom: '1rem' }}>
            <p className="modal-info-text">
              <strong>Trade ID:</strong> #{trade.id}
            </p>
            <p className="modal-info-text">
              <strong>Amount:</strong> {trade.amount} {trade.asset_symbol}
            </p>
            <p className="modal-info-text">
              <strong>Total:</strong> {(parseFloat(trade.amount) * parseFloat(trade.price)).toFixed(2)} {trade.fiat_currency}
            </p>
          </div>
          <label className="modal-label">
            Dispute Reason <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            className="modal-input"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the issue with this trade..."
            rows={4}
            style={{ 
              minHeight: '100px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            disabled={disputingTrade === trade.id}
          />
          <p className="modal-info-text-small" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
            An admin will review your dispute and take appropriate action.
          </p>
        </div>
        <div className="modal-actions">
          <button 
            className="modal-button modal-button-secondary" 
            onClick={handleClose}
            disabled={disputingTrade === trade.id}
          >
            Cancel
          </button>
          <button
            className={`modal-button ${!disputeReason.trim() || disputingTrade === trade.id ? 'modal-button-secondary' : 'modal-button-warning'}`}
            onClick={handleConfirm}
            disabled={!disputeReason.trim() || disputingTrade === trade.id}
            style={{ 
              background: !disputeReason.trim() || disputingTrade === trade.id
                ? '#d1d5db' 
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              fontWeight: '700'
            }}
          >
            {disputingTrade === trade.id ? 'Creating...' : 'Submit Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
};
