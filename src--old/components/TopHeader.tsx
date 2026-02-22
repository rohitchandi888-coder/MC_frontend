import React, { useState } from 'react';
import type { AuthState } from './types';

interface TopHeaderProps {
  auth: AuthState | null;
  internalFdaBalance: number | null;
  storedMeta: { address: string; label?: string } | null;
  onProfileClick: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  auth,
  internalFdaBalance,
  storedMeta,
  onProfileClick,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="top-header-profile-btn"
          onClick={onProfileClick}
        >
          👤 Profile
        </button>
      </div>
      
      <div className="top-header-right">
        {auth && internalFdaBalance !== null && (
          <div className="top-header-balance-item">
            <span className="top-header-balance-label">FDA Balance:</span>
            <span className="top-header-balance-value">{internalFdaBalance.toFixed(2)} FDA</span>
            <button
              className="top-header-copy-btn"
              onClick={() => copyToClipboard(internalFdaBalance.toFixed(2), 'fda')}
              title="Copy FDA balance"
            >
              {copied === 'fda' ? '✓' : '📋'}
            </button>
          </div>
        )}
        
        {storedMeta && (
          <div className="top-header-balance-item">
            <span className="top-header-balance-label">MC Wallet:</span>
            <span className="top-header-balance-value" title={storedMeta.address}>
              {storedMeta.address.slice(0, 6)}...{storedMeta.address.slice(-4)}
            </span>
            <button
              className="top-header-copy-btn"
              onClick={() => copyToClipboard(storedMeta.address, 'wallet')}
              title="Copy wallet address"
            >
              {copied === 'wallet' ? '✓' : '📋'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
