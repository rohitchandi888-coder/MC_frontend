import React, { useState, useMemo } from 'react';
import type { WalletMeta } from '../../walletStorage';

interface UnlockWalletProps {
  allWallets: WalletMeta[];
  registeredFdaWallets?: any[];
  selectedWalletId: string;
  unlockExtraWord: string;
  unlockPassword: string;
  onWalletChange: (walletId: string) => void;
  onExtraWordChange: (word: string) => void;
  onPasswordChange: (password: string) => void;
  onUnlock: () => void;
}

export const UnlockWallet: React.FC<UnlockWalletProps> = ({
  allWallets,
  registeredFdaWallets = [],
  selectedWalletId,
  unlockExtraWord,
  unlockPassword,
  onWalletChange,
  onExtraWordChange,
  onPasswordChange,
  onUnlock,
}) => {
  const [showExtraWord, setShowExtraWord] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Combine allWallets and registeredFdaWallets, avoiding duplicates
  const combinedWallets = useMemo(() => {
    const localAddresses = new Set(allWallets.map(w => w.address.toLowerCase()));
    const registeredAsWalletMeta: WalletMeta[] = registeredFdaWallets
      .filter((w: any) => w.address && !localAddresses.has(w.address.toLowerCase()))
      .map((w: any) => ({
        id: w.address || w.id?.toString() || '',
        address: w.address || '',
        label: w.label || `Registered Wallet`,
        network: w.network || 'BNB Chain',
        createdAt: w.created_at || new Date().toISOString(),
      }));
    
    return [...allWallets, ...registeredAsWalletMeta];
  }, [allWallets, registeredFdaWallets]);
  
  return (
    <div>
      <p className="text-sm mb-2" style={{ padding: '0.5rem 1rem', lineHeight: '1.6', color: '#374151' }}>
        Unlock the wallet using your 13th word and wallet password. Private keys stay
        only in this browser.
      </p>
      
      {combinedWallets.length > 0 ? (
        <div className="mb-3">
          <label className="text-sm font-semibold mb-2 block" style={{ padding: '0.5rem 1rem', color: '#374151' }}>
            Select Wallet:
          </label>
          <select
            className="form-input w-full mb-2"
            value={selectedWalletId}
            onChange={(e) => onWalletChange(e.target.value)}
          >
            {combinedWallets.map((wallet) => {
              const isRegistered = registeredFdaWallets.some(
                (w: any) => w.address?.toLowerCase() === wallet.address?.toLowerCase()
              ) && !allWallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase());
              
              return (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label || `Wallet ${wallet.id.slice(-6)}`} {wallet.network && `(${wallet.network})`} - {wallet.address.slice(0, 10)}...
                  {isRegistered && ' [Registered - Import Required]'}
                </option>
              );
            })}
          </select>
          {registeredFdaWallets.length > 0 && allWallets.length === 0 && (
            <p className="text-xs mt-2" style={{ padding: '0 1rem', color: '#f59e0b' }}>
              ⚠️ These wallets are registered but need to be imported first. Go to "Import wallet" to add them.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs mb-3" style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
          No wallets found. Please create or import a wallet first.
        </p>
      )}

      <div className="mb-2">
        <div className="password-input-wrapper">
          <input
            type={showExtraWord ? "text" : "password"}
            className="form-input"
            placeholder="Custom 13th word"
            value={unlockExtraWord}
            onChange={(e) => onExtraWordChange(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowExtraWord(!showExtraWord)}
            title={showExtraWord ? "Hide" : "Show"}
          >
            {showExtraWord ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
         {/* <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            className="form-input"
            placeholder="Wallet password"
            value={unlockPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>  */}
      </div>
      <button className="btn btn-primary" onClick={onUnlock} disabled={combinedWallets.length === 0}>
        Unlock wallet
      </button>
    </div>
  );
};
