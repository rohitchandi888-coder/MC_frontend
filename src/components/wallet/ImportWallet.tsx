import React from 'react';

export type WalletNetwork = 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron';

interface ImportWalletProps {
  importSeed: string;
  importExtraWord: string;
  walletPassword: string;
  importWalletLabel: string;
  selectedNetwork: WalletNetwork;
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
  onNetworkChange,
  onSeedChange,
  onExtraWordChange,
  onPasswordChange,
  onLabelChange,
  onImport,
}) => {
  return (
    <div className="layout-2-col">
      <div>
        <p className="text-sm text-slate-300 mb-4" style={{ padding: '0.5rem 1rem', lineHeight: '1.6' }}>
          First, choose the network for your wallet, then paste your original 12-word phrase and 13th word to import an existing wallet.
        </p>
        
        {/* Network Selection */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-slate-200 mb-2 block" style={{ padding: '0.5rem 1rem' }}>
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
          <p className="text-xs text-slate-400" style={{ padding: '0 1rem', marginTop: '0.25rem' }}>
            Selected: <strong className="text-slate-300">{selectedNetwork}</strong>
          </p>
        </div>
        
        <textarea
          rows={3}
          className="form-input w-full mb-2"
          placeholder="word1 word2 ... word12"
          value={importSeed}
          onChange={(e) => onSeedChange(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            className="form-input"
            placeholder="Custom 13th word"
            value={importExtraWord}
            onChange={(e) => onExtraWordChange(e.target.value)}
          />
          <input
            type="password"
            className="form-input"
            placeholder="New wallet password"
            value={walletPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
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
      <div>
        <p className="text-xs text-slate-300 mb-2" style={{ padding: '0.5rem 1rem' }}>Before you import</p>
        <ul className="text-xs text-slate-300" style={{ paddingLeft: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', lineHeight: '1.8' }}>
          <li style={{ padding: '0.5rem 1rem' }}>Only import into a secure, private device you trust.</li>
          <li style={{ padding: '0.5rem 1rem' }}>
            Make sure the 12 words and 13th word exactly match the original spelling and
            order.
          </li>
          <li style={{ padding: '0.5rem 1rem' }}>Your new wallet password is local to this browser and can be different.</li>
        </ul>
      </div>
    </div>
  );
};
