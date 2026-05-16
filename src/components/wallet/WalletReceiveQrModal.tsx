import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MM } from '../../theme/metaMaskShell';

interface WalletReceiveQrModalProps {
  open: boolean;
  walletAddress: string | null;
  walletLabel?: string | null;
  onClose: () => void;
}

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

export const WalletReceiveQrModal: React.FC<WalletReceiveQrModalProps> = ({
  open,
  walletAddress,
  walletLabel,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!open || !walletAddress) {
      setQrDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void QRCode.toDataURL(walletAddress, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, walletAddress]);

  if (!open || !walletAddress) return null;

  const copyAddress = () => {
    void navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const suffix = walletAddress.slice(2, 10).toLowerCase();
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `mc-wallet-receive-${suffix}.png`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

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
          maxWidth: 360,
          background: MM.surface,
          borderRadius: MM.radiusLg,
          padding: 20,
          border: `1px solid ${MM.borderLight}`,
          boxShadow: MM.shadowModal,
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: MM.text }}>
          Receive to this wallet
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: MM.textSecondary, lineHeight: 1.45 }}>
          Share this QR so a sender can scan it under Send → Internal FDA (or paste the address).
          The code is your MC wallet address only — not a UPI or payment QR.
        </p>
        {walletLabel ? (
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: MM.text }}>{walletLabel}</p>
        ) : null}
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            color: MM.textSecondary,
            wordBreak: 'break-all',
          }}
        >
          {shortAddr(walletAddress)}
        </p>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Wallet address QR code"
            style={{
              width: 280,
              height: 280,
              borderRadius: 12,
              border: `1px solid ${MM.borderLight}`,
              background: '#fff',
            }}
          />
        ) : error ? (
          <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
        ) : (
          <p style={{ color: MM.textSecondary, fontSize: 13 }}>Generating QR…</p>
        )}
        <button
          type="button"
          onClick={copyAddress}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 12,
            borderRadius: MM.radius,
            border: 'none',
            background: MM.accent,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {copied ? 'Address copied' : 'Copy address'}
        </button>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!qrDataUrl}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 12,
            borderRadius: MM.radius,
            border: `1px solid ${MM.accent}`,
            background: '#fff',
            color: MM.accent,
            fontWeight: 700,
            fontSize: 15,
            cursor: qrDataUrl ? 'pointer' : 'not-allowed',
            opacity: qrDataUrl ? 1 : 0.5,
          }}
        >
          {downloaded ? 'QR saved' : 'Download QR'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 12,
            borderRadius: MM.radius,
            border: `1px solid ${MM.border}`,
            background: MM.pageBg,
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            color: MM.text,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
