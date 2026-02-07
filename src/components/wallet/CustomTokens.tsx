import React from 'react';
import type { CustomToken } from '../../walletStorage';

interface CustomTokensProps {
  customTokens: CustomToken[];
  newTokenAddress: string;
  newTokenSymbol: string;
  newTokenName: string;
  tokenInfoLoading: boolean;
  onAddressChange: (address: string) => void;
  onSymbolChange: (symbol: string) => void;
  onNameChange: (name: string) => void;
  onFetchTokenInfo: (address: string) => void;
  onAddToken: () => void;
  onRemoveToken: (address: string) => void;
  isValidAddress: (address: string) => boolean;
}

export const CustomTokens: React.FC<CustomTokensProps> = ({
  customTokens,
  newTokenAddress,
  newTokenSymbol,
  newTokenName,
  tokenInfoLoading,
  onAddressChange,
  onSymbolChange,
  onNameChange,
  onFetchTokenInfo,
  onAddToken,
  onRemoveToken,
  isValidAddress,
}) => {
  return (
    <div>
      <p className="text-sm text-slate-300 mb-3">
        Import and manage custom ERC-20 tokens. Token balances will be displayed in the wallet overview.
      </p>
      
      <div className="add-token-form">
        <p className="text-xs font-semibold text-slate-300 mb-2">Add Custom Token</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark flex-1 text-xs"
            placeholder="Token contract address (0x...)"
            value={newTokenAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onBlur={() => {
              if (newTokenAddress.trim() && isValidAddress(newTokenAddress.trim()) && !newTokenSymbol.trim() && !tokenInfoLoading) {
                onFetchTokenInfo(newTokenAddress);
              }
            }}
          />
          <button
            className={`btn btn-yellow text-xs py-2 px-3 ${tokenInfoLoading || !newTokenAddress.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={() => onFetchTokenInfo(newTokenAddress)}
            disabled={tokenInfoLoading || !newTokenAddress.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tokenInfoLoading ? 'Loading...' : '🔍 Fetch Info'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token symbol (e.g. USDT)"
            value={newTokenSymbol}
            onChange={(e) => onSymbolChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token name (optional)"
            value={newTokenName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full" onClick={onAddToken}>
          Add Token
        </button>
      </div>

      {customTokens.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">Your Custom Tokens</p>
          <div className="token-list">
            {customTokens.map((token) => (
              <div key={token.address} className="token-item">
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    {token.symbol}
                    {token.name && (
                      <span className="text-xs text-slate-400 ml-2">({token.name})</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 font-mono" style={{ fontSize: '0.7rem' }}>
                    {token.address}
                  </p>
                </div>
                <button
                  className="btn-small btn-small-red"
                  onClick={() => onRemoveToken(token.address)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {customTokens.length === 0 && (
        <p className="text-sm text-slate-400 text-center p-4">
          No custom tokens added yet. Add a token above to get started.
        </p>
      )}
    </div>
  );
};
