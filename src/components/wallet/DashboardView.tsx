import React, { useState } from 'react';
import type { AuthState } from '../types';
import type { CustomToken, WalletMeta } from '../../walletStorage';

interface DashboardViewProps {
  auth: AuthState | null;
  storedMeta: WalletMeta | null;
  checkAddress: string;
  balanceLoading: boolean;
  nativeBalance: string | null;
  fdaBalance: string | null;
  internalFdaBalance: number | null;
  customTokens: CustomToken[];
  customTokenBalances: Record<string, string>;
  onSetActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  auth,
  storedMeta,
  checkAddress,
  balanceLoading,
  nativeBalance,
  fdaBalance,
  internalFdaBalance,
  customTokens,
  customTokenBalances,
  onSetActiveTab,
}) => {
  const [copied, setCopied] = useState(false);
  const activeAddress = storedMeta?.address || checkAddress;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Action Buttons (Send, Receive, Swap) */}
      {activeAddress && (
        <div className="wallet-action-buttons">
          <button
            className="wallet-action-btn wallet-action-btn-send"
            onClick={() => onSetActiveTab('send')}
            title="Send tokens"
          >
            <span className="wallet-action-icon">📤</span>
            <span className="wallet-action-label">Send</span>
          </button>
          <button
            className="wallet-action-btn wallet-action-btn-receive"
            onClick={() => {
              if (activeAddress) {
                copyToClipboard(activeAddress);
              }
            }}
            title="Copy wallet address to receive"
          >
            <span className="wallet-action-icon">📥</span>
            <span className="wallet-action-label">Receive</span>
          </button>
          <button
            className="wallet-action-btn wallet-action-btn-swap"
            onClick={() => onSetActiveTab('p2p')}
            title="Swap tokens via P2P"
          >
            <span className="wallet-action-icon">🔄</span>
            <span className="wallet-action-label">Swap</span>
          </button>
        </div>
      )}

      {/* Balance Display Section */}
      {(storedMeta?.address || checkAddress) && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="balance-card">
              <p className="text-xs text-slate-400 mb-2">Native Balance (BNB)</p>
              <p className="text-lg font-semibold text-slate-50">
                {balanceLoading ? 'Loading...' : nativeBalance !== null ? `${parseFloat(nativeBalance).toFixed(6)} BNB` : '—'}
              </p>
            </div>
            <div className="balance-card">
              <p className="text-xs text-slate-400 mb-2">FDA Token (On-Chain)</p>
              <p className="text-lg font-semibold text-slate-50">
                {balanceLoading ? 'Loading...' : fdaBalance !== null ? `${parseFloat(fdaBalance).toFixed(2)} FDA` : '—'}
              </p>
            </div>
          </div>
          {auth && internalFdaBalance !== null && (
            <div className="balance-card-green">
              <p className="text-xs text-slate-200 mb-2">🔄 Internal FDA Balance (Zero Fee Transfers)</p>
              <p className="text-lg font-semibold text-slate-50">
                {internalFdaBalance.toFixed(2)} FDA
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Available for instant internal transfers between MC wallets
              </p>
            </div>
          )}
          {customTokens.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-slate-400 mb-3">Custom Tokens</p>
              <div className="custom-tokens-grid">
                {customTokens.map((token) => {
                  const balance = customTokenBalances[token.address];
                  return (
                    <div key={token.address} className="balance-card">
                      <p className="text-xs text-slate-400 mb-2">{token.symbol} Balance</p>
                      <p className="text-lg font-semibold text-slate-50">
                        {balanceLoading ? 'Loading...' : balance !== undefined ? (
                          balance === 'Error' ? 'Error' : `${parseFloat(balance).toFixed(4)} ${token.symbol}`
                        ) : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {!storedMeta && !checkAddress && (
        <p className="text-sm text-slate-300" style={{ padding: '0.5rem 1rem' }}>
          Enter a wallet address above or create/import a wallet to view balances.
        </p>
      )}

      {/* Welcome Section */}
      <div className="bg-card p-5 card mt-6">
        <h2 className="card-title mb-3">Welcome to MC Wallet</h2>
        <p className="section-subtitle-light mb-8">
          Your wallet overview is displayed above. Use the sidebar menu to access all features:
        </p>
        <div className="action-cards-grid">
          <button className="action-card-light" onClick={() => onSetActiveTab('create')}>
            <div className="action-card-icon">💼</div>
            <p className="action-card-title">Create Wallet</p>
            <p className="action-card-desc">Generate a new wallet</p>
          </button>
          <button className="action-card-light" onClick={() => onSetActiveTab('send')}>
            <div className="action-card-icon">📤</div>
            <p className="action-card-title">Send Tokens</p>
            <p className="action-card-desc">Transfer FDA or BNB</p>
          </button>
          <button className="action-card-light" onClick={() => onSetActiveTab('p2p')}>
            <div className="action-card-icon">💱</div>
            <p className="action-card-title">P2P Trading</p>
            <p className="action-card-desc">Buy & sell FDA</p>
          </button>
          <button className="action-card-light" onClick={() => onSetActiveTab('tokens')}>
            <div className="action-card-icon">🪙</div>
            <p className="action-card-title">Custom Tokens</p>
            <p className="action-card-desc">Manage custom tokens</p>
          </button>
        </div>
      </div>
    </>
  );
};
