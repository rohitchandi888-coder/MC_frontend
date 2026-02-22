import React from 'react';

interface CancelOfferModalProps {
  show: boolean;
  offer: any | null;
  cancellingOffer: number | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelOfferModal: React.FC<CancelOfferModalProps> = ({
  show,
  offer,
  cancellingOffer,
  onClose,
  onConfirm,
}) => {
  if (!show || !offer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-large">⚠️</div>
          <h3 className="modal-title">Cancel Offer?</h3>
        </div>
        <div className="modal-content">
          <p className="modal-text">
            Are you sure you want to cancel this offer?
          </p>
          <div className="modal-info-box">
            <p className="modal-info-text">
              <strong>Type:</strong> {offer.type} {offer.assetSymbol || offer.asset_symbol} / {offer.fiatCurrency || offer.fiat_currency}
            </p>
            <p className="modal-info-text">
              <strong>Price:</strong> {offer.price} {offer.fiatCurrency || offer.fiat_currency} per FDA
            </p>
            <p className="modal-info-text">
              <strong>Remaining:</strong> {offer.remaining || offer.available_amount || 0} FDA
            </p>
            <p className="modal-info-text-small">
              ⚠️ The locked amount ({offer.remaining || offer.available_amount || 0} FDA) will be returned to your balance.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Keep Offer
          </button>
          <button
            className={`modal-button ${cancellingOffer === offer.id ? 'modal-button-secondary' : 'modal-button-danger'}`}
            onClick={onConfirm}
            disabled={cancellingOffer === offer.id}
          >
            {cancellingOffer === offer.id ? 'Cancelling...' : 'Yes, Cancel Offer'}
          </button>
        </div>
      </div>
    </div>
  );
};
