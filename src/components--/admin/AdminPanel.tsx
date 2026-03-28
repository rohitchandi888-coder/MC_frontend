import React, { useState, useEffect } from 'react';
import { type AuthState } from '../types';
import { SitePagination } from '../common/SitePagination';

const ADMIN_TRADES_PER_PAGE = 12;

interface AdminPanelProps {
  auth: AuthState | null;
  p2pFeeRate: number;
  editingFeeRate: boolean;
  newFeeRate: string;
  setNewFeeRate: (rate: string) => void;
  updatingFeeRate: boolean;
  holdingFdaAmount: string;
  editingHoldingFda: boolean;
  newHoldingFda: string;
  setNewHoldingFda: (amount: string) => void;
  updatingHoldingFda: boolean;
  adminTrades: any[];
  adminDisputes: any[];
  setEditingFeeRate: (editing: boolean) => void;
  setEditingHoldingFda: (editing: boolean) => void;
  updateFeeRate: () => Promise<void>;
  updateHoldingFda: () => Promise<void>;
  loadAdminData: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  auth,
  p2pFeeRate,
  editingFeeRate,
  newFeeRate,
  setNewFeeRate,
  updatingFeeRate,
  holdingFdaAmount,
  editingHoldingFda,
  newHoldingFda,
  setNewHoldingFda,
  updatingHoldingFda,
  adminTrades,
  adminDisputes,
  setEditingFeeRate,
  setEditingHoldingFda,
  updateFeeRate,
  updateHoldingFda,
  loadAdminData,
}) => {
  const [adminTradesPage, setAdminTradesPage] = useState(1);
  const totalAdminTradesPages = Math.max(1, Math.ceil(adminTrades.length / ADMIN_TRADES_PER_PAGE));
  const paginatedAdminTrades = adminTrades.slice(
    (adminTradesPage - 1) * ADMIN_TRADES_PER_PAGE,
    adminTradesPage * ADMIN_TRADES_PER_PAGE
  );
  useEffect(() => {
    if (adminTradesPage > totalAdminTradesPages && totalAdminTradesPages > 0) {
      setAdminTradesPage(totalAdminTradesPages);
    }
  }, [adminTrades.length, totalAdminTradesPages, adminTradesPage]);

  if (!auth?.user.isAdmin) {
    return (
      <div className="card text-center p-8">
        <div className="modal-icon-large">🔒</div>
        <h3 className="modal-title">
          Admin Access Required
        </h3>
        <p className="modal-text">
          You must be logged in as an admin user to access this panel.
        </p>
        <p className="text-xs text-gray-600">
          Contact your administrator to get admin access.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🛡️ Admin Panel
      </h2>
    
      {/* Global Settings Section */}
      <div className="offer-form-card mb-6">
        <h3 className="offer-form-title">
          ⚙️ Global Settings
        </h3>
        
        {/* P2P Trading Fee Rate */}
        <div className="mb-6">
          <label className="modal-label">
            P2P Trading Fee Rate (%)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Set the trading fee percentage (e.g., 1 for 1%, 5 for 5%). This fee is deducted from the seller when tokens are released.
          </p>
          {editingFeeRate ? (
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-input flex-1 py-3 max-w-48"
                value={newFeeRate}
                onChange={(e) => setNewFeeRate(e.target.value)}
              />
              <span className="text-sm text-gray-600">%</span>
              <button
                className={`btn btn-success ${updatingFeeRate ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateFeeRate}
                disabled={updatingFeeRate}
              >
                {updatingFeeRate ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingFeeRate(false);
                  setNewFeeRate(p2pFeeRate.toString());
                }}
                disabled={updatingFeeRate}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24 text-center">
                {p2pFeeRate}%
              </div>
              <button
                className="btn btn-blue"
                onClick={() => setEditingFeeRate(true)}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        {/* Holding FDA Amount */}
        <div className="mb-6">
          <label className="modal-label">
            Holding FDA Amount
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Set the minimum FDA balance users must maintain (supports up to 18 decimal places). Users cannot create offers or transfer if their usable balance would fall below this amount.
          </p>
          {editingHoldingFda ? (
            <div className="flex gap-3 items-center">
              <input
                type="text"
                pattern="^\d+(\.\d{0,18})?$"
                className="form-input flex-1 py-3 max-w-72"
                placeholder="0.000000000000000000"
                value={newHoldingFda}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty, numbers, and decimal point with up to 18 decimal places
                  if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
                    setNewHoldingFda(value);
                  }
                }}
              />
              <span className="text-sm text-gray-600">FDA</span>
              <button
                className={`btn btn-success ${updatingHoldingFda ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={updateHoldingFda}
                disabled={updatingHoldingFda}
              >
                {updatingHoldingFda ? 'Saving...' : '✅ Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditingHoldingFda(false);
                  setNewHoldingFda(holdingFdaAmount);
                }}
                disabled={updatingHoldingFda}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="card-dark py-3 px-5 text-base font-semibold text-gray-900 min-w-24">
                {holdingFdaAmount} FDA
              </div>
              <button
                className="btn btn-blue"
                onClick={() => {
                  setNewHoldingFda(holdingFdaAmount);
                  setEditingHoldingFda(true);
                }}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Admin Monitoring Section */}
      <div className="offer-form-card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="offer-form-title">
            📊 Admin Monitoring
          </h3>
          <button 
            className="btn btn-yellow text-sm py-2 px-4"
            onClick={loadAdminData}
          >
            🔄 Refresh Data
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Monitor recent trades (read-only). For disputes management, use the "Disputes" tab in the sidebar.
        </p>
        
        {/* Trades Section */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Recent Trades ({adminTrades.length})
          </p>
          {adminTrades.length > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                {paginatedAdminTrades.map((t) => (
                  <div key={t.id} className="card-dark p-3 text-xs text-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Trade #{t.id}:</strong> {t.amount} {t.asset_symbol} @ {t.price} {t.fiat_currency}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        t.status === 'DISPUTED' ? 'bg-yellow-200 text-yellow-800' :
                        t.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                        t.status === 'CANCELLED' ? 'bg-red-200 text-red-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <SitePagination
                id="admin-trades-pagination"
                currentPage={adminTradesPage}
                totalPages={totalAdminTradesPages}
                onPageChange={setAdminTradesPage}
              />
            </>
          ) : (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs text-gray-600 text-center">No trades found.</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
};
