import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseWalletAddressFromQrPayload } from '../../utils/parseWalletQrPayload';
import { MM } from '../../theme/metaMaskShell';

interface QrAddressScannerModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onAddress: (address: string) => void;
}

export const QrAddressScannerModal: React.FC<QrAddressScannerModalProps> = ({
  open,
  title = 'Scan wallet QR',
  subtitle = 'Point your camera at the MC wallet QR code',
  onClose,
  onAddress,
}) => {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* ignore */
    }
    try {
      scanner.clear();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setError(null);
      return;
    }

    let cancelled = false;
    setStarting(true);
    setError(null);

    const start = async () => {
      await stopScanner();
      if (cancelled) return;

      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (decoded) => {
            const address = parseWalletAddressFromQrPayload(decoded);
            if (!address) {
              setError('QR is not a valid wallet address. Try another code.');
              return;
            }
            void stopScanner().then(() => {
              onAddress(address);
              onClose();
            });
          },
          () => {
            /* per-frame decode miss */
          },
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not open camera. Allow camera permission or paste the address.';
        setError(msg);
        setStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, regionId, onAddress, onClose, stopScanner]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: MM.overlay,
        zIndex: MM.zModal + 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: MM.surface,
          borderRadius: MM.radiusLg,
          padding: 16,
          border: `1px solid ${MM.borderLight}`,
          boxShadow: MM.shadowModal,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: MM.text }}>{title}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: MM.textSecondary }}>{subtitle}</p>

        <div
          id={regionId}
          style={{
            width: '100%',
            minHeight: 280,
            borderRadius: MM.radius,
            overflow: 'hidden',
            background: '#0f172a',
          }}
        />

        {starting && (
          <p style={{ marginTop: 10, fontSize: 13, color: MM.textSecondary, textAlign: 'center' }}>
            Starting camera…
          </p>
        )}
        {error && (
          <p style={{ marginTop: 10, fontSize: 13, color: '#dc2626', textAlign: 'center' }} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 14,
            padding: 12,
            borderRadius: MM.radius,
            border: `1px solid ${MM.border}`,
            background: MM.pageBg,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            color: MM.text,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
