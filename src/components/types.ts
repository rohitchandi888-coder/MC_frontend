export type Tab = 'dashboard' | 'create' | 'import' | 'unlock' | 'send' | 'tokens' | 'wallets' | 'fdawallets' | 'metamask' | 'p2p' | 'trade-listing' | 'admin' | 'disputes' | 'history' | 'profile' | 'charts' | 'payment-methods' | 'view-phrases';

export type AuthState = {
  token: string;
  user: {
    id: number;
    fdaUserId: string | null;
    email: string | null;
    phone: string | null;
    isAdmin: boolean;

  };
};

export const AUTH_KEY = 'fda_auth';
export const DEFAULT_RPC_URL = 'https://bsc-dataseed.binance.org';
export const FDA_TOKEN_ADDRESS = '0xDBFb9e215ba9C31d87F4e0a6673f57072aCf45Ff';

export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];
