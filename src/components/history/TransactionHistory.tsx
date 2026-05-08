import React, { useEffect, useMemo, useState } from 'react';
import type { AuthState } from '../types';
import { getApiUrl } from '../../config';

interface Transaction {
  id: number;
  from_address: string | null;
  to_address: string | null;
  amount: string;
  created_at: string;
  from_user_id: number;
  to_user_id: number;
  from_fda_user_id?: string | null;
  to_fda_user_id?: string | null;
  from_email?: string;
  from_phone?: string;
  to_email?: string;
  to_phone?: string;
  source?: 'internal' | 'onchain';
  tx_hash?: string;
  asset_symbol?: string;
}
interface OnchainTransfer {
  id: number;
  from_wallet_address: string;
  to_wallet_address: string;
  amount: string | number;
  created_at: string;
  tx_hash: string;
  asset_symbol: string;
}

interface TransactionHistoryProps {
  auth: AuthState | null;
  userWalletAddresses: string[];
  walletOptions?: Array<{ address: string; label?: string }>;
}

/** API may return the same transfer row more than once; keep first per id for stable UI. */
function dedupeTransactionsById(rows: Transaction[]): Transaction[] {
  const seen = new Set<number>();
  return rows.filter((tx) => {
    if (seen.has(tx.id)) return false;
    seen.add(tx.id);
    return true;
  });
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  auth,
  userWalletAddresses,
  walletOptions = [],
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>('ALL');

  const walletFilterOptions = useMemo(() => {
    const byAddress = new Map<string, { address: string; label?: string }>();
    for (const w of walletOptions) {
      const addr = String(w.address || '').trim();
      if (!addr) continue;
      byAddress.set(addr.toLowerCase(), { address: addr, label: w.label });
    }
    for (const addr of userWalletAddresses) {
      const a = String(addr || '').trim();
      if (!a) continue;
      if (!byAddress.has(a.toLowerCase())) byAddress.set(a.toLowerCase(), { address: a });
    }
    return Array.from(byAddress.values());
  }, [walletOptions, userWalletAddresses]);


  const loadTransactions = async () => {
    if (!auth) {
      setError('Please login to view transaction history.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('internal/transfers'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load transactions.');
        return;
      }

      const data: Transaction[] = await res.json();

      // Filter transactions to only show those involving user's wallet addresses
      // If no wallet addresses, show all transactions (they're already filtered by user_id on backend)
      let filteredTransactions = data;

      if (userWalletAddresses.length > 0) {
        filteredTransactions = data.filter((tx) => {
          // If addresses are available, filter by them
          if (tx.from_address && tx.to_address) {
            const fromMatch = userWalletAddresses.some(
              (addr) => addr.toLowerCase() === (tx.from_address || '').toLowerCase()
            );
            const toMatch = userWalletAddresses.some(
              (addr) => addr.toLowerCase() === (tx.to_address || '').toLowerCase()
            );
            return fromMatch || toMatch;
          }
          // If no addresses in transaction, show it anyway (it's for this user)
          return true;
        });
      }

      const internalRows = dedupeTransactionsById(filteredTransactions).map((tx) => ({
        ...tx,
        source: 'internal' as const,
      }));
      let serverOnchainRows: Transaction[] = [];
      try {
        const onchainRes = await fetch(getApiUrl('onchain/transfers'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (onchainRes.ok) {
          const onchainData: OnchainTransfer[] = await onchainRes.json().catch(() => []);
          if (Array.isArray(onchainData)) {
            serverOnchainRows = onchainData.map((row) => ({
              id: Number(row.id),
              from_address: row.from_wallet_address || null,
              to_address: row.to_wallet_address || null,
              amount: String(row.amount ?? '0'),
              created_at: row.created_at,
              from_user_id: auth?.user?.id ?? 0,
              to_user_id: 0,
              source: 'onchain',
              tx_hash: row.tx_hash,
              asset_symbol: row.asset_symbol || 'TOKEN',
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load server on-chain history:', err);
      }
      const userId = auth?.user?.id ?? 'guest';
      const localKey = `onchain_transfer_history_${userId}`;
      const localRaw = localStorage.getItem(localKey);
      const localRows = localRaw ? JSON.parse(localRaw) : [];
      const onchainRows: Transaction[] = Array.isArray(localRows)
        ? localRows.map((row: any) => ({
          id: Number(row.id || Date.now()),
          from_address: row.fromAddress || null,
          to_address: row.toAddress || null,
          amount: String(row.amount || '0'),
          created_at: row.createdAt || new Date().toISOString(),
          from_user_id: auth?.user?.id ?? 0,
          to_user_id: 0,
          source: 'onchain',
          tx_hash: row.txHash ? String(row.txHash) : undefined,
          asset_symbol: row.assetSymbol ? String(row.assetSymbol) : 'TOKEN',
        }))
        : [];
      const merged = [...internalRows, ...onchainRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const mergedWithServer = [...internalRows, ...serverOnchainRows, ...onchainRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const deduped = mergedWithServer.filter((row, idx, arr) => {
        if (row.source !== 'onchain' || !row.tx_hash) return true;
        return arr.findIndex((x) => x.source === 'onchain' && x.tx_hash === row.tx_hash) === idx;
      });
      setTransactions(deduped);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError('Unable to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      loadTransactions();
    }
  }, [auth, userWalletAddresses.length]);

  useEffect(() => {
    if (selectedWalletAddress === 'ALL') return;
    const stillExists = userWalletAddresses.some(
      (addr) => addr.toLowerCase() === selectedWalletAddress.toLowerCase(),
    );
    if (!stillExists) setSelectedWalletAddress('ALL');
  }, [selectedWalletAddress, userWalletAddresses]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyWalletAddress = async (address: string | null | undefined) => {
    const value = String(address || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // best-effort only
    }
  };

  const getTransactionType = (tx: Transaction) => {
    if (!tx.from_address) return 'Received';
    const isFromUser = userWalletAddresses.some(
      (addr) => addr.toLowerCase() === tx.from_address?.toLowerCase()
    );
    return isFromUser ? 'Sent' : 'Received';
  };

  const walletScopedTransactions = useMemo(() => {
    if (selectedWalletAddress === 'ALL') return transactions;
    const selected = selectedWalletAddress.toLowerCase();
    return transactions.filter((tx) => {
      const from = String(tx.from_address || '').toLowerCase();
      const to = String(tx.to_address || '').toLowerCase();
      return from === selected || to === selected;
    });
  }, [transactions, selectedWalletAddress]);

  const filterTransaction = useMemo(() => {
    const s = search.toLowerCase();
    const onSearchFind = walletScopedTransactions.filter((e) =>
      String(e.created_at || '').toLowerCase().includes(s) ||
      String(e.amount || '').toLowerCase().includes(s) ||
      String(e.from_fda_user_id || '').toLowerCase().includes(s) ||
      String(e.to_fda_user_id || '').toLowerCase().includes(s) ||
      String(e.from_email || '').toLowerCase().includes(s) ||
      String(e.from_phone || '').toLowerCase().includes(s) ||
      String(e.to_email || '').toLowerCase().includes(s) ||
      String(e.to_phone || '').toLowerCase().includes(s)
    );
    return onSearchFind
  }, [walletScopedTransactions, search])

  if (!auth) {
    return (
      <div>
        <div className="warning-box">
          <div className="warning-box-content">
            <span className="warning-icon">⚠️</span>
            <p className="text-sm font-semibold warn-text">Login Required</p>
          </div>
          <p className="text-xs waring-para">
            Please login to view your transaction history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Transaction History</h2>
        <p className="section-subtitle">
          Internal FDA transfers and on-chain sends from this device/session are listed here.
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-4">
              <p className="text-xs text-slate-400">
                {walletScopedTransactions.length > 0
                  ? `Showing ${walletScopedTransactions.length} transaction${walletScopedTransactions.length !== 1 ? 's' : ''}`
                  : userWalletAddresses.length > 0
                    ? `Showing transactions for ${userWalletAddresses.length} wallet address${userWalletAddresses.length !== 1 ? 'es' : ''}`
                    : 'Showing all your transactions'}
              </p>
              {auth?.user?.fdaUserId && (
                <p className="text-xs">
                  FDA User ID: <span className=" font-semibold">{auth.user.fdaUserId}</span>
                </p>
              )}
            </div>

          </div>
          <div>

            <button
              className="btn btn-yellow text-xs py-2 px-4"
              onClick={loadTransactions}
              disabled={loading}
            >
              {loading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>

        </div>
        {userWalletAddresses.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-slate-300 block mb-1">Wallet filter</label>
            <select
              className="form-select-dark w-full py-2"
              value={selectedWalletAddress}
              onChange={(e) => setSelectedWalletAddress(e.target.value)}
            >
              <option value="ALL">All Wallets</option>
              {walletFilterOptions.map((w) => (
                <option key={w.address} value={w.address}>
                  {w.label ? `${w.label} - ` : ''}{w.address.slice(0, 10)}...{w.address.slice(-4)}
                </option>
              ))}
            </select>
          </div>
        )}
        <input type="text" placeholder='Search in Transaction....' style={{ width: '100%', paddingInline: 10, marginBlock: 15, paddingBlock: 15 }} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="error-box mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && filterTransaction.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-sm text-slate-400">Loading transactions...</p>
        </div>
      ) : filterTransaction.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-sm text-slate-400">No transactions found.</p>
          <p className="text-xs text-slate-500 mt-2">
            Transactions will appear here once you make or receive internal transfers.
          </p>
        </div>
      ) : (
        <div className='transactionHistory-Cont'>
          <div className="transaction-list">
            {filterTransaction.map((tx, rowIndex) => {
              const isFromUser = tx.from_address ? userWalletAddresses.some(
                (addr) => addr.toLowerCase() === tx.from_address?.toLowerCase()
              ) : false;
              const isToUser = tx.to_address ? userWalletAddresses.some(
                (addr) => addr.toLowerCase() === tx.to_address?.toLowerCase()
              ) : false;
              const isSentTx = isFromUser && !isToUser;
              const isReceivedTx = isToUser && !isFromUser;
              const isSelfTx = isFromUser && isToUser;

              const rowKey = `${tx.id}-${tx.created_at}-${tx.amount}-${tx.from_address ?? ""}-${tx.to_address ?? ""}-${rowIndex}`;

              const qtyColor = isFromUser ? '#f87171' : '#4ade80';
              return (
                <div key={rowKey} className="transaction-item" style={{ padding: '14px 12px' }}>
                  <div className="flex items-center gap-3 mb-3 flex-wrap justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold" style={{ color: '#f8fafc' }}>
                        {getTransactionType(tx)}
                      </span>
                      <span className="text-sm" style={{ color: '#cbd5e1' }}>
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="mb-3 rounded-lg px-3 py-2.5"
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid #475569',
                    }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                      Quantity ({tx.source === 'onchain' ? (tx.asset_symbol || 'TOKEN') : 'FDA'})
                    </div>
                    <div className="text-xl font-bold mt-1" style={{ color: qtyColor }}>
                      {isFromUser ? '-' : '+'}
                      {parseFloat(tx.amount).toFixed(4)} {tx.source === 'onchain' ? (tx.asset_symbol || 'TOKEN') : 'FDA'}
                    </div>
                  </div>
                  {tx.source === 'onchain' && tx.tx_hash ? (
                    <div className="text-xs mb-2" style={{ color: '#94a3b8' }}>
                      Tx: {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-8)}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                        {(isReceivedTx || isSelfTx) && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm  font-semibold" style={{ color: '#fff' }}>From:</span>
                              {tx.from_address && (
                                <>
                                  <span className="text-sm text-white font-mono bg-slate-800 px-2 py-0.5 rounded" style={{ color: '#fff' }}>
                                    {formatAddress(tx.from_address)}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-sm font-semibold px-1.5 py-0.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-700"
                                    onClick={() => void copyWalletAddress(tx.from_address)}
                                    title="Copy wallet address"
                                    aria-label="Copy wallet address"
                                  >
                                    ⧉
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm" style={{ color: '#dbeafe' }}>
                                {tx.from_email || tx.from_phone || 'You'}
                              </span>
                              {tx.from_fda_user_id && (
                                <span className="text-sm  font-bold bg-blue-900/30 px-2 py-0.5 rounde" style={{ color: '#fff' }}>
                                  FDA ID: {tx.from_fda_user_id}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {(isSentTx || isSelfTx) && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm  font-semibold" style={{ color: '#fff' }}>To:</span>
                              {tx.to_address && (
                                <>
                                  <span className="text-sm text-white font-mono bg-slate-800 px-2 py-0.5 rounded" style={{ color: '#fff' }}>
                                    {formatAddress(tx.to_address)}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-sm font-semibold px-1.5 py-0.5 rounded border border-slate-600 text-slate-200 hover:bg-slate-700"
                                    onClick={() => void copyWalletAddress(tx.to_address)}
                                    title="Copy wallet address"
                                    aria-label="Copy wallet address"
                                  >
                                    ⧉
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm" style={{ color: '#dbeafe' }}>
                                {tx.to_email || tx.to_phone || 'Unknown'}
                              </span>
                              {tx.to_fda_user_id && (
                                <span className="text-sm  font-bold bg-blue-900/30 px-2 py-0.5 rounded" style={{ color: '#fff' }}>
                                  FDA ID: {tx.to_fda_user_id}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Show both FDA user IDs if transaction involves different users */}
                        {!isFromUser && !isToUser && (
                          <div className="flex flex-col gap-2 bg-slate-800/50 p-2 rounded">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-slate-300 font-semibold">From FDA ID:</span>
                              <span className="text-sm text-blue-400 font-bold bg-blue-900/30 px-2 py-0.5 rounded">
                                {tx.from_fda_user_id || tx.from_user_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-slate-300 font-semibold">To FDA ID:</span>
                              <span className="text-sm text-blue-400 font-bold bg-blue-900/30 px-2 py-0.5 rounded">
                                {tx.to_fda_user_id || tx.to_user_id}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
