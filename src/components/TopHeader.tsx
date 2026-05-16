import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { AuthState } from './types';
import type { WalletMeta } from '../walletStorage';
import { getApiUrl } from '../config';

interface TopHeaderProps {
  auth: AuthState | null;
  internalFdaBalance: number | null;
  storedMeta: { address: string; label?: string } | null;
  allWallets: WalletMeta[];
  registeredFdaWallets: any[]; // Wallets from database\
  onProfileClick: () => void;
  onSwitchWallet: (walletId: string) => void;

}




export const TopHeader: React.FC<TopHeaderProps> = ({
  auth,
  internalFdaBalance,
  storedMeta,
  allWallets,
  registeredFdaWallets,
  onProfileClick,
  onSwitchWallet,
}) => {
  const normalizeWalletNetwork = (raw?: string) => {
    const n = String(raw || '').trim().toLowerCase();
    if (!n) return 'BNB Chain';
    if (n.includes('ethereum') || n.includes('evm') || n === 'eth') return 'BNB Chain';
    if (n.includes('bnb')) return 'BNB Chain';
    if (n.includes('tron') || n === 'trx') return 'Tron';
    if (n.includes('bitcoin') || n === 'btc') return 'Bitcoin';
    if (n.includes('solana') || n === 'sol') return 'Solana';
    return raw || 'BNB Chain';
  };
  const [copied, setCopied] = useState<string | null>(null);
  const [showWalletsDropdown, setShowWalletsDropdown] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [fdaPrice, setFdaPrice] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);


  const loadProfile = async () => {
    if (!auth) return;

    // setLoading(true);
    // setError(null);
    try {
      const res = await fetch(getApiUrl('auth/profile'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        // setError(data.error || 'Failed to load profile');
        return;
      }

      const data = await res.json();
      console.log({ data });

      setUserData(data);
      const profilePrice = Number(data?.fda_price ?? 0);
      if (Number.isFinite(profilePrice) && profilePrice > 0) {
        setFdaPrice(profilePrice);
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      // setError('Unable to load profile. Please try again.');
    } finally {
      // setLoading(false);
    }
  };



  useEffect(() => {
    if (auth) {
      loadProfile();
    }
  }, [auth]);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletsDropdown(false);
      }
    };

    if (showWalletsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletsDropdown]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };


  // Combine registered wallets from database with local wallets
  // Prioritize registered wallets from database
  const allWalletsList = React.useMemo(() => {
    const registeredMap = new Map<string, any>();

    // Add registered wallets from database first
    registeredFdaWallets.forEach((wallet: any) => {
      if (wallet.address) {
        registeredMap.set(wallet.address.toLowerCase(), {
          id: wallet.id?.toString() || `db-${wallet.address.slice(0, 10)}`,
          address: wallet.address,
          label: wallet.label || `Wallet ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
          network: normalizeWalletNetwork(wallet.network),
          source: 'database',
        });
      }
    });

    // Add local wallets that aren't already in database
    allWallets.forEach((wallet) => {
      if (wallet.address && !registeredMap.has(wallet.address.toLowerCase())) {
        registeredMap.set(wallet.address.toLowerCase(), {
          ...wallet,
          network: normalizeWalletNetwork(wallet.network),
          source: 'local',
        });
      }
    });

    return Array.from(registeredMap.values());
  }, [registeredFdaWallets, allWallets]);

  return (
    <header className="top-header" style={{ position: 'sticky', top: 0, bottom: 0, borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', zIndex: 9999 }}>
      <div className="top-header-left" >
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>

          {userData && (
            <p style={{ color: '#fff' }}>
              Hi! {userData?.full_name || "User"}
            </p>
          )}
          <button
            className="top-header-profile-btn"
            onClick={onProfileClick}
          >
            👤 Profile
          </button>
        </div>
      </div>

      <div className="top-header-right">
        {fdaPrice !== null && (
          <div className="top-header-balance-item">
            <span className="top-header-balance-label" style={{ color: 'white' }}>
              FDA Price:
            </span>
            <span className="top-header-balance-value" style={{ color: '#b3a7a7' }}>
              {fdaPrice}
            </span>
            <button
              className="top-header-copy-btn"
              onClick={() => copyToClipboard(fdaPrice.toString(), 'price')}
              title="Copy FDA price"
            >
              {copied === 'price' ? '✓' : '⧉'}
            </button>
          </div>
        )}
        {auth && internalFdaBalance !== null && (
          <div className="top-header-balance-item">
            <span className="top-header-balance-label" style={{ color: 'white' }}>FDA Balance:</span>
            <span className="top-header-balance-value" style={{ color: '#b3a7a7' }}>{internalFdaBalance.toFixed(2)} FDA</span>
            <button
              className="top-header-copy-btn"
              onClick={() => copyToClipboard(internalFdaBalance.toFixed(2), 'fda')}
              title="Copy FDA balance"
            >
              {copied === 'fda' ? '✓' : '⧉'}
            </button>
          </div>
        )}

        {/* All Wallets Dropdown - Show from database */}
        {allWalletsList.length > 0 && (
          <div className="top-header-wallets-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="top-header-balance-item"
              onClick={() => setShowWalletsDropdown(!showWalletsDropdown)}
              style={{ cursor: 'pointer', background: 'transparent', border: 'none', padding: '0.5rem 1rem' }}
            >
              <span className="top-header-balance-label" style={{ color: 'white' }}>Wallets ({allWalletsList.length}):</span>
              <span className="top-header-balance-value" style={{ color: '#b3a7a7' }}>
                {storedMeta ? `${storedMeta.address.slice(0, 6)}...${storedMeta.address.slice(-4)}` : 'Select'}
              </span>
              <span style={{ color: '#b3a7a7', marginLeft: '0.5rem' }}>▼</span>
            </button>

            {showWalletsDropdown && (
              <div
                className="wallets-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  minWidth: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                }}
              >
                {allWalletsList.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="wallet-dropdown-item"
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.25rem',
                      borderRadius: '0.25rem',
                      // background: wallet.address?.toLowerCase() === storedMeta?.address?.toLowerCase() ? '#334155' : 'transparent',
                      background:
                        wallet.address?.toLowerCase() === storedMeta?.address?.toLowerCase()
                          ? '#334155'
                          : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    // onClick={(e) => {
                    //   e.stopPropagation();
                    //   copyToClipboard(wallet.address, `wallet-${wallet.id}`);
                    // }}
                    onClick={(e) => {
                      e.stopPropagation();

                      // switch wallet
                      onSwitchWallet(wallet.id);

                      // close dropdown
                      setShowWalletsDropdown(false);
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                        {wallet.label || `Wallet ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {wallet.address}
                      </div>
                      {wallet.network && (
                        <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                          {wallet.network}
                        </div>
                      )}
                      {wallet.source === 'database' && (
                        <div style={{ color: '#10b981', fontSize: '0.65rem', marginTop: '0.25rem' }}>
                          ✓ Registered
                        </div>
                      )}
                    </div>
                    <button
                      className="top-header-copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(wallet.address, `wallet-${wallet.id}`);
                      }}
                      // onClick={(e) => {
                      //   e.stopPropagation();

                      //   // switch wallet
                      //   onSwitchWallet(wallet.id);

                      //   // close dropdown
                      //   setShowWalletsDropdown(false);
                      // }}
                      title="Copy wallet address"
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        background: 'transparent',
                        border: '1px solid #475569',
                        borderRadius: '0.25rem',
                        color: copied === `wallet-${wallet.id}` ? '#10b981' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {copied === `wallet-${wallet.id}` ? '✓ Copied' : '⧉ Copy'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Wallet (if no dropdown or as fallback) */}
        {storedMeta && allWallets.length === 0 && (
          <div className="top-header-balance-item">
            <span className="top-header-balance-label" style={{ color: 'white' }}>MC Wallet:</span>
            <span className="top-header-balance-value" title={storedMeta.address} style={{ color: '#b3a7a7' }}>
              {storedMeta.address.slice(0, 6)}...{storedMeta.address.slice(-4)}
            </span>
            <button
              className="top-header-copy-btn"
              onClick={() => copyToClipboard(storedMeta.address, 'wallet')}
              title="Copy wallet address"
            >
              {copied === 'wallet' ? '✓' : '⧉'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
