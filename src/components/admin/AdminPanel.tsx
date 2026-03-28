import React, { useState, useEffect } from 'react';
import { type AuthState } from '../types';
import { SitePagination } from '../common/SitePagination';
import { getApiUrl } from '../../config';

const ADMIN_TRADES_PER_PAGE = 12;

interface AdminPanelProps {
  auth: AuthState | null;
  newTokenAddress: string;
  onAddressChange: (address: string) => void;
  isValidAddress: (address: string) => boolean;
  onFetchTokenInfo: (address: string) => void;
  newTokenSymbol: string;
  newTokenName: string;
  tokenInfoLoading: boolean;
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

// https://merchantcoinwallet.com/admin/addGlobalWallet

export const AdminPanel: React.FC<AdminPanelProps> = ({
  auth,
  p2pFeeRate,
  editingFeeRate,
  newTokenAddress,
  tokenInfoLoading,
  newTokenName,
  newTokenSymbol,
  onFetchTokenInfo,
  isValidAddress,
  onAddressChange,
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
  const [fdaPrice, setFdaPrice] = useState("");
  const [updatingFdaPrice, setUpdatingFdaPrice] = useState(false);
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

  const addToken = async () => {

    try {

      const res = await fetch(getApiUrl('admin/addGlobalWallet'), {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          address: newTokenAddress,
          symbol: newTokenSymbol,
          name: newTokenName
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      alert("Token Added Successfully");

    } catch (err) {
      console.error(err);
      alert("Failed to add token");
    }
  };

  const updateFdaPrice = async () => {
    try {

      if (!fdaPrice || isNaN(Number(fdaPrice))) {
        alert("Enter valid price");
        return;
      }

      setUpdatingFdaPrice(true);

      const res = await fetch(getApiUrl("admin/setFdaPrice"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth?.token}`
        },
        body: JSON.stringify({
          price: Number(fdaPrice)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      alert("FDA Price Updated");

    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setUpdatingFdaPrice(false);
    }
  };

  const loadFdaPrice = async () => {
  try {
    const res = await fetch(getApiUrl("fdaPrice"));

    const data = await res.json();

    if (!res.ok) return;

    // 👇 set existing price into input
    setFdaPrice(data.price.toString());

  } catch (err) {
    console.error("Failed to load FDA price:", err);
  }
};

useEffect(() =>{
loadFdaPrice()
},[])
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        🛡️ Admin Panel
      </h2>

      <div>
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
          // onChange={(e) => onSymbolChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input-dark text-xs"
            placeholder="Token name (optional)"
            value={newTokenName}
          // onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-full" style={{ marginBottom: 20 }} onClick={addToken}>
          Add Token
        </button>
      </div>

      <div className="mb-6" style={{background: '#dddcdc', paddingInline: 10, paddingBlock: 25, borderRadius: 20}}>
        <label style={{fontSize: 18}}>
          FDA Price
        </label>

        <p className=" mb-3">
          Set the current FDA token price (used across the platform).
        </p>

        <div className="flex gap-3 items-center">
          <input
            type="number"
            step="0.0001"
            className="form-input flex-1 py-3 max-w-48"
            placeholder="Enter price"
            value={fdaPrice}
            onChange={(e) => setFdaPrice(e.target.value)}
          />

          <button
            className={`btn btn-success ${updatingFdaPrice ? "opacity-60 cursor-not-allowed" : ""
              }`}
            onClick={updateFdaPrice}
            disabled={updatingFdaPrice}
          >
            {updatingFdaPrice ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
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
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'DISPUTED' ? 'bg-yellow-200 text-yellow-800' :
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
