import React from 'react';
import type { Tab, AuthState } from './types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  auth: AuthState | null;
  onLogout: () => void;
  isMobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, auth, onLogout, isMobileOpen = false }) => {
  return (
    <aside id="sidebar" className={`sidebar sidebar-container ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div id="sidebar-header" className="flex items-center gap-3 mb-10 sidebar-header">
        <div className="header-logo-badge">M</div>
        <div>
          <p className="text-xs text-slate-400 mb-1">MC Wallet</p>
          <p className="text-sm font-semibold text-white">Dashboard</p>
        </div>
      </div>

      <nav className="space-y-6">
        <div>
          <p className="text-xs text-slate-300 mb-2">Wallet</p>
          <div className="space-y-1.5">
            <button className={`sidebar-nav-button ${activeTab === 'dashboard' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('dashboard')}>
              📊 Dashboard
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'create' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('create')}>
              💼 Create wallet
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'import' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('import')}>
              📥 Import wallet
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'unlock' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('unlock')}>
              🔓 Unlock wallet
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'send' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('send')}>
              📤 Send / transfer
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'tokens' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('tokens')}>
              🪙 Custom tokens
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'wallets' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('wallets')}>
              📋 Manage wallets
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'fdawallets' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('fdawallets')}>
              🔷 MC Wallets
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'history' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('history')}>
              📜 Transaction History
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'profile' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('profile')}>
              👤 Profile
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'charts' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('charts')}>
              📈 Trading Charts
            </button>
            {/* MetaMask Connect menu hidden as requested */}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-300 mb-2">P2P Trading</p>
          <div className="space-y-1.5">
            <button className={`sidebar-nav-button ${activeTab === 'p2p' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('p2p')}>
              💱 P2P Trading
            </button>
            <button className={`sidebar-nav-button ${activeTab === 'trade-listing' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('trade-listing')}>
              📊 Trade Listing
            </button>
            {auth?.user.isAdmin && (
              <>
                <button className={`sidebar-nav-button ${activeTab === 'admin' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('admin')}>
                  🛡️ Admin Panel
                </button>
                <button className={`sidebar-nav-button ${activeTab === 'disputes' ? 'sidebar-nav-button-active' : 'sidebar-nav-button-inactive'}`} onClick={() => setActiveTab('disputes')}>
                  ⚠️ Disputes
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <button id="sidebar-logout-btn" className="sidebar-logout-button" onClick={onLogout}>
        🚪 Logout
      </button>
    </aside>
  );
};
