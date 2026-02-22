import React, { useState } from 'react';
import { compressImage } from '../utils/imageCompression';

interface PaymentModalProps {
  show: boolean;
  trade: any | null;
  paymentScreenshot?: string | undefined;
  uploadingScreenshot: boolean;
  markingAsPaid: number | null;
  onClose: () => void;
  onMarkAsPaid: (screenshot: string) => void;
  onError?: (message: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  trade,
  paymentScreenshot: paymentScreenshotProp,
  uploadingScreenshot,
  markingAsPaid,
  onClose,
  onMarkAsPaid,
  onError,
}) => {
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(paymentScreenshotProp ? paymentScreenshotProp : null);
  const [compressing, setCompressing] = useState(false);

  if (!show || !trade) return null;

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        if (onError) {
          onError('❌ Image is too large. Please select an image smaller than 10MB.');
        }
        return;
      }

      try {
        setCompressing(true);
        const compressedBase64 = await compressImage(file);
        // Check compressed size (max 2MB base64 = ~1.5MB actual)
        if (compressedBase64.length > 2 * 1024 * 1024) {
          // Try with lower quality
          const lowerQuality = await compressImage(file, 1000, 1000, 0.5);
          setPaymentScreenshot(lowerQuality);
        } else {
          setPaymentScreenshot(compressedBase64);
        }
      } catch (err) {
        console.error('Failed to compress image:', err);
        if (onError) {
          onError('❌ Failed to process image. Please try a different image.');
        }
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleClose = () => {
    setPaymentScreenshot(null);
    onClose();
  };

  const handleMarkAsPaid = () => {
    if (paymentScreenshot) {
      onMarkAsPaid(paymentScreenshot);
      setPaymentScreenshot(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">📸 Upload Payment Screenshot</h3>
        <div className="modal-content">
          <p className="modal-text">
            Trade #{trade.id}
          </p>
          <p className="modal-text">
            Amount: <strong>{trade.amount} {trade.asset_symbol}</strong>
          </p>
          <p className="modal-text">
            Total: <strong>{(trade.amount * trade.price).toFixed(2)} {trade.fiat_currency}</strong>
          </p>
          <label className="modal-label">
            Payment Screenshot (Max 10MB, will be compressed):
          </label>
          <input
            type="file"
            accept="image/*"
            className={`modal-input ${uploadingScreenshot || compressing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            onChange={handleScreenshotChange}
            disabled={uploadingScreenshot || compressing}
          />
          {(uploadingScreenshot || compressing) && (
            <p className="modal-info-text-small">
              ⏳ {compressing ? 'Compressing image...' : 'Uploading...'}
            </p>
          )}
          {paymentScreenshot && (
            <div className="image-preview-container">
              <img
                src={paymentScreenshot}
                alt="Payment screenshot preview"
                className="image-preview"
              />
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className={`modal-button ${markingAsPaid === trade.id ? 'modal-button-secondary' : 'modal-button-primary'}`}
            onClick={handleMarkAsPaid}
            disabled={markingAsPaid === trade.id || !paymentScreenshot || uploadingScreenshot || compressing}
          >
            {markingAsPaid === trade.id ? 'Uploading...' : '✅ Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
};
