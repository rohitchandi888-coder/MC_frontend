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


  const normalizePaymentMethods = (raw: any): any[] => {
    if (!raw) return [];
    let methods = raw;

    if (typeof methods === 'string') {
      try {
        methods = JSON.parse(methods);
      } catch {
        const value = methods.trim();
        if (!value) return [];
        // Comma-separated fallback like "upi1@ok, QR:12, upi2@ybl"
        const parts = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return parts.map((p) =>
          p.toUpperCase().startsWith('QR:')
            ? { paymentname: p, payment_method: p }
            : { paymentname: 'UPI', upi_id: p }
        );
      }
    }

    if (Array.isArray(methods)) return methods;
    if (typeof methods === 'object') return [methods];
    return [];
  };

  const renderPaymentMethod = (methods: any) => {
    const normalized = normalizePaymentMethods(methods);
    if (normalized.length === 0) return <span style={{ color: '#cbd5e1' }}>Not available</span>;

    return normalized.map((pm: any, index: number) => {

      const isValidQR =
        pm.qr_code &&
        (pm.qr_code.startsWith('data:image') ||
          pm.qr_code.startsWith('http'));

      return (
        <div key={index} style={{ marginBottom: 8 }}>

          <p style={{ fontSize: '13px', fontWeight: '600', color: "#fff" }}>
            {/* {pm.paymentname} */}
            Pay to Seller
          </p>

          {(pm.upi_id || pm.payment_method || pm.paymentname) && (
            <span style={{ fontSize: '12px', display: 'block', color: '#e2e8f0', marginTop: 2 }}>
              {pm.upi_id || pm.payment_method || pm.paymentname}
            </span>
          )}

          {isValidQR && (
            <img
              src={pm.qr_code}
              alt="QR"
              title="Click to view full QR"
              style={{
                width: '100%',
                cursor: 'pointer',
                borderRadius: '6px',
                objectFit: 'contain'
              }}
              onClick={() => {
                const win = window.open();
                if (win) {
                  win.document.write(`
        <html>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;">
            <img src="${pm.qr_code}" style="max-width:90%;max-height:90%;" />
          </body>
        </html>
      `);
                }
              }}
            />
          )}

        </div>
      );
    });
  };
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
          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <p style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: 6 }}>💳 Seller Payment Details:</p>
            {renderPaymentMethod(
              trade.seller_payment_methods ||
              trade.payment_method ||
              trade.paymentMethods
            )}
          </div>
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
