import React, { useState } from 'react';
import { type AuthState } from '../types';

interface FDAWalletsProps {
  auth: AuthState | null;
  registeredFdaWallets: any[];
  allWallets: any[];
  newFdaWalletAddress: string;
  setNewFdaWalletAddress: (address: string) => void;
  newFdaWalletLabel: string;
  setNewFdaWalletLabel: (label: string) => void;
  registeringWallet: boolean;
  handleCreateAndRegisterFdaWallet: () => Promise<void>;
  registerRecipientWallet: (address: string, label?: string) => Promise<void>;
}

export const FDAWallets: React.FC<FDAWalletsProps> = ({
  auth,
  registeredFdaWallets,
  allWallets,
  newFdaWalletAddress,
  setNewFdaWalletAddress,
  newFdaWalletLabel,
  setNewFdaWalletLabel,
  registeringWallet,
  handleCreateAndRegisterFdaWallet,
  registerRecipientWallet,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  const copyToClipboard = (text: string, address: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };
  
  // Find local wallets that aren't registered yet
  const registeredAddresses = new Set(registeredFdaWallets.map((w: any) => w.address.toLowerCase()));
  const unregisteredWallets = allWallets.filter((wallet: any) => {
    const address = wallet.address?.toLowerCase();
    return address && !registeredAddresses.has(address);
  });
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">MC Wallets</h2>
        <p className="section-subtitle">
          Manage registered wallet addresses for zero-fee internal token transfers
        </p>
      </div>

      {!auth && (
        <div className="warning-box">
          <div className="warning-box-content">
            <span className="warning-icon">⚠️</span>
            <p className="text-sm font-semibold text-slate-50">Login Required</p>
          </div>
          <p className="text-xs text-slate-200">
            Please login to view and manage your registered MC wallets.
          </p>
        </div>
      )}

      {auth && (
        <>
          {/* Registered Wallets List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold text-slate-300">Your Registered MC Wallets</p>
              {registeredFdaWallets.length > 0 && (
                <span className="badge-count">
                  {registeredFdaWallets.length} {registeredFdaWallets.length === 1 ? 'Wallet' : 'Wallets'}
                </span>
              )}
            </div>
            {registeredFdaWallets.length > 0 ? (
              <div className="wallet-cards-grid">
                {registeredFdaWallets.map((wallet: any) => {
                  // Detect network from address format
                  const isEthereum = /^0x[a-f0-9]{40}$/i.test(wallet.address);
                  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.address);
                  const isBitcoin = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(wallet.address);
                  const isTron = /^T[A-Za-z1-9]{33}$/.test(wallet.address);
                  
                  let network = 'Unknown';
                  if (isEthereum) network = 'Ethereum/EVM';
                  else if (isSolana) network = 'Solana';
                  else if (isBitcoin) network = 'Bitcoin';
                  else if (isTron) network = 'Tron';
                  
                  return (
                  <div key={wallet.id} className="wallet-card">
                    <div className="wallet-card-header">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="wallet-card-label">
                            {wallet.label || `Wallet ${wallet.id}`}
                          </p>
                          {network !== 'Unknown' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-200 font-bold border border-blue-700">
                              {network}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="wallet-card-address flex-1">
                            {wallet.address}
                          </p>
                          <button
                            className="copy-address-btn"
                            onClick={() => copyToClipboard(wallet.address, wallet.address)}
                            title="Copy address"
                          >
                            {copiedAddress === wallet.address ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                      <div className="wallet-status-badge">
                        <span className="wallet-status-icon">✓</span>
                      </div>
                    </div>
                    <div className="success-box-dark">
                      <p className="text-xs text-white flex items-center gap-2 font-medium">
                        <span>✅</span>
                        <span>Zero-fee internal transfers enabled</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 pt-3" style={{ borderTop: '1px solid #475569' }}>
                      Registered: {new Date(wallet.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-icon">🔷</p>
                <p className="empty-state-title">No registered wallets yet</p>
                <p className="empty-state-description">
                  Create or register a wallet above to get started
                </p>
              </div>
            )}
          </div>

          {/* Unregistered Local Wallets */}
          {unregisteredWallets.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Unregistered Local Wallets</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Register these wallets to enable zero-fee internal transfers
                  </p>
                </div>
                <span className="badge-count" style={{ background: '#f59e0b' }}>
                  {unregisteredWallets.length} Unregistered
                </span>
              </div>
              <div className="wallet-cards-grid">
                {unregisteredWallets.map((wallet: any) => {
                  // Detect network from address format
                  const isEthereum = /^0x[a-f0-9]{40}$/i.test(wallet.address);
                  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet.address);
                  const isBitcoin = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(wallet.address);
                  const isTron = /^T[A-Za-z1-9]{33}$/.test(wallet.address);
                  
                  let network = 'Unknown';
                  if (isEthereum) network = 'Ethereum/EVM';
                  else if (isSolana) network = 'Solana';
                  else if (isBitcoin) network = 'Bitcoin';
                  else if (isTron) network = 'Tron';
                  
                  return (
                    <div key={wallet.id} className="wallet-card" style={{ opacity: 0.8, border: '2px dashed #64748b' }}>
                      <div className="wallet-card-header">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="wallet-card-label">
                              {wallet.label || `Wallet ${wallet.id.slice(-6)}`}
                            </p>
                            {network !== 'Unknown' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-200 font-bold border border-blue-700">
                                {network}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="wallet-card-address flex-1">
                              {wallet.address}
                            </p>
                            <button
                              className="copy-address-btn"
                              onClick={() => copyToClipboard(wallet.address, wallet.address)}
                              title="Copy address"
                            >
                              {copiedAddress === wallet.address ? '✓' : '📋'}
                            </button>
                          </div>
                        </div>
                        <div className="wallet-status-badge" style={{ background: '#f59e0b' }}>
                          <span className="wallet-status-icon">⚠</span>
                        </div>
                      </div>
                      <div className="success-box-dark" style={{ background: '#1e293b', border: '1px solid #475569' }}>
                        <p className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                          <span>⏳</span>
                          <span>Not registered - Click to register</span>
                        </p>
                      </div>
                      <button
                        className="btn btn-yellow w-full text-xs py-2 mt-3"
                        onClick={() => registerRecipientWallet(wallet.address, wallet.label)}
                        disabled={registeringWallet}
                        style={{ marginTop: '0.75rem' }}
                      >
                        {registeringWallet ? 'Registering...' : '📝 Register as MC Wallet'}
                      </button>
                      <p className="text-xs text-slate-400 mt-2">
                        Created: {new Date(wallet.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
