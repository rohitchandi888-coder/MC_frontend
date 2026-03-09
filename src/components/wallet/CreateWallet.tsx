import React, { useState } from 'react';

export type WalletNetwork = 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron';

interface CreateWalletProps {
  mnemonic12: string | null;
  extraWord: string;
  walletLabel: string;
  selectedNetwork: WalletNetwork;
  onNetworkChange: (network: WalletNetwork) => void;
  onGenerateSeed: () => void;
  onExtraWordChange: (word: string) => void;
  onLabelChange: (label: string) => void;
  onSaveWallet: () => void;
}

export const CreateWallet: React.FC<CreateWalletProps> = ({
  mnemonic12,
  extraWord,
  walletLabel,
  selectedNetwork,
  onNetworkChange,
  onGenerateSeed,
  onExtraWordChange,
  onLabelChange,
  onSaveWallet,
}) => {

  const [showExtraWord, setShowExtraWord] = useState(false);

  return (
    <div className="layout-2-col">
      <div>

        <p className="text-sm text-slate-300 mb-4" style={{ padding: '0.5rem 1rem', lineHeight: '1.6' }}>
          First, choose the network for your wallet, then generate a 12-word phrase and add your own 13th word. All 13 are required to recover the wallet.
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

        <button
          onClick={onGenerateSeed}
          className="mb-2"
          style={{ backgroundColor: '#f7a712' }}
        >
          Generate 12-word phrase
        </button>

        {mnemonic12 && (

          <div className="grid grid-cols-2 gap-2 text-xs mb-4">

            {mnemonic12.split(' ').map((w, i) => (

              <div key={i}>
                {i + 1}. {w}
              </div>

            ))}

          </div>

        )}

        {/* 13th word only */}
        <div className="mb-2">

          <div className="password-input-wrapper">

            <input
              type={showExtraWord ? "text" : "password"}
              className="form-input"
              placeholder="Custom 13th word"
              value={extraWord}
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

        </div>

        <input
          type="text"
          className="form-input w-full mb-2"
          placeholder="Wallet label (optional, e.g. Main Wallet)"
          value={walletLabel}
          onChange={(e) => onLabelChange(e.target.value)}
        />

        <button
          className="btn btn-primary"
          onClick={onSaveWallet}
        >
          Save wallet locally (encrypted)
        </button>

      </div>

      <div>

        <p className="text-xs text-slate-300 mb-2" style={{ padding: '0.5rem 1rem' }}>
          Security tips
        </p>

        <ul className="text-xs text-slate-300" style={{
          paddingLeft: '1.25rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          lineHeight: '1.8'
        }}>

          <li style={{ padding: '0.5rem 1rem' }}>
            Write your 12+1 words on paper and store them offline.
          </li>

          <li style={{ padding: '0.5rem 1rem' }}>
            Never share your seed phrase or 13th word with anyone.
          </li>

          <li style={{ padding: '0.5rem 1rem' }}>
            Each browser/device needs its own encrypted backup.
          </li>

          <li style={{ padding: '0.5rem 1rem' }}>
            If you lose any word, the wallet cannot be recovered.
          </li>

        </ul>

      </div>

    </div>
  );

};