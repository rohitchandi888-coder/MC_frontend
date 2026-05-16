import React from 'react';
import { type AuthState } from '../types';
import type { WalletMeta } from '../../walletStorage';
import type { Tab } from '../types';

interface MetaMaskConnectProps {
  auth: AuthState | null;
  storedMeta: WalletMeta | null;
  metamaskAddress: string | null;
  metamaskConnected: boolean;
  connectingMetaMask: boolean;
  fdaPrivateKey: string | null;
  showPrivateKey: boolean;
  registeringWallet: boolean;
  unlockedPrivateKeyRef: React.MutableRefObject<string | null>;
  setActiveTab: (tab: Tab) => void;
  connectMetaMask: () => Promise<void>;
  registerMetaMaskAsFdaWallet: () => Promise<void>;
  exportFdaWalletToMetaMask: () => void;
  metamaskAccounts: string[];
  showMetamaskAccountSelector: boolean;
  setShowMetamaskAccountSelector: (show: boolean) => void;
  connectToMetamaskAccount: (address: string) => Promise<void>;
  getMetamaskAccounts: () => Promise<void>;
}

export const MetaMaskConnect: React.FC<MetaMaskConnectProps> = ({
  auth,
  storedMeta,
  metamaskAddress,
  metamaskConnected,
  connectingMetaMask,
  fdaPrivateKey,
  showPrivateKey,
  registeringWallet,
  unlockedPrivateKeyRef,
  setActiveTab,
  connectMetaMask,
  registerMetaMaskAsFdaWallet,
  exportFdaWalletToMetaMask,
  metamaskAccounts,
  showMetamaskAccountSelector,
  setShowMetamaskAccountSelector,
  connectToMetamaskAccount,
  getMetamaskAccounts,
}) => {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title-light">🦊 MetaMask Connection</h2>
        <p className="section-subtitle-light">
          Connect MetaMask wallet to MC Wallet system and vice versa. Import/export wallets between both systems.
        </p>
      </div>

      {/* Connect MetaMask to MC Wallet */}
      <div className="card mb-6">
        <h3 className="card-title mb-4">1. Connect MetaMask to MC Wallet</h3>
        <p className="section-subtitle-light mb-4">
          Connect your MetaMask wallet and register it as an MC wallet for zero-fee internal transfers.
        </p>
        
        {!metamaskConnected ? (
          <>
            <button
              className={`btn btn-yellow w-full ${connectingMetaMask ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={getMetamaskAccounts}
              disabled={connectingMetaMask}
              style={{ padding: '0.875rem', borderRadius: '8px', boxShadow: connectingMetaMask ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.3)' }}
            >
              {connectingMetaMask ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
            
            {/* Account Selector Modal */}
            {showMetamaskAccountSelector && metamaskAccounts.length > 0 && (
              <div className="modal-overlay" onClick={() => setShowMetamaskAccountSelector(false)} style={{ zIndex: 10000 }}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-icon-large">🦊</div>
                    <h3 className="modal-title">Select MetaMask Account</h3>
                  </div>
                  <p className="modal-text" style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
                    You have {metamaskAccounts.length} MetaMask account{metamaskAccounts.length > 1 ? 's' : ''}. Please select which one to connect:
                  </p>
                  <div className="space-y-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {metamaskAccounts.map((address) => (
                      <button
                        key={address}
                        className="btn btn-yellow w-full text-left"
                        onClick={() => connectToMetamaskAccount(address)}
                        disabled={connectingMetaMask}
                        style={{ 
                          padding: '0.75rem', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}
                      >
                        <span className="text-xs text-slate-400 mb-1">Account</span>
                        <span className="text-sm font-mono">{address}</span>
                        <span className="text-xs text-slate-300 mt-1">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="modal-button modal-button-secondary w-full mt-4"
                    onClick={() => setShowMetamaskAccountSelector(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="success-box mb-4">
            <p className="text-sm text-green-800 font-semibold mb-2">
              ✅ MetaMask Connected
            </p>
            <p className="text-xs text-green-700 font-mono mb-3">
              {metamaskAddress}
            </p>
            {auth && (
              <button
                className={`btn btn-success w-full ${registeringWallet ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={registerMetaMaskAsFdaWallet}
                disabled={registeringWallet}
              >
                {registeringWallet ? 'Registering...' : '📝 Register as MC Wallet'}
              </button>
            )}
          </div>
        )}

        {typeof window.ethereum === 'undefined' && (
          <div className="badge-warning mt-4 p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ MetaMask is not installed. <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-yellow-600 underline">Install MetaMask</a>
            </p>
          </div>
        )}
      </div>

      {/* Export MC Wallet to MetaMask */}
      <div className="card">
        <h3 className="card-title mb-4">2. Export MC Wallet to MetaMask</h3>
        <p className="section-subtitle-light mb-4">
          Export your MC wallet private key to import it into MetaMask. Make sure your wallet is unlocked first.
        </p>

        {!storedMeta ? (
          <div className="badge-warning p-4">
            <p className="text-sm text-yellow-800 mb-2">
              ⚠️ No wallet stored in your browser.
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              To export a wallet to MetaMask, you need to create or import a wallet first (in the "Create wallet" or "Import wallet" sections), then unlock it.
            </p>
            <p className="text-xs text-yellow-600">
              💡 <strong>Note:</strong> This feature is for exporting wallets stored in your browser to MetaMask. If you only have MetaMask wallets, you don't need to export them.
            </p>
          </div>
        ) : !unlockedPrivateKeyRef.current ? (
          <div className="badge-warning p-4">
            <p className="text-sm text-yellow-800 mb-3">
              ⚠️ Wallet is locked. Please unlock your wallet first in the "Unlock wallet" tab.
            </p>
            <button
              className="btn btn-yellow"
              onClick={() => setActiveTab('unlock')}
            >
              Go to Unlock Wallet
            </button>
          </div>
        ) : (
          <div>
            <button
              className="btn btn-blue w-full mb-4"
              onClick={exportFdaWalletToMetaMask}
              style={{ padding: '0.875rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}
            >
              🔑 Export Private Key for MetaMask
            </button>

            {showPrivateKey && fdaPrivateKey && (
              <div className="badge-danger p-4 mt-4">
                <p className="text-xs text-red-800 font-semibold mb-3">
                  ⚠️ SECURITY WARNING: Keep this private key secret!
                </p>
                <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                  <p className="text-xs text-gray-600 mb-2">Private Key:</p>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {fdaPrivateKey}
                  </p>
                </div>
                <div className="badge-info p-3">
                  <p className="text-xs text-blue-800 font-semibold mb-2">
                    How to import to MetaMask:
                  </p>
                  <ol className="text-xs text-blue-800 pl-5" style={{ lineHeight: '1.8' }}>
                    <li>Open MetaMask extension</li>
                    <li>Click the account icon → "Import account"</li>
                    <li>Select "Private Key"</li>
                    <li>Paste the private key above</li>
                    <li>Click "Import"</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
