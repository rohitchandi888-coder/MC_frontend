import React, { useState } from 'react';

export type WalletNetwork = 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron';

interface ImportWalletProps {
  importSeed: string;
  importExtraWord: string;
  walletPassword: string;
  importWalletLabel: string;
  selectedNetwork: WalletNetwork;
  isRegistered: boolean; // Whether user is registered with MC Wallet
  onNetworkChange: (network: WalletNetwork) => void;
  onSeedChange: (seed: string) => void;
  onExtraWordChange: (word: string) => void;
  onPasswordChange: (password: string) => void;
  onLabelChange: (label: string) => void;
  onImport: () => void;
}

export const ImportWallet: React.FC<ImportWalletProps> = ({
  importSeed,
  importExtraWord,
  walletPassword,
  importWalletLabel,
  selectedNetwork,
  isRegistered,
  onNetworkChange,
  onSeedChange,
  onExtraWordChange,
  onPasswordChange,
  onLabelChange,
  onImport,
}) => {
  const [showExtraWord, setShowExtraWord] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="layout-2-col wallet-setup-panel">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <p className="text-sm text-slate-600 md:text-slate-300 mb-4" style={{ padding: '0.5rem 0.25rem', lineHeight: '1.6' }}>
          First, choose the network for your wallet, then paste your original 12-word phrase and 13th word to import an existing wallet.
          <span className="block mt-2 text-xs text-amber-700 md:text-yellow-400">
            ⚠️ The 13th word is always required for importing wallets.
          </span>
          {!isRegistered && (
            <span className="block mt-2 text-xs text-slate-500 md:text-slate-400">
              ℹ️ Wallet will be registered automatically with MC Wallet after import.
            </span>
          )}
        </p>
        
        {/* Network Selection */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-slate-800 md:text-slate-200 mb-2 block" style={{ padding: '0.5rem 0.25rem' }}>
            Select Network:
          </label>
          <select
            className="form-input w-full mb-2"
            value={selectedNetwork}
            onChange={(e) => onNetworkChange(e.target.value as WalletNetwork)}
            style={{ padding: '0.75rem', fontSize: '0.95rem' }}
          >
            <option value="BNB Chain">BNB Chain</option>
            <option value="Solana">Solana</option>
            <option value="Bitcoin">Bitcoin</option>
            <option value="Tron">Tron</option>
          </select>
          <p className="text-xs text-slate-500 md:text-slate-400" style={{ padding: '0 0.25rem', marginTop: '0.25rem' }}>
            Selected: <strong className="text-slate-800 md:text-slate-300">{selectedNetwork}</strong>
          </p>
        </div>
        
        <textarea
          rows={3}
          className="form-input w-full mb-2"
          placeholder="word1 word2 ... word12"
          value={importSeed}
          onChange={(e) => onSeedChange(e.target.value)}
        />
        <div className="mb-2">
          <div className="password-input-wrapper">
            <input
              type={showExtraWord ? "text" : "password"}
              className="form-input"
              placeholder="Custom 13th word (required)"
              value={importExtraWord}
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
              placeholder="New wallet password"
              value={walletPassword}
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
          </div> */}
        </div>
        <input
          type="text"
          className="form-input w-full mb-2"
          placeholder="Wallet label (optional, e.g. Trading Wallet)"
          value={importWalletLabel}
          onChange={(e) => onLabelChange(e.target.value)}
        />
        <button className="btn btn-primary" onClick={onImport}>Import wallet</button>
      </div>
      <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 md:border-0 md:bg-transparent md:p-0">
        <p className="text-xs font-semibold text-slate-700 md:text-slate-300 mb-2" style={{ padding: '0.5rem 0.25rem' }}>Before you import</p>
        <ul className="text-xs text-slate-600 md:text-slate-300" style={{ paddingLeft: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', lineHeight: '1.8' }}>
          <li style={{ padding: '0.35rem 0.25rem' }}>Only import into a secure, private device you trust.</li>
          <li style={{ padding: '0.35rem 0.25rem' }}>
            Make sure the 12 words and 13th word exactly match the original spelling and
            order.
          </li>
          <li style={{ padding: '0.35rem 0.25rem' }}>Your new wallet password is local to this browser and can be different.</li>
        </ul>
      </div>
    </div>
  );
};
