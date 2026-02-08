import React, { useEffect, useState } from 'react';
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
}

interface TransactionHistoryProps {
  auth: AuthState | null;
  userWalletAddresses: string[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ auth, userWalletAddresses }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      setTransactions(filteredTransactions);
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

  const getTransactionType = (tx: Transaction) => {
    if (!tx.from_address) return 'Received';
    const isFromUser = userWalletAddresses.some(
      (addr) => addr.toLowerCase() === tx.from_address?.toLowerCase()
    );
    return isFromUser ? 'Sent' : 'Received';
  };

  const getTransactionColor = (tx: Transaction) => {
    if (!tx.from_address) return 'text-green-400';
    const isFromUser = userWalletAddresses.some(
      (addr) => addr.toLowerCase() === tx.from_address?.toLowerCase()
    );
    return isFromUser ? 'text-red-400' : 'text-green-400';
  };

  if (!auth) {
    return (
      <div>
        <div className="warning-box">
          <div className="warning-box-content">
            <span className="warning-icon">⚠️</span>
            <p className="text-sm font-semibold text-slate-50">Login Required</p>
          </div>
          <p className="text-xs text-slate-200">
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
          View all internal transfers for your wallet addresses
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-400">
            {transactions.length > 0 
              ? `Showing ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
              : userWalletAddresses.length > 0
              ? `Showing transactions for ${userWalletAddresses.length} wallet address${userWalletAddresses.length !== 1 ? 'es' : ''}`
              : 'Showing all your transactions'}
          </p>
          {auth?.user?.fdaUserId && (
            <p className="text-xs text-slate-500">
              FDA User ID: <span className="text-slate-300 font-semibold">{auth.user.fdaUserId}</span>
            </p>
          )}
        </div>
        <button
          className="btn btn-yellow text-xs py-2 px-4"
          onClick={loadTransactions}
          disabled={loading}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-box mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-sm text-slate-400">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-sm text-slate-400">No transactions found.</p>
          <p className="text-xs text-slate-500 mt-2">
            Transactions will appear here once you make or receive internal transfers.
          </p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((tx) => {
            const isFromUser = tx.from_address ? userWalletAddresses.some(
              (addr) => addr.toLowerCase() === tx.from_address?.toLowerCase()
            ) : false;
            const isToUser = tx.to_address ? userWalletAddresses.some(
              (addr) => addr.toLowerCase() === tx.to_address?.toLowerCase()
            ) : false;

            return (
              <div key={tx.id} className="transaction-item">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-base font-bold ${getTransactionColor(tx)}`}>
                        {getTransactionType(tx)}
                      </span>
                      <span className="text-sm text-slate-300">
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {isFromUser && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-300 font-semibold">From:</span>
                            {tx.from_address && (
                              <span className="text-sm text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                                {formatAddress(tx.from_address)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap ml-6">
                            <span className="text-sm text-slate-400">
                              {tx.from_email || tx.from_phone || 'You'}
                            </span>
                            {tx.from_fda_user_id && (
                              <span className="text-sm text-blue-400 font-bold bg-blue-900/30 px-2 py-0.5 rounded">
                                FDA ID: {tx.from_fda_user_id}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {isToUser && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-300 font-semibold">To:</span>
                            {tx.to_address && (
                              <span className="text-sm text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                                {formatAddress(tx.to_address)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap ml-6">
                            <span className="text-sm text-slate-400">
                              {tx.to_email || tx.to_phone || 'Unknown'}
                            </span>
                            {tx.to_fda_user_id && (
                              <span className="text-sm text-blue-400 font-bold bg-blue-900/30 px-2 py-0.5 rounded">
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
                  
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${getTransactionColor(tx)}`}>
                      {isFromUser ? '-' : '+'}{parseFloat(tx.amount).toFixed(4)} FDA
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
