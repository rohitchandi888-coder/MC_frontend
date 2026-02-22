import React from 'react';
import type { CustomToken } from '../../walletStorage';

interface CustomTokensProps {
  customTokens: CustomToken[];
  newTokenAddress: string;
  newTokenSymbol: string;
  newTokenName: string;
  tokenInfoLoading: boolean;
  customTokenBalances?: Record<string, string>;
  onAddressChange: (address: string) => void;
  onSymbolChange: (symbol: string) => void;
  onNameChange: (name: string) => void;
  onFetchTokenInfo: (address: string) => void;
  onAddToken: () => void;
  onRemoveToken: (address: string) => void;
  onToggleToken: (address: string) => void;
  isValidAddress: (address: string) => boolean;
}

export const CustomTokens: React.FC<CustomTokensProps> = ({
  customTokens,
  newTokenAddress,
  newTokenSymbol,
  newTokenName,
  tokenInfoLoading,
  customTokenBalances = {},
  onAddressChange,
  onSymbolChange,
  onNameChange,
  onFetchTokenInfo,
  onAddToken,
  onRemoveToken,
  onToggleToken,
  isValidAddress,
}) => {
  return (
    <div>
      <p className="text-sm text-slate-300 mb-3">
        Import and manage custom tokens. Token balances will be displayed in the wallet overview.
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
          <div className="token-list-metamask">
            {customTokens.map((token) => {
              const balance = customTokenBalances[token.address.toLowerCase()];
              const balanceNum = balance ? parseFloat(balance) : 0;
              const hasBalance = balanceNum > 0;
              const isEnabled = token.enabled !== false; // Default to true if not specified
              
              return (
                <div key={token.address} className="token-item-metamask">
                  <div className="token-item-left">
                    <div className="token-icon-placeholder">
                      {token.symbol.charAt(0).toUpperCase()}
                    </div>
                    <div className="token-info">
                      <p className="token-symbol">{token.symbol}</p>
                      {token.name && (
                        <p className="token-name">{token.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="token-item-right">
                    {hasBalance ? (
                      <>
                        <p className="token-balance">${(balanceNum * 0).toFixed(2)}</p>
                        <p className="token-balance-change">0.00%</p>
                        <p className="token-quantity">{balanceNum.toFixed(4)} {token.symbol}</p>
                      </>
                    ) : (
                      <p className="token-no-rate">No conversion rate available</p>
                    )}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontFamily: "sans-serif",
                        marginTop: "0.5rem"
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                        Status
                      </span>

                      <div
                        onClick={() => onToggleToken(token.address)}
                        style={{
                          width: "52px",
                          height: "28px",
                          background: isEnabled 
                            ? "linear-gradient(135deg, #22c55e, #16a34a)" 
                            : "linear-gradient(135deg, #64748b, #475569)",
                          borderRadius: "50px",
                          position: "relative",
                          cursor: "pointer",
                          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.15)",
                          transition: "0.3s ease"
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            background: "#fff",
                            borderRadius: "50%",
                            position: "absolute",
                            top: "2px",
                            right: isEnabled ? "2px" : "26px",
                            left: isEnabled ? "auto" : "2px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                            transition: "0.3s ease"
                          }}
                        ></div>
                      </div>

                      <span style={{ 
                        fontSize: "13px", 
                        fontWeight: "600", 
                        color: isEnabled ? "#16a34a" : "#64748b" 
                      }}>
                        {isEnabled ? "ON" : "OFF"}
                      </span>
                    </div>  
                  </div>
                </div>
              );
            })}
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
