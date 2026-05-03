import React, { useEffect, useState } from 'react';
import type { AuthState } from '../types';
import type { CustomToken, WalletMeta } from '../../walletStorage';

const popularTokens = [
  {
    symbol: "BNB",
    name: "BNB",
    address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x55d398326f99059fF775485246999027B3197955",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
  {
    symbol: "CAKE",
    name: "PancakeSwap",
    address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  },

  {
    symbol: "JIO",
    name: "JioCoin",
    address: "0xb314d182de1c3a3ecc6772cc1126db8e5fc29886",
  },
];
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
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getBestPrice = (data: any) => {
    if (!data?.pairs?.length) return 0;

    const stablePair = data.pairs.find(
      (p: any) =>
        p.quoteToken?.symbol === "USDT" ||
        p.quoteToken?.symbol === "USDC"
    );

    if (stablePair?.priceUsd) {
      return parseFloat(stablePair.priceUsd);
    }

    const sorted = [...data.pairs].sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    if (sorted[0]?.priceUsd) {
      return parseFloat(sorted[0].priceUsd);
    }

    return 0;
  };
useEffect(() => {
  let interval: any;

  const fetchPrices = async () => {
    const prices: Record<string, number> = {};

    for (const token of popularTokens) {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
        );

        const data = await res.json();
        const price = getBestPrice(data);

        prices[token.address] = price;
      } catch {
        prices[token.address] = 0;
      }
    }

    setTokenPrices(prices);
  };

  fetchPrices();

  //  refresh every 10 sec 
  interval = setInterval(fetchPrices, 10000);

  return () => clearInterval(interval);
}, []);
  return (
    <>
      <div
        style={{
          marginTop: "20px",
          background: "#0f172a",
          borderRadius: "12px",
          padding: "10px",
          border: "1px solid #1e293b",
          marginBlock: 20
        }}
      >
        <p
          style={{
            color: "#94a3b8",
            marginBottom: "10px",
            fontSize: "13px",
            paddingLeft: "6px",
          }}
        >
          Tokens
        </p>

        {popularTokens.map((token) => {
          const price = tokenPrices[token.address] || 0;

          const balance =
            token.symbol === "BNB"
              ? parseFloat(nativeBalance || "0")
              : token.symbol === "ETH"
                ? parseFloat(fdaBalance || "0")
                : 0;

          const usdValue = balance * price;

          return (
            <div
              key={token.address}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "6px",
                background: "#020617",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {/* LEFT */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {/* Dummy Image */}
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {token.symbol[0]}
                </div>

                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    {token.symbol}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    ${price.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {balance.toFixed(4)}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  ${usdValue.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
              <p className="text-slate-200 mb-2" style={{ fontWeight: '700' }}>🔄 Internal FDA Balance (Zero Fee Transfers)</p>
              <p className="text-lg font-semibold" style={{ color: "#fff" }}>
                {internalFdaBalance.toFixed(2)} FDA
              </p>
              <p className="text-xs mt-2" style={{ color: '#fff' }}>
                Available for instant internal transfers between MC wallets
              </p>
            </div>
          )}
          {customTokens.length > 0 && (
            <div className="mt-6">
              <p className="text-xl text-slate-400 mb-3">Custom Tokens</p>

              <div className="custom-tokens-grid">

                {customTokens
                  .filter(token => token.status === "GLOBAL" || token.enabled)
                  .map((token) => {

                    const balance =
                      customTokenBalances[token.address.toLowerCase()] ??
                      customTokenBalances[token.address];

                    return (
                      <div key={token.address} className="balance-card">
                        <p className="text-md mb-2" style={{ color: '#fff' }}>
                          {token.symbol} Balance
                        </p>

                        <p className="text-lg font-semibold text-slate-50">
                          {balanceLoading
                            ? "Loading..."
                            : balance !== undefined
                              ? balance === "Error"
                                ? "Error"
                                : `${parseFloat(balance).toFixed(4)} ${token.symbol}`
                              : "—"}
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
