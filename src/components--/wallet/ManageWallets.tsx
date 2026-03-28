import React, { useState } from 'react';
import type { WalletMeta } from '../../walletStorage';

interface ManageWalletsProps {
  allWallets: WalletMeta[];
  storedMeta: WalletMeta | null;
  editingWalletId: string | null;
  editWalletLabel: string;
  onEditLabelChange: (label: string) => void;
  onStartEdit: (walletId: string, currentLabel: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (walletId: string, newLabel: string) => void;
  onSwitchWallet: (walletId: string) => void;
  onDeleteWallet: (walletId: string) => void;
}

export const ManageWallets: React.FC<ManageWalletsProps> = ({
  allWallets,
  storedMeta,
  editingWalletId,
  editWalletLabel,
  onEditLabelChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSwitchWallet,
  onDeleteWallet,
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  const copyToClipboard = (text: string, address: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };
  return (
    <div>
      <p className="text-sm mb-3" style={{ color: '#374151', fontWeight: '500' }}>
        Manage your wallets stored in your browser (created/imported with seed phrases). Switch between wallets, rename them, or delete wallets you no longer need.
      </p>
      <p className="text-xs mb-4" style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
        💡 <strong style={{ color: '#374151' }}>Note:</strong> To manage registered MC Wallets (MetaMask/external wallets), go to the "MC Wallets" section.
      </p>

      {allWallets.length > 0 ? (
        <div className="wallet-list">
          {allWallets.map((wallet) => {
            const isActive = storedMeta?.id === wallet.id;
            const isEditing = editingWalletId === wallet.id;
            
            return (
              <div
                key={wallet.id}
                className={`wallet-item ${isActive ? 'wallet-item-active' : 'wallet-item-inactive'}`}
              >
                <div className="wallet-item-header">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          className="form-input-dark flex-1 text-xs py-1"
                          value={editWalletLabel}
                          onChange={(e) => onEditLabelChange(e.target.value)}
                          autoFocus
                        />
                        <button
                          className="btn-small btn-small-yellow"
                          onClick={() => {
                            onSaveEdit(wallet.id, editWalletLabel);
                            onCancelEdit();
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="btn-small btn-small-gray"
                          onClick={onCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-bold text-white">
                            {wallet.label || `Wallet ${wallet.id.slice(-6)}`}
                            {isActive && <span className="text-sm text-yellow-400 ml-2 font-semibold">(Active)</span>}
                          </p>
                          {/* {wallet.network && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-200 font-bold border border-blue-700">
                              {wallet.network}
                            </span>
                          )} */}
                        </div>
                        <div className="flex items-center gap-2 mt-2 mb-1">
                          <p className="text-sm text-white font-mono flex-1" style={{ fontSize: '0.8125rem', wordBreak: 'break-all', fontWeight: '500' }}>
                            {wallet.address}
                          </p>
                          <button
                            className="copy-address-btn"
                            onClick={() => copyToClipboard(wallet.address, wallet.address)}
                            title="Copy address"
                          >
                            {copiedAddress === wallet.address ? '✓' : '⧉'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 mt-2">
                          Created: {new Date(wallet.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="wallet-item-actions">
                  {!isActive && (
                    <button
                      className="btn-small btn-small-yellow"
                      onClick={() => onSwitchWallet(wallet.id)}
                    >
                      Switch to this wallet
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      className="btn-small btn-small-gray"
                      onClick={() => onStartEdit(wallet.id, wallet.label || '')}
                    >
                      Rename
                    </button>
                  )}
                  <button
                    className="btn-small btn-small-red"
                    onClick={() => onDeleteWallet(wallet.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-sm mb-2" style={{ color: '#6b7280', fontWeight: '500' }}>
            No wallets created in your browser yet.
          </p>
          <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
            Wallets stored in your browser are created/imported with seed phrases and stored encrypted.
          </p>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Note: Registered MC Wallets (MetaMask/external wallets) are shown in the "MC Wallets" section.
          </p>
        </div>
      )}
    </div>
  );
};
