import { AUTH_KEY, AuthState } from './components';
import { getApiUrl } from './config';
import type { EncryptedWalletData } from './walletCrypto';

const WALLETS_KEY = 'fda_wallets';
const ACTIVE_WALLET_ID_KEY = 'fda_active_wallet_id';

export type WalletNetwork = 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron';

export type WalletMeta = {
  id: string;
  address: string;
  label?: string;
  network?: WalletNetwork;
  createdAt: string;
};

export type StoredWallet = {
  meta: WalletMeta;
  encrypted: EncryptedWalletData;
};

// Migration: Convert old single wallet format to new multi-wallet format
function migrateOldWallet() {
  const oldEncrypted = localStorage.getItem('fda_encrypted_wallet');
  const oldMeta = localStorage.getItem('fda_wallet_meta');
  
  if (oldEncrypted && oldMeta) {
    try {
      const encrypted = JSON.parse(oldEncrypted) as EncryptedWalletData;
      const meta = JSON.parse(oldMeta) as { address: string };
      
      const walletId = `wallet_${Date.now()}`;
      const newWallet: StoredWallet = {
        meta: {
          id: walletId,
          address: meta.address,
          label: 'Wallet 1',
          createdAt: new Date().toISOString(),
        },
        encrypted,
      };
      
      const wallets = [newWallet];
      localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
      localStorage.setItem(ACTIVE_WALLET_ID_KEY, walletId);
      
      // Clear old keys
      localStorage.removeItem('fda_encrypted_wallet');
      localStorage.removeItem('fda_wallet_meta');
      
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function getAllWallets(): StoredWallet[] {
  // Try migration first
  migrateOldWallet();
  
  const raw = localStorage.getItem(WALLETS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredWallet[];
  } catch {
    return [];
  }
}

function saveAllWallets(wallets: StoredWallet[]) {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

export function saveEncryptedWallet(data: EncryptedWalletData, address: string, label?: string, network?: WalletNetwork): string {
  const wallets = getAllWallets();
  const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newWallet: StoredWallet = {
    meta: {
      id: walletId,
      address,
      label: label || `Wallet ${wallets.length + 1}`,
      network: network || 'BNB Chain',
      createdAt: new Date().toISOString(),
    },
    encrypted: data,
  };
  
  wallets.push(newWallet);
  saveAllWallets(wallets);
  setActiveWalletId(walletId);
  return walletId;
}

export function loadEncryptedWallet(walletId?: string): EncryptedWalletData | null {
  const wallets = getAllWallets();
  if (wallets.length === 0) return null;
  
  const id = walletId || getActiveWalletId();
  if (!id) {
    // If no active wallet, use the first one
    if (wallets.length > 0) {
      setActiveWalletId(wallets[0].meta.id);
      return wallets[0].encrypted;
    }
    return null;
  }
  
  const wallet = wallets.find((w) => w.meta.id === id);
  return wallet ? wallet.encrypted : null;
}

export function clearEncryptedWallet(walletId?: string) {
  if (walletId) {
    const wallets = getAllWallets();
    const filtered = wallets.filter((w) => w.meta.id !== walletId);
    saveAllWallets(filtered);
    
    // If we deleted the active wallet, switch to another
    if (getActiveWalletId() === walletId) {
      if (filtered.length > 0) {
        setActiveWalletId(filtered[0].meta.id);
      } else {
        localStorage.removeItem(ACTIVE_WALLET_ID_KEY);
      }
    }
  } else {
    // Clear all wallets
    localStorage.removeItem(WALLETS_KEY);
    localStorage.removeItem(ACTIVE_WALLET_ID_KEY);
  }
}

export function getAllWalletMetas(): WalletMeta[] {
  return getAllWallets().map((w) => w.meta);
}

export function getActiveWalletId(): string | null {
  return localStorage.getItem(ACTIVE_WALLET_ID_KEY);
}

export function setActiveWalletId(walletId: string) {
  localStorage.setItem(ACTIVE_WALLET_ID_KEY, walletId);
}

export function updateWalletLabel(walletId: string, label: string) {
  const wallets = getAllWallets();
  const wallet = wallets.find((w) => w.meta.id === walletId);
  if (wallet) {
    wallet.meta.label = label;
    saveAllWallets(wallets);
  }
}

export function updateWalletNetwork(walletId: string, network: WalletNetwork) {
  const wallets = getAllWallets();
  const wallet = wallets.find((w) => w.meta.id === walletId);
  if (wallet) {
    wallet.meta.network = network;
    saveAllWallets(wallets);
  }
}

export function saveWalletMeta(address: string, label?: string): string {
  // This is now handled by saveEncryptedWallet, but kept for compatibility
  // We need to find the wallet by address and update it
  const wallets = getAllWallets();
  const wallet = wallets.find((w) => w.meta.address.toLowerCase() === address.toLowerCase());
  if (wallet) {
    if (label) {
      wallet.meta.label = label;
      saveAllWallets(wallets);
    }
    return wallet.meta.id;
  }
  // If wallet doesn't exist, we can't create it without encrypted data
  // This function is mainly for backward compatibility
  return '';
}

export function loadWalletMeta(): { address: string; id: string; label?: string } | null {
  const wallets = getAllWallets();
  if (wallets.length === 0) return null;
  
  const activeId = getActiveWalletId();
  const wallet = activeId 
    ? wallets.find((w) => w.meta.id === activeId)
    : wallets[0];
  
  if (wallet) {
    if (!activeId) {
      setActiveWalletId(wallet.meta.id);
    }
    return {
      address: wallet.meta.address,
      id: wallet.meta.id,
      label: wallet.meta.label,
    };
  }
  return null;
}

export type CustomToken = {
  address: string;
  symbol: string;
  name?: string;
  enabled?: boolean; // Default to true if not specified
};

const CUSTOM_TOKENS_KEY = 'fda_custom_tokens';

// Get user-specific key for custom tokens
function getCustomTokensKey(userId?: number | null): string {
  if (userId) {
    return `${CUSTOM_TOKENS_KEY}_user_${userId}`;
  }
  // Fallback to global key for backward compatibility (will be migrated)
  return CUSTOM_TOKENS_KEY;
}

// Migrate old global tokens to user-specific storage
function migrateCustomTokens(userId: number | null) {
  if (!userId) return;
  
  const oldKey = CUSTOM_TOKENS_KEY;
  const newKey = getCustomTokensKey(userId);
  
  // Check if user already has tokens
  const userTokens = localStorage.getItem(newKey);
  if (userTokens) return; // Already migrated
  
  // Get old global tokens
  const oldTokens = localStorage.getItem(oldKey);
  if (oldTokens) {
    try {
      const tokens = JSON.parse(oldTokens) as CustomToken[];
      if (tokens.length > 0) {
        // Copy to user-specific storage
        localStorage.setItem(newKey, oldTokens);
        // Don't delete old tokens to preserve for other users during migration period
      }
    } catch {
      // Ignore parse errors
    }
  }
}

export function saveCustomTokens(tokens: CustomToken[], userId?: number | null) {
  const key = getCustomTokensKey(userId);
  localStorage.setItem(key, JSON.stringify(tokens));
}

export function loadCustomTokens(userId?: number | null): CustomToken[] {
  if (userId) {
    migrateCustomTokens(userId);
  }
  
  const key = getCustomTokensKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CustomToken[];
  } catch {
    return [];
  }
}

export function addCustomToken(token: CustomToken, userId?: number | null) {
  const tokens = loadCustomTokens(userId);
  if (tokens.find((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
    return false; // Token already exists
  }
  // Set enabled to true by default if not specified
  const newToken: CustomToken = {
    ...token,
    enabled: token.enabled !== undefined ? token.enabled : true,
  };
  tokens.push(newToken);
  saveCustomTokens(tokens, userId);
  return true;
}

export function removeCustomToken(address: string, userId?: number | null) {
  const tokens = loadCustomTokens(userId);
  const filtered = tokens.filter((t) => t.address.toLowerCase() !== address.toLowerCase());
  saveCustomTokens(filtered, userId);
  return filtered.length !== tokens.length;
}

export function toggleCustomToken(address: string, userId?: number | null) {
  const tokens = loadCustomTokens(userId);
  const token = tokens.find((t) => t.address.toLowerCase() === address.toLowerCase());
  if (token) {
    token.enabled = token.enabled === undefined ? false : !token.enabled;
    saveCustomTokens(tokens, userId);
    return true;
  }
  return false;
}



export async function setWalletAddres() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    const auth: AuthState | null = raw ? JSON.parse(raw) : null;

    if (!auth) return;

    const res = await fetch(getApiUrl("wallets"), {
      headers: { Authorization: `Bearer ${auth.token}` },
    });

    if (res.ok) {
      const data = await res.json();

      const formatted: StoredWallet[] = data.map((w: any) => ({
        meta: {
          id: w.id?.toString() || crypto.randomUUID(),
          address: w.address,
          label: w.label || "MC Wallet",
          network: w.network || "BNB Chain",
          createdAt: w.createdAt || new Date().toISOString(),
        },
        encrypted: null, 
      }));

      const userWalletsKey = `fda_wallets_user_${auth.user.id}`;

      localStorage.setItem(
        userWalletsKey,
        JSON.stringify(formatted)
      );
    }
  } catch (error: any) {
    console.log(error.message);
  }
}

