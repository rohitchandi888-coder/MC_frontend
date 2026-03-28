import React from 'react';

interface AcceptOfferModalProps {
  show: boolean;
  offer: any | null;
  acceptAmount: string;
  setAcceptAmount: (amount: string) => void;
  acceptingOffer: number | null;
  onClose: () => void;
  onAccept: () => void;
}

export const AcceptOfferModal: React.FC<AcceptOfferModalProps> = ({
  show,
  offer,
  acceptAmount,
  setAcceptAmount,
  acceptingOffer,
  onClose,
  onAccept,
}) => {
  if (!show || !offer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          {offer.type === 'SELL' ? '📥 Buy FDA' : '📤 Sell FDA'}
        </h3>
        <div className="modal-content">
          <p className="modal-text">
            Price: <strong>{offer.price} {offer.fiatCurrency || offer.fiat_currency}</strong> per FDA
          </p>
          <p className="modal-text">
            Available: <strong>{offer.remaining || offer.available_amount || 0} FDA</strong>
          </p>
          <p className="modal-text">
            Payment: <strong>{offer.paymentMethods || offer.payment_method || 'Not specified'}</strong>
          </p>
          <label className="modal-label">
            Amount to {offer.type === 'SELL' ? 'buy' : 'sell'} (FDA):
          </label>
          <input
            type="number"
            className="modal-input"
            value={acceptAmount}
            onChange={(e) => setAcceptAmount(e.target.value)}
            placeholder={`Max: ${offer.remaining || offer.available_amount || 0}`}
            max={offer.remaining || offer.available_amount || 0}
          />
          {acceptAmount && Number(acceptAmount) > 0 && (
            <p className="modal-text">
              Total: <strong>{(Number(acceptAmount) * offer.price).toFixed(2)} {offer.fiatCurrency || offer.fiat_currency}</strong>
            </p>
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`modal-button ${(!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === offer.id) ? 'modal-button-secondary' : 'modal-button-success'}`}
            onClick={onAccept}
            disabled={!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === offer.id}
          >
            {acceptingOffer === offer.id ? 'Accepting...' : 'Accept Offer'}
          </button>
        </div>
      </div>
    </div>
  );
};
