import React from 'react';
import type { WalletMeta } from '../../walletStorage';

interface UnlockWalletProps {
  allWallets: WalletMeta[];
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
  selectedWalletId,
  unlockExtraWord,
  unlockPassword,
  onWalletChange,
  onExtraWordChange,
  onPasswordChange,
  onUnlock,
}) => {
  return (
    <div>
      <p className="text-sm mb-2" style={{ padding: '0.5rem 1rem', lineHeight: '1.6', color: '#374151' }}>
        Unlock the wallet using your 13th word and wallet password. Private keys stay
        only in this browser.
      </p>
      
      {allWallets.length > 0 ? (
        <div className="mb-3">
          <label className="text-sm font-semibold mb-2 block" style={{ padding: '0.5rem 1rem', color: '#374151' }}>
            Select Wallet:
          </label>
          <select
            className="form-input w-full mb-2"
            value={selectedWalletId}
            onChange={(e) => onWalletChange(e.target.value)}
          >
            {allWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.label || `Wallet ${wallet.id.slice(-6)}`} {wallet.network && `(${wallet.network})`} - {wallet.address.slice(0, 10)}...
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs mb-3" style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
          No wallets found. Please create or import a wallet first.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="text"
          className="form-input"
          placeholder="Custom 13th word"
          value={unlockExtraWord}
          onChange={(e) => onExtraWordChange(e.target.value)}
        />
        <input
          type="password"
          className="form-input"
          placeholder="Wallet password"
          value={unlockPassword}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" onClick={onUnlock} disabled={allWallets.length === 0}>
        Unlock wallet
      </button>
    </div>
  );
};
