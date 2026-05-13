import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { MM } from './theme/metaMaskShell';

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

/** BSC / modern nodes may leave legacy gasPrice null — use maxFeePerGas or getGasPrice(). */
async function getEffectiveGasPriceWei(
  provider: ethers.JsonRpcProvider
): Promise<bigint> {
  const fd = await provider.getFeeData();
  const w = fd.gasPrice ?? fd.maxFeePerGas ?? fd.maxPriorityFeePerGas;
  if (w != null && w > 0n) return w;
  try {
    const legacy = await provider.getGasPrice();
    if (legacy > 0n) return legacy;
  } catch {
    /* ignore */
  }
  return 0n;
}

type NavTabGlyph = "home" | "explore" | "activity" | "profile";

/** Inline SVGs — avoids Font Awesome webfont failures (broken “image” placeholders in some browsers). */
const NavTabIcon: React.FC<{ name: NavTabGlyph }> = ({ name }) => {
  const s = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "home":
      return (
        <svg {...s} aria-hidden>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "explore":
      return (
        <svg {...s} aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "activity":
      return (
        <svg {...s} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "profile":
      return (
        <svg {...s} aria-hidden>
          <path d="M20 21a8 8 0 1 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    default:
      return null;
  }
};

const TabItem = ({
  glyph,
  label,
  active,
  onClick,
}: {
  glyph: NavTabGlyph;
  label: string;
  active: boolean;
  onClick: () => void;
}) => {
  const c = active ? MM.accent : MM.navInactive;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        flex: 1,
        minWidth: 0,
        maxWidth: 88,
        padding: "6px 2px 10px",
        color: c,
        fontSize: 10,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 22,
          width: 22,
          opacity: active ? 1 : 0.92,
          color: c,
        }}
      >
        <NavTabIcon name={glyph} />
      </span>
      <span style={{ letterSpacing: "0.02em", lineHeight: 1.1, color: c }}>
        {label}
      </span>
    </button>
  );
};
// MetaMask type declaration
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}
import {
  decryptPrivateKey,
  encryptPrivateKey,
  encryptPhrase,
  walletFromMnemonicAndExtraWord,
} from './walletCrypto';
import {
  loadEncryptedWallet,
  loadWalletMeta,
  saveEncryptedWallet,
  saveWalletMeta,
  loadCustomTokens,
  getMergedLocalCustomTokens,
  addCustomToken,
  removeCustomToken,
  toggleCustomToken,
  getAllWalletMetas,
  getActiveWalletId,
  setActiveWalletId,
  updateWalletLabel,
  updateWalletNetwork,
  clearEncryptedWallet,
  type CustomToken,
  type WalletMeta,
  type StoredWallet,
  setWalletAddres,
} from './walletStorage';
import { getApiUrl } from './config';

// Import components
import {
  Sidebar,
  TopHeader,
  MessageModal,
  AcceptOfferModal,
  PaymentModal,
  CancelOfferModal,
  ReleaseConfirmModal,
  DisputeModal,
  DashboardView,
  CreateWallet,
  ImportWallet,
  UnlockWallet,
  CustomTokens,
  ManageWallets,
  SendTransfer,
  FDAWallets,
  HoldFdaProgram,
  PaymentMethods,
  ViewPhrases,
  MetaMaskConnect,
  P2PTrading,
  TradeListing,
  AdminPanel,
  DisputesPanel,
  TransactionHistory,
  Profile,
  TradingChart,
  type Tab,
  type AuthState,
  AUTH_KEY,
  DEFAULT_RPC_URL,
  FDA_TOKEN_ADDRESS,
  ERC20_ABI
} from './components';
import MobileDashboard from './components/MobileView/Dashboard';
import WalletModal from './components/MobileView/Modal/WalletModal';
import SwapWalletModal from './components/MobileView/Modal/Swap';
import { TradeChatModal } from './components/modals/TradeChatModal';

/** When /admin/disputes omits FDA ids (older API build), fill from /admin/users using `users.id`. */
function enrichAdminDisputesFdaIds(disputes: unknown, users: unknown): any[] {
  if (!Array.isArray(disputes)) return [];
  if (!Array.isArray(users) || users.length === 0) return disputes as any[];
  const fdaById = new Map<number, string>();
  for (const u of users as any[]) {
    const id = Number(u?.id);
    const raw = u?.fda_user_id ?? u?.fdaUserId;
    if (!Number.isFinite(id) || raw == null) continue;
    const s = String(raw).trim();
    if (s) fdaById.set(id, s);
  }
  const pick = (existing: unknown, userPk: unknown) => {
    if (existing != null && String(existing).trim() !== '') return existing;
    const id = Number(userPk);
    if (!Number.isFinite(id)) return existing ?? null;
    return fdaById.get(id) ?? existing ?? null;
  };
  return (disputes as any[]).map((d) => ({
    ...d,
    buyer_fda_user_id: pick(d.buyer_fda_user_id, d.buyer_id),
    seller_fda_user_id: pick(d.seller_fda_user_id, d.seller_id),
    raised_by_fda_user_id: pick(d.raised_by_fda_user_id, d.raised_by_id),
  }));
}

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [unlockReturnTab, setUnlockReturnTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mnemonic12, setMnemonic12] = useState<string | null>(null);
  const [extraWord, setExtraWord] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletLabel, setWalletLabel] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron'>('BNB Chain');
  const [importSeed, setImportSeed] = useState('');
  const [importExtraWord, setImportExtraWord] = useState('');
  const [importWalletLabel, setImportWalletLabel] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockExtraWord, setUnlockExtraWord] = useState('');
  const [selectedUnlockWalletId, setSelectedUnlockWalletId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<'success' | 'error' | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 1024,
  );
  // Product decision: run the app in mobile shell for all users/devices.
  const useMobileLayout = true;
  const getActiveWalletAddress = (): string | null => {

    if (!auth?.user?.id) return null;

    const walletsRaw = localStorage.getItem(
      `fda_wallets_user_${auth.user.id}`
    );

    if (!walletsRaw) return null;

    const wallets = JSON.parse(walletsRaw);

    if (!Array.isArray(wallets) || wallets.length === 0)
      return null;


    // try active wallet id first
    const activeId = localStorage.getItem("fda_active_wallet_id");

    if (activeId) {

      const activeWallet = wallets.find(
        (w: any) =>
          String(w?.meta?.id) === String(activeId)
      );

      if (activeWallet?.meta?.address)
        return activeWallet.meta.address;
    }


    // ✅ fallback → use first wallet in array
    return wallets[0]?.meta?.address || null;
  };

  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const parsed = raw ? (JSON.parse(raw) as AuthState) : null;
      return parsed;
    } catch {
      return null;
    }
  });
  const [offers, setOffers] = useState<any[]>([]);
  const [myTrades, setMyTrades] = useState<any[]>([]);
  const [adminTrades, setAdminTrades] = useState<any[]>([]);
  const [adminDisputes, setAdminDisputes] = useState<any[]>([]);
  const [p2pFeeRate, setP2pFeeRate] = useState<number>(1);
  const [p2pMinPricePerFda, setP2pMinPricePerFda] = useState<number>(1);
  const [p2pMinPricePerFdaUsdt, setP2pMinPricePerFdaUsdt] = useState<number>(1);
  const [editingFeeRate, setEditingFeeRate] = useState(false);
  const [newFeeRate, setNewFeeRate] = useState<string>('1');
  const [updatingFeeRate, setUpdatingFeeRate] = useState(false);
  const [holdingFdaAmount, setHoldingFdaAmount] = useState<string>('0');
  const [editingHoldingFda, setEditingHoldingFda] = useState(false);
  const [newHoldingFda, setNewHoldingFda] = useState<string>('0');
  const [updatingHoldingFda, setUpdatingHoldingFda] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loadingMyTrades, setLoadingMyTrades] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState<number | null>(null);
  const [markingAsPaid, setMarkingAsPaid] = useState<number | null>(null);
  const [releasingTokens, setReleasingTokens] = useState<number | null>(null);

  // Offer acceptance modal
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [acceptAmount, setAcceptAmount] = useState('');

  // Payment screenshot upload
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTradeForPayment, setSelectedTradeForPayment] = useState<any | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // Cancel offer confirmation modal
  const [showCancelOfferModal, setShowCancelOfferModal] = useState(false);
  const [selectedOfferToCancel, setSelectedOfferToCancel] = useState<any | null>(null);

  // Release tokens confirmation modal
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [selectedTradeToRelease, setSelectedTradeToRelease] = useState<any | null>(null);

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedTradeToDispute, setSelectedTradeToDispute] = useState<any | null>(null);
  const [showTradeChatModal, setShowTradeChatModal] = useState(false);
  const [selectedTradeForChat, setSelectedTradeForChat] = useState<any | null>(null);

  // Offers pagination and filters
  const [offersPage, setOffersPage] = useState(1);
  const [offersPerPage] = useState(12);
  const [offersSearch, setOffersSearch] = useState('');
  // Only show SELL offers - removed BUY filter option
  const [offersFilterType, setOffersFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [cancellingTrade, setCancellingTrade] = useState<number | null>(null);
  const [cancellingOffer, setCancellingOffer] = useState<number | null>(null);
  const [disputingTrade, setDisputingTrade] = useState<number | null>(null);

  // P2P Offer creation state
  // Default to BUY to avoid accidental balance checks
  const [offerType, setOfferType] = useState<'BUY' | 'SELL'>('BUY');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerFiatCurrency, setOfferFiatCurrency] = useState('INR');
  const [offerMinLimit, setOfferMinLimit] = useState('');
  const [offerMaxLimit, setOfferMaxLimit] = useState('');
  const [offerPaymentMethods, setOfferPaymentMethods] = useState('');
  /** Saved BEP20 address for USDT-priced P2P offers (from GET /auth/profile). */
  const [p2pUsdtPayoutAddress, setP2pUsdtPayoutAddress] = useState('');
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [addFdaAmount, setAddFdaAmount] = useState('');
  const [addingFdaBalance, setAddingFdaBalance] = useState(false);

  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [assetType, setAssetType] = useState<'native' | 'token'>('native');
  const [tokenAddress, setTokenAddress] = useState(FDA_TOKEN_ADDRESS);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);
  /** Bumped when wallet unlock state changes so gas re-estimates (ref alone does not re-run effects). */
  const [walletUnlockEpoch, setWalletUnlockEpoch] = useState(0);

  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [fdaBalance, setFdaBalance] = useState<string | null>(null);
  const [internalFdaBalance, setInternalFdaBalance] = useState<number | null>(null);
  const [internalFdaLocked, setInternalFdaLocked] = useState<number | null>(null);
  const [internalFdaHolding, setInternalFdaHolding] = useState<number | null>(null);
  const [internalFdaUsable, setInternalFdaUsable] = useState<number | null>(null);
  const [customTokenBalances, setCustomTokenBalances] = useState<Record<string, string>>({});
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [checkAddress, setCheckAddress] = useState('');
  const [transferType, setTransferType] = useState<'internal' | 'onchain'>('internal');
  /** When true, mobile Send skips the token picker (asset already chosen from home row). */
  const [sendSkipAssetPickerStep, setSendSkipAssetPickerStep] = useState(false);
  const [recipientFdaWallet, setRecipientFdaWallet] = useState<any>(null);

  const [registeredFdaWallets, setRegisteredFdaWallets] = useState<any[]>([]);
  const [newFdaWalletAddress, setNewFdaWalletAddress] = useState('');
  const [newFdaWalletLabel, setNewFdaWalletLabel] = useState('');
  const [registeringWallet, setRegisteringWallet] = useState(false);

  // const [customTokens, setCustomTokens] = useState<CustomToken[]>(loadCustomTokens(auth?.user.id));
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [newTokenSymbol, setNewTokenSymbol] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [tokenInfoLoading, setTokenInfoLoading] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editWalletLabel, setEditWalletLabel] = useState('');

  // MetaMask connection
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [connectingMetaMask, setConnectingMetaMask] = useState(false);
  const [metamaskAccounts, setMetamaskAccounts] = useState<string[]>([]);
  const [showMetamaskAccountSelector, setShowMetamaskAccountSelector] = useState(false);
  const [fdaPrivateKey, setFdaPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [fdaPrice, setFdaPrice] = useState(null);
  
  // for the customer token to mobile view that can show to 
    const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  
  const unlockedPrivateKeyRef = useRef<string | null>(null);
  /** Avoid multiple redirects when several API calls return 401 together. */
  const authFailureHandledRef = useRef(false);
  /** Prevent duplicate auto wallet-registration in StrictMode/re-renders. */
  const autoRegisterKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const openUnlockTab = useCallback((returnTab?: Tab) => {
    setUnlockReturnTab(returnTab || activeTab);
    setActiveTab('unlock');
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'unlock') return;
    if (activeTab !== 'send') setSendSkipAssetPickerStep(false);
  }, [activeTab]);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);

      if (!raw) {
        setAuth(null);
        navigate('/login', { replace: true });
        return;
      }

      const parsed: AuthState = JSON.parse(raw);

      // ensure valid user + token exist
      if (!parsed?.token || !parsed?.user?.id) {
        localStorage.removeItem(AUTH_KEY);
        setAuth(null);
        navigate('/login', { replace: true });
        return;
      }

      // keep your existing state in sync
      setAuth(parsed);

    } catch (err) {
      console.error("Auth parse error:", err);
      localStorage.removeItem(AUTH_KEY);
      setAuth(null);
      navigate('/login', { replace: true });
    } finally {
      setAuthChecked(true);
    }
  }, [navigate]);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Get user-specific wallets from localStorage
  const getUserWallets = (): WalletMeta[] => {
    if (!auth) return [];
    const userWalletsKey = `fda_wallets_user_${auth.user.id}`;
    const raw = localStorage.getItem(userWalletsKey);
    if (!raw) return [];
    try {
      // const wallets = JSON.parse(raw) as StoredWallet[];
      // return wallets.map(w => w.meta);
      const wallets = JSON.parse(raw);
      return wallets.map((w: any) =>
        w.meta
          ? w.meta
          : {
            id: w.id?.toString(),
            address: w.address,
            label: w.label,
            network: w.network || "BNB Chain",
            createdAt: w.createdAt || new Date().toISOString(),
          }
      );
    } catch {
      return [];
    }
  };

  const [allWallets, setAllWallets] = useState<WalletMeta[]>(getUserWallets());
  const storedMeta = useMemo(() => {
    if (!auth) return null;
    const userWallets = getUserWallets();
    const activeId = getActiveWalletId();
    const wallet = activeId
      ? userWallets.find(w => w.id === activeId)
      : userWallets[0];
    return wallet || null;
  }, [allWallets, auth]);

  // Get all user wallet addresses for transaction history
  const userWalletAddresses = useMemo(() => {
    const addresses: string[] = [];

    // Add addresses from registered MC wallets
    registeredFdaWallets.forEach((wallet: any) => {
      if (wallet.address) {
        addresses.push(wallet.address.toLowerCase());
      }
    });

    // Add addresses from local wallets
    const localWallets = getUserWallets();
    localWallets.forEach((wallet) => {
      if (wallet.address) {
        addresses.push(wallet.address.toLowerCase());
      }
    });

    // Remove duplicates
    return [...new Set(addresses)];
  }, [registeredFdaWallets, allWallets, auth]);

  const refreshWallets = () => {
    setAllWallets(getUserWallets());
  };

  // Empty Inputs
  useEffect(() => {

    setUnlockExtraWord("");
    setUnlockPassword("");

  }, [activeTab]);
  // Update wallets when user changes
  useEffect(() => {
    if (auth) {
      setAllWallets(getUserWallets());
    } else {
      setAllWallets([]);
    }
  }, [auth]);
  useEffect(() => {
    if (auth) {
      setWalletAddres().then(() => {
        refreshWallets();
      });
    }
  }, [auth]);

  // Set default selected wallet for unlock when wallets change
  useEffect(() => {
    if (allWallets.length > 0 && !selectedUnlockWalletId) {
      const activeId = getActiveWalletId();
      setSelectedUnlockWalletId(activeId || allWallets[0].id);
    } else if (allWallets.length === 0) {
      setSelectedUnlockWalletId('');
    }
  }, [allWallets, selectedUnlockWalletId]);

  const fetchBalances = async (address: string, apiTokensOverride?: CustomToken[]) => {
    if (!address || !ethers.isAddress(address)) return;

    // Check if address belongs to user's own wallets
    const isOwnWallet = allWallets.some(w => w.address.toLowerCase() === address.toLowerCase()) ||
      registeredFdaWallets.some((w: any) => w.address.toLowerCase() === address.toLowerCase());

    if (!isOwnWallet) {
      showErrorModal('⚠️ You can only check balance for your own wallets. Please select a wallet from your wallet list.');
      setCheckAddress('');
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);

      // Fetch native balance
      const nativeBal = await provider.getBalance(address);
      setNativeBalance(ethers.formatEther(nativeBal));

      // Fetch FDA token balance
      try {
        const tokenContract = new ethers.Contract(FDA_TOKEN_ADDRESS, ERC20_ABI, provider);
        const decimals = await tokenContract.decimals();
        const tokenBal = await tokenContract.balanceOf(address);
        setFdaBalance(ethers.formatUnits(tokenBal, decimals));
      } catch (err) {
        console.error('Failed to fetch FDA balance:', err);
        setFdaBalance('Error');
      }

      // Custom tokens: localStorage (global + per-user) AND React list (API), so API-only tokens (e.g. JW) get balanceOf.
      const tokenMap = new Map<string, CustomToken>();
      for (const t of getMergedLocalCustomTokens(auth?.user.id)) {
        tokenMap.set(t.address.toLowerCase(), t);
      }
      for (const t of customTokens) {
        tokenMap.set(t.address.toLowerCase(), t);
      }
      if (apiTokensOverride?.length) {
        for (const t of apiTokensOverride) {
          tokenMap.set(t.address.toLowerCase(), t);
        }
      }
      const tokens = Array.from(tokenMap.values());

      const balances: Record<string, string> = {};
      for (const token of tokens) {
        const rawAddress = String(token.address || '').trim();
        const key = rawAddress.toLowerCase();
        if (!rawAddress || !ethers.isAddress(rawAddress)) {
          // Skip non-EVM / malformed addresses (e.g. Solana/Tron style) on EVM provider.
          balances[key] = 'N/A';
          continue;
        }
        try {
          const code = await provider.getCode(rawAddress);
          if (!code || code === '0x') {
            // Address exists in UI list but no contract deployed on this chain.
            balances[key] = 'N/A';
            continue;
          }
          const tokenContract = new ethers.Contract(rawAddress, ERC20_ABI, provider);
          const decimals = await tokenContract.decimals();
          const tokenBal = await tokenContract.balanceOf(address);
          balances[key] = ethers.formatUnits(tokenBal, decimals);
        } catch (err) {
          console.warn(`Skipped balance fetch for ${token.symbol || rawAddress}:`, err);
          balances[key] = 'Error';
        }
      }
      setCustomTokenBalances(balances);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setNativeBalance('Error');
      setFdaBalance('Error');
    } finally {
      setBalanceLoading(false);
    }
  };

  const showErrorModal = (errorMessage: string) => {
    setMessage(errorMessage);
    setMessageVariant('error');
    setShowMessageModal(true);
  };

  const showSuccessModal = (successMessage: string) => {
    setMessage(successMessage);
    setMessageVariant('success');
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setMessage(null);
    setMessageVariant(null);
  };

  /** JWT rejected by API (expired, rotated, or invalid) — clear session and go to login. */
  const onUnauthorizedApi = useCallback(() => {
    if (authFailureHandledRef.current) return;
    authFailureHandledRef.current = true;
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    setAuth(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (auth?.token) authFailureHandledRef.current = false;
  }, [auth?.token]);

  const fetchInternalBalance = async (walletAddress?: string) => {
    if (!auth) {
      console.warn('[fetchInternalBalance] No auth available');
      return;
    }

    // Use provided wallet address or get from storedMeta
    const address = walletAddress || storedMeta?.address;
    if (!address) {
      console.warn('[fetchInternalBalance] No wallet address available. storedMeta:', storedMeta);
      // Set balance to null if no wallet is selected
      setInternalFdaBalance(null);
      setInternalFdaLocked(null);
      setInternalFdaHolding(null);
      setInternalFdaUsable(null);
      return;
    }

    try {
      const url = getApiUrl(`internal/balance?wallet_address=${encodeURIComponent(address)}`);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.status === 401) {
        onUnauthorizedApi();
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('[fetchInternalBalance] Error response:', res.status, errorData);
        return;
      }

      const data = await res.json();
      setInternalFdaBalance(data.available !== undefined ? data.available : data.balance);
      setInternalFdaLocked(data.locked !== undefined ? data.locked : 0);
      setInternalFdaHolding(data.holding !== undefined ? data.holding : 0);
      setInternalFdaUsable(data.usable !== undefined ? data.usable : (data.available || data.balance));
    } catch (err) {
      console.error('[fetchInternalBalance] Failed to fetch internal balance:', err);
    }
  };

  const registerWalletAddress = async (address: string, label?: string, encryptedData?: any, network?: string, password?: string) => {
    if (!auth) {
      console.error('[registerWalletAddress] ❌ No auth available');
      return false;
    }
    try {
      console.log('[registerWalletAddress] 📤 Sending registration request:', {
        address,
        label,
        hasEncryptedData: !!encryptedData,
        network,
        encryptedDataType: encryptedData ? typeof encryptedData : 'none',
        encryptedDataKeys: encryptedData && typeof encryptedData === 'object' ? Object.keys(encryptedData) : [],
      });
      const res = await fetch(getApiUrl('wallets/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ address, label, encryptedData, network, password }),
      });

      if (res.status === 401) {
        console.warn('[registerWalletAddress] Unauthorized (401). Forcing sign-out flow.');
        onUnauthorizedApi();
        return false;
      }

      if (res.ok) {
        const data = await res.json();
        console.log('[registerWalletAddress] ✅ Registration successful:', {
          walletId: data.wallet?.id,
          hasEncryptedData: !!data.wallet?.encrypted_data,
          encryptedDataLength: data.wallet?.encrypted_data ? (typeof data.wallet.encrypted_data === 'string' ? data.wallet.encrypted_data.length : 'object') : 0,
        });
        return true;
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[registerWalletAddress] ❌ Registration failed:', res.status, errorData);
        throw new Error(errorData.error || `Registration failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.error('[registerWalletAddress] ❌ Exception during registration:', err);
      throw err; // Re-throw to let caller handle
    }
  };

  const checkIfFdaWallet = async (address: string) => {
    if (!auth) return null;
    try {
      const res = await fetch(getApiUrl(`internal/user-by-address?address=${address}`), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.found === false || data?.isRegisteredMcWallet === false) return null;
        return data;
      }
      if (res.status === 404) return null;
    } catch (err) {
      console.error('Failed to check MC wallet:', err);
    }
    return null;
  };

  // Get MetaMask accounts (without opening popup)
  const getMetamaskAccounts = async () => {
    if (typeof window.ethereum === 'undefined') {
      showErrorModal('⚠️ MetaMask is not installed. Please install MetaMask extension.');
      return;
    }

    try {
      // Get accounts without requesting permission (no popup)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setMetamaskAccounts(accounts);
        setShowMetamaskAccountSelector(true);
      } else {
        // No accounts connected, need to request access (this will open popup)
        await connectMetaMask();
      }
    } catch (err: any) {
      console.error('Get MetaMask accounts error:', err);
      showErrorModal('⚠️ Failed to get MetaMask accounts. Please try again.');
    }
  };

  // Connect to specific MetaMask account
  const connectToMetamaskAccount = async (address: string) => {
    if (typeof window.ethereum === 'undefined') {
      showErrorModal('⚠️ MetaMask is not installed.');
      return;
    }

    try {
      setConnectingMetaMask(true);

      // First check if account is already connected (no popup)
      const connectedAccounts = await window.ethereum.request({ method: 'eth_accounts' });

      if (connectedAccounts && connectedAccounts.includes(address)) {
        // Account is already connected, use it directly without popup
        setMetamaskAddress(address);
        setMetamaskConnected(true);
        setShowMetamaskAccountSelector(false);
        showSuccessModal(`✅ MetaMask connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

        // Check if this address is already registered as MC wallet
        if (auth) {
          const fdaWallet = await checkIfFdaWallet(address);
          if (!fdaWallet) {
            showSuccessModal(`✅ MetaMask connected. You can register this address as an MC wallet below.`);
          } else {
            showSuccessModal(`✅ MetaMask connected. This address is already registered as an MC wallet.`);
          }
        }
        return;
      }

      // Account is not connected, need to request access (this will open popup)
      // But first, check if user needs to switch accounts in MetaMask
      if (connectedAccounts && connectedAccounts.length > 0) {
        // User has accounts connected but not the selected one
        // They need to switch to this account in MetaMask first
        showErrorModal(`⚠️ Account ${address.slice(0, 6)}...${address.slice(-4)} is not the active account in MetaMask. Please switch to this account in MetaMask extension first, then try again.`);
        return;
      }

      // No accounts connected at all, request access (will open popup)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        showErrorModal('⚠️ No MetaMask accounts found. Please add an account in MetaMask.');
        return;
      }

      // Check if the selected account is in the list
      if (!accounts.includes(address)) {
        showErrorModal(`⚠️ Account ${address.slice(0, 6)}...${address.slice(-4)} was not connected. Please switch to this account in MetaMask and try again.`);
        return;
      }

      // Set the selected account
      setMetamaskAddress(address);
      setMetamaskConnected(true);
      setShowMetamaskAccountSelector(false);
      showSuccessModal(`✅ MetaMask connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

      // Check if this address is already registered as MC wallet
      if (auth) {
        const fdaWallet = await checkIfFdaWallet(address);
        if (!fdaWallet) {
          showSuccessModal(`✅ MetaMask connected. You can register this address as an MC wallet below.`);
        } else {
          showSuccessModal(`✅ MetaMask connected. This address is already registered as an MC wallet.`);
        }
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err);
      showErrorModal(`⚠️ Failed to connect MetaMask: ${err.message || 'User rejected the request'}`);
    } finally {
      setConnectingMetaMask(false);
    }
  };

  // Connect MetaMask to MC Wallet (original function - now calls account selector)
  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      showErrorModal('⚠️ MetaMask is not installed. Please install MetaMask extension.');
      return;
    }

    try {
      setConnectingMetaMask(true);
      // Request account access (will open popup)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        if (accounts.length === 1) {
          // Only one account, connect directly
          await connectToMetamaskAccount(accounts[0]);
        } else {
          // Multiple accounts, show selector
          setMetamaskAccounts(accounts);
          setShowMetamaskAccountSelector(true);
        }
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err);
      showErrorModal(`⚠️ Failed to connect MetaMask: ${err.message || 'User rejected the request'}`);
    } finally {
      setConnectingMetaMask(false);
    }
  };

  // Register MetaMask address as MC wallet
  const registerMetaMaskAsFdaWallet = async () => {
    if (!metamaskAddress || !auth) {
      showErrorModal('⚠️ Please connect MetaMask first and ensure you are logged in.');
      return;
    }

    try {
      setRegisteringWallet(true);
      const label = `MetaMask: ${metamaskAddress.slice(0, 6)}...${metamaskAddress.slice(-4)}`;
      const success = await registerRecipientWallet(metamaskAddress, label);
      if (success) {
        showSuccessModal(`✅ MetaMask address registered as MC wallet!`);
        await loadRegisteredFdaWallets();
      } else {
        showErrorModal('⚠️ Failed to register MetaMask address. It may already be registered.');
      }
    } catch (err) {
      console.error('Register MetaMask error:', err);
      showErrorModal('⚠️ Failed to register MetaMask address.');
    } finally {
      setRegisteringWallet(false);
    }
  };

  // Export MC Wallet to MetaMask (show private key for import)
  const exportFdaWalletToMetaMask = async () => {
    if (!storedMeta) {
      showErrorModal('⚠️ No wallet loaded. Please create or import a wallet first.');
      return;
    }

    if (!unlockedPrivateKeyRef.current) {
      showErrorModal('⚠️ Please unlock your MC wallet first in the "Unlock wallet" tab.');
      return;
    }

    try {
      const privateKey = unlockedPrivateKeyRef.current;
      setFdaPrivateKey(privateKey);
      setShowPrivateKey(true);
      showErrorModal('⚠️ Your private key is shown below. Import it to MetaMask carefully. Keep it secret!');
    } catch (err) {
      console.error('Export wallet error:', err);
      showErrorModal('⚠️ Failed to export wallet. Please try again.');
    }
  };

  const fetchRegisteredFdaWallets = async () => {
    if (!auth) return;
    try {
      const res = await fetch(getApiUrl('wallets'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.status === 401) {
        onUnauthorizedApi();
        return;
      }

      if (!res.ok) {
        console.error('[Dashboard] Failed to fetch wallets, status:', res.status);
        return;
      }

      const data = await res.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setRegisteredFdaWallets(data);
        // Restore encrypted wallets from database to local storage
        await restoreEncryptedWalletsFromDatabase(data);
        // After fetching registered wallets, try to restore wallets from database
        await restoreWalletsFromDatabase(data);
      } else {
        console.error('[Dashboard] Wallets data is not an array:', data);
        setRegisteredFdaWallets([]);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch registered wallets:', err);
      setRegisteredFdaWallets([]);
    }
  };

  // Restore encrypted wallets from database to local storage
  const restoreEncryptedWalletsFromDatabase = async (registeredWallets: any[]) => {
    if (!auth) return;

    const localWallets = getUserWallets();
    const localAddresses = new Set(localWallets.map(w => w.address.toLowerCase()));

    // Find wallets with encrypted_data in database but not in local storage
    const walletsToRestore = registeredWallets.filter((wallet: any) => {
      // Parse encrypted_data if it's a JSON string
      let encryptedData = wallet.encrypted_data;
      if (encryptedData && typeof encryptedData === 'string') {
        try {
          encryptedData = JSON.parse(encryptedData);
        } catch {
          // If parsing fails, it might be a plain string or invalid JSON
          encryptedData = null;
        }
      }
      const hasEncryptedData = encryptedData && encryptedData !== 'null' && encryptedData !== null;
      const hasLocalData = localAddresses.has(wallet.address?.toLowerCase() || '');
      return hasEncryptedData && !hasLocalData;
    });

    if (walletsToRestore.length > 0) {
      const userWalletsKey = `fda_wallets_user_${auth.user.id}`;
      const raw = localStorage.getItem(userWalletsKey);
      let userWallets = raw ? JSON.parse(raw) : [];

      for (const wallet of walletsToRestore) {
        try {
          const encryptedData = typeof wallet.encrypted_data === 'string'
            ? JSON.parse(wallet.encrypted_data)
            : wallet.encrypted_data;

          if (encryptedData && encryptedData.address) {
            // Use database ID as wallet ID to ensure consistency
            const walletId = wallet.id?.toString() || `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const walletMeta = {
              id: walletId,
              address: wallet.address,
              label: wallet.label || `Wallet ${walletId.slice(-6)}`,
              network: wallet.network || 'BNB Chain',
              createdAt: wallet.created_at || new Date().toISOString(),
            };

            const storedWallet = {
              meta: walletMeta,
              encrypted: encryptedData,
            };

            // Check if wallet already exists in userWallets (by address or ID)
            const existingIndex = userWallets.findIndex((w: any) =>
              w.meta.address?.toLowerCase() === wallet.address?.toLowerCase() ||
              w.meta.id === walletId
            );

            if (existingIndex >= 0) {
              // Update existing wallet (preserve database ID)
              userWallets[existingIndex] = storedWallet;
            } else {
              // Add new wallet
              userWallets.push(storedWallet);
            }
          }
        } catch (err) {
          console.error('[Restore Encrypted Wallets] Error restoring wallet:', wallet.address, err);
        }
      }

      // Save updated wallets to localStorage
      localStorage.setItem(userWalletsKey, JSON.stringify(userWallets));
      refreshWallets();

      if (walletsToRestore.length > 0) {
        console.log(`[Restore Encrypted Wallets] ✅ Restored ${walletsToRestore.length} wallet(s) from database`);
      }
    }
  };

  // Restore wallets from database phrases after login
  const restoreWalletsFromDatabase = async (registeredWallets: any[]) => {
    if (!auth) return;

    try {
      // Fetch saved phrases from database
      const phrasesRes = await fetch(getApiUrl('wallets/phrases'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!phrasesRes.ok) {
        return; // No phrases or error, skip restoration
      }

      const phrasesData = await phrasesRes.json();
      const savedPhrases = phrasesData.phrases || [];

      if (savedPhrases.length === 0) {
        return; // No saved phrases
      }

      // Get current local wallets
      const localWallets = getUserWallets();
      const localAddresses = new Set(localWallets.map(w => w.address.toLowerCase()));

      // Find registered wallets that have saved phrases but no local encrypted data
      const walletsToRestore = registeredWallets.filter((regWallet: any) => {
        const hasPhrase = savedPhrases.some(
          (phrase: any) => phrase.wallet_address?.toLowerCase() === regWallet.address?.toLowerCase()
        );
        const hasLocalData = localAddresses.has(regWallet.address?.toLowerCase() || '');
        return hasPhrase && !hasLocalData;
      });

      if (walletsToRestore.length > 0) {
        // Show notification that wallets can be restored
        // The actual restoration will happen when user tries to unlock with password
        console.log(`[Wallet Restoration] Found ${walletsToRestore.length} wallet(s) that can be restored from database`);
      }
    } catch (err) {
      console.error('[Wallet Restoration] Failed to check for restorable wallets:', err);
    }
  };

  const registerRecipientWallet = async (address: string, label?: string) => {
    if (!auth) {
      showErrorModal('⚠️ Please login to register wallet addresses.');
      return false;
    }
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      showErrorModal('⚠️ Please enter a wallet address.');
      return false;
    }

    // Validate address format (Ethereum/EVM or Solana)
    const isEthereumAddress = ethers.isAddress(trimmedAddress);
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress); // Solana addresses are base58 encoded, 32-44 chars
    const isBitcoinAddress = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmedAddress);
    const isTronAddress = /^T[A-Za-z1-9]{33}$/.test(trimmedAddress);

    if (!isEthereumAddress && !isSolanaAddress && !isBitcoinAddress && !isTronAddress) {
      showErrorModal('⚠️ Please enter a valid wallet address (Ethereum, Solana, Bitcoin, or Tron format).');
      return false;
    }

    try {
      setRegisteringWallet(true);
      const res = await fetch(getApiUrl('wallets/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          address: address.trim(),
          label: label || `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || 'Failed to register wallet address.'}`);
        return false;
      }

      showSuccessModal(`✅ Wallet address registered successfully! You can now use internal transfers.`);
      // Re-check if it's now an MC wallet
      const info = await checkIfFdaWallet(address.trim());
      setRecipientFdaWallet(info);
      if (info) {
        setTransferType('internal');
      }
      // Refresh registered wallets list
      await fetchRegisteredFdaWallets();
      return true;
    } catch (err: any) {
      console.error('Failed to register wallet:', err);
      showErrorModal(`⚠️ Failed to register wallet address: ${err.message || 'Please try again.'}`);
      return false;
    } finally {
      setRegisteringWallet(false);
    }
  };

  const handleCreateAndRegisterFdaWallet = async () => {
    if (!auth) {
      showErrorModal('⚠️ Please login to create MC wallets.');
      return;
    }

    try {
      setRegisteringWallet(true);

      // Generate a new wallet
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address;

      // Register it with the backend
      const res = await fetch(getApiUrl('wallets/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          address: address,
          label: newFdaWalletLabel.trim() || `MC Wallet ${address.slice(0, 6)}...${address.slice(-4)}`
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || 'Failed to register new wallet.'}`);
        return;
      }

      showSuccessModal(`✅ New MC wallet created and registered! Address: ${address}`);
      setNewFdaWalletAddress('');
      setNewFdaWalletLabel('');
      await fetchRegisteredFdaWallets();
    } catch (err: any) {
      console.error('Failed to create MC wallet:', err);
      showErrorModal(`⚠️ Failed to create MC wallet: ${err.message || 'Please try again.'}`);
    } finally {
      setRegisteringWallet(false);
    }
  };

  useEffect(() => {
    if (storedMeta?.address) {
      fetchBalances(storedMeta.address);
      if (auth) {
        fetchInternalBalance(storedMeta.address); // Pass wallet address explicitly
        // Register wallet address once per (user,address) pair to avoid duplicate calls.
        const registerKey = `${auth.user.id}:${storedMeta.address.toLowerCase()}`;
        if (autoRegisterKeyRef.current !== registerKey) {
          autoRegisterKeyRef.current = registerKey;
          registerWalletAddress(storedMeta.address, storedMeta.label).catch((err) => {
            console.error('[registerWalletAddress] Auto-register failed:', err);
          });
        }
        // Fetch P2P fee rate on login/load
        fetchP2PFeeRate();
        fetchP2PMinOfferAmount();
      }
    }
  }, [storedMeta?.address, auth]);

  useEffect(() => {
    if (!auth?.token) autoRegisterKeyRef.current = null;
  }, [auth?.token]);

  useEffect(() => {
    if (activeTab === 'wallets') {
      refreshWallets();
    }
    if (activeTab === 'fdawallets' && auth) {
      fetchRegisteredFdaWallets();
    }
    if (activeTab === 'p2p' || activeTab === 'trade-listing') {
      fetchP2PFeeRate();
      fetchP2PMinOfferAmount();
    }
  }, [activeTab, auth]);

  const fetchP2PFeeRate = async () => {
    try {
      const res = await fetch(getApiUrl('settings/p2p-fee-rate'));
      if (res.ok) {
        const data = await res.json();
        // Handle 0 as valid value (don't use || which treats 0 as falsy)
        const feeRate = data.feeRate !== undefined ? data.feeRate : (data.feeRatePercent !== undefined ? data.feeRatePercent : 0);
        setP2pFeeRate(feeRate);
      } else {
        console.error('Failed to fetch fee rate:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch fee rate:', err);
      // Keep default 1% if fetch fails
    }
  };

  const fetchP2PMinOfferAmount = async () => {
    try {
      const res = await fetch(getApiUrl('settings/min-price-per-fda'));
      if (!res.ok) return;
      const data = await res.json();
      const minAmount = Number(data?.minPricePerFda ?? data?.minOfferAmount ?? 1);
      if (Number.isFinite(minAmount) && minAmount > 0) {
        setP2pMinPricePerFda(minAmount);
      }
      const minUsdt = Number(data?.minPricePerFdaUsdt ?? 1);
      if (Number.isFinite(minUsdt) && minUsdt > 0) {
        setP2pMinPricePerFdaUsdt(minUsdt);
      }
    } catch (err) {
      console.error('Failed to fetch minimum offer amount:', err);
    }
  };

  // Refresh user profile to get latest admin status
  const refreshUserProfile = async () => {
    const currentAuth = auth;
    if (!currentAuth || !currentAuth.token) {
      console.warn('⚠️ Cannot refresh profile: no auth token');
      return;
    }

    try {
      const res = await fetch(getApiUrl('auth/profile'), {
        headers: {
          Authorization: `Bearer ${currentAuth.token}`,
        },
      });

      if (res.status === 401) {
        onUnauthorizedApi();
        return;
      }

      if (res.ok) {
        const profileData = await res.json();
        const usdtRaw = profileData.p2p_usdt_payout_address;
        setP2pUsdtPayoutAddress(
          typeof usdtRaw === 'string' && usdtRaw.trim() ? usdtRaw.trim() : '',
        );
        // Update auth state with latest profile data
        const updatedAuth = {
          ...currentAuth,
          user: {
            ...currentAuth.user,
            email: profileData.email,
            phone: profileData.phone,
            fullName: profileData.full_name,
            isAdmin: !!profileData.is_admin, // Update admin status - ensure boolean
          },
        };
        setAuth(updatedAuth);
        // Update localStorage
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedAuth));
      } else {
        const errorText = await res.text();
        console.error('❌ Failed to refresh profile. Status:', res.status, 'Response:', errorText);
      }
    } catch (err) {
      console.error('❌ Failed to refresh profile:', err);
    }
  };

  // Fetch fee rate on initial load if user is logged in
  useEffect(() => {
    if (auth) {
      fetchP2PFeeRate();
      fetchP2PMinOfferAmount();
      // Reload custom tokens for the logged-in user
      setCustomTokens(loadCustomTokens(auth.user.id));
      // Refresh user profile to get latest admin status on mount
      refreshUserProfile();
      // Fetch registered wallets (which will also trigger restoration check)
      fetchRegisteredFdaWallets();
    } else {
      // Clear tokens when logged out
      setCustomTokens([]);
      setRegisteredFdaWallets([]);
    }
  }, [auth?.token]); // Only run when token changes, not on every auth change

  // Also refresh profile on initial mount to ensure admin status is up to date
  useEffect(() => {
    if (auth && auth.token) {
      refreshUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - refreshUserProfile uses current auth from closure

  // Auto-calculate Min Limit and Max Limit based on Amount and Price (same for INR and USDT)
  useEffect(() => {
    if (!offerAmount?.trim() || !String(offerPrice).trim()) {
      setOfferMinLimit('');
      setOfferMaxLimit('');
      return;
    }
    const amount = Number(offerAmount);
    const price = Number(offerPrice);
    if (!Number.isFinite(amount) || !Number.isFinite(price) || amount <= 0 || price <= 0) {
      setOfferMinLimit('');
      setOfferMaxLimit('');
      return;
    }
    // Min limit = value of 1 FDA at this price; max = full offer notional
    setOfferMinLimit(price.toFixed(2));
    setOfferMaxLimit((amount * price).toFixed(2));
  }, [offerAmount, offerPrice]);

  // Check if recipient is MC wallet
  useEffect(() => {
    if (activeTab === 'send' && sendTo.trim() && ethers.isAddress(sendTo.trim()) && auth && assetType === 'token' && tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()) {
      const timer = setTimeout(async () => {
        const info = await checkIfFdaWallet(sendTo.trim());
        setRecipientFdaWallet(info);
        if (info && transferType === 'onchain') {
          setTransferType('internal'); // Auto-switch to internal if MC wallet detected
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRecipientFdaWallet(null);
    }
  }, [sendTo, assetType, tokenAddress, activeTab, auth]);

  useEffect(() => {
    if (activeTab === 'p2p' && auth) {
      // Only load trades and balance for P2P Trading tab (for creating offers)
      loadMyTrades();
      if (storedMeta?.address) {
        fetchInternalBalance(storedMeta.address); // Pass wallet address explicitly
      }
    }
    if (activeTab === 'trade-listing' && auth) {
      // Load offers, trades, and balance for Trade Listing tab
      loadOffers();
      loadMyTrades();
      if (storedMeta?.address) {
        fetchInternalBalance(storedMeta.address); // Pass wallet address explicitly
      }
    }
    if ((activeTab === 'admin' || activeTab === 'disputes') && auth && auth.user.isAdmin) {
      // Load admin data (settings, trades, disputes) for Admin Panel and Disputes
      loadAdminData();
    }
  }, [activeTab, auth]);

  const handleGenerateSeed = () => {
    const wallet = ethers.Wallet.createRandom();
    setMnemonic12(wallet.mnemonic?.phrase ?? '');
    setMessage(null);
  };

  // Save wallet to user-specific storage
  const saveUserWallet = (data: any, address: string, label?: string, network?: 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron'): string => {
    if (!auth) return '';
    const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userWalletsKey = `fda_wallets_user_${auth.user.id}`;
    const raw = localStorage.getItem(userWalletsKey);
    const existingWallets = raw ? JSON.parse(raw) : [];

    const newWallet = {
      meta: {
        id: walletId,
        address,
        label: label || `Wallet ${existingWallets.length + 1}`,
        network: network || 'BNB Chain',
        createdAt: new Date().toISOString(),
      },
      encrypted: data,
    };

    existingWallets.push(newWallet);
    localStorage.setItem(userWalletsKey, JSON.stringify(existingWallets));
    setActiveWalletId(walletId);
    return walletId;
  };

  const handleSaveNewWallet = async () => {
    if (!mnemonic12) {
      showErrorModal('⚠️ Generate your 12-word phrase first.');
      return;
    }
    const words = mnemonic12.trim().split(/\s+/);
    if (words.length !== 12) {
      showErrorModal('⚠️ Seed must be 12 words.');
      return;
    }
    if (!extraWord.trim()) {
      showErrorModal('⚠️ Please add your custom 13th word.');
      return;
    }
    // if (!walletPassword.trim()) {
    //   showErrorModal('⚠️ Please enter a wallet password.');
    //   return;
    // }

    try {
      const wallet = walletFromMnemonicAndExtraWord(mnemonic12, extraWord, selectedNetwork);
      const walletAddress = wallet.address || (wallet as any).address;
      const walletPrivateKey = wallet.privateKey;

      const encrypted = await encryptPrivateKey(
        walletPrivateKey,
        walletPassword,
        extraWord.trim(),
        walletAddress,
      );
      if (auth) {
        saveUserWallet(encrypted, walletAddress, walletLabel.trim() || undefined, selectedNetwork);

        // Auto-register wallet with MC Wallet (with encrypted data)
        try {
          console.log('[Wallet Creation] 📤 Registering wallet with encrypted data...', {
            address: walletAddress,
            hasEncrypted: !!encrypted,
            encryptedKeys: encrypted ? Object.keys(encrypted) : [],
          });
          const registered = await registerWalletAddress(
            walletAddress,
            walletLabel.trim() || undefined,
            encrypted, // Save encrypted wallet data to database
            selectedNetwork,
            walletPassword
          );
          if (registered) {
            console.log('[Wallet Creation] ✅ Wallet auto-registered with MC Wallet (encrypted data saved)');
            // Refresh registered wallets to get the updated data
            await fetchRegisteredFdaWallets();
          } else {
            console.error('[Wallet Creation] ⚠️ Wallet registration returned false');
          }
        } catch (regErr: any) {
          console.error('[Wallet Creation] ❌ Failed to auto-register wallet:', regErr);
          showErrorModal(`⚠️ Wallet created but failed to register: ${regErr.message || 'Please try registering manually.'}`);
          // Don't fail wallet creation if registration fails
        }

        // Save encrypted phrase to database
        try {
          console.log('[Wallet Creation] Encrypting phrase for database storage...');
          const encryptedPhrase = await encryptPhrase(mnemonic12, extraWord.trim(), walletPassword);
          console.log('[Wallet Creation] Phrase encrypted, saving to database...');

          // Create hash of phrase for uniqueness checking
          const phraseCombination = `${mnemonic12.trim().toLowerCase()}:${extraWord.trim().toLowerCase()}`;
          const phraseHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(phraseCombination));
          const phraseHashHex = Array.from(new Uint8Array(phraseHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          const savePhraseUrl = getApiUrl('wallets/save-phrase');
          console.log('[Wallet Creation] Saving phrase to:', savePhraseUrl);

          const res = await fetch(savePhraseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              walletAddress,
              encryptedPhrase,
              phraseHash: phraseHashHex,
              extraWordPlain: extraWord.trim(),
              network: selectedNetwork,
              label: walletLabel.trim() || undefined,
            }),
          });

          // Check if response is JSON
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('[Wallet Creation] Non-JSON response from save-phrase:', text.substring(0, 200));
            console.error('[Wallet Creation] Response status:', res.status);
            // Don't fail wallet creation, but log the error
          } else {
            const data = await res.json();
            if (!res.ok) {
              console.error('[Wallet Creation] Failed to save phrase to database:', data.error);
              console.error('[Wallet Creation] Response status:', res.status);
            } else {
              console.log('[Wallet Creation] ✅ Phrase saved successfully to database');
            }
          }
        } catch (phraseErr: any) {
          console.error('[Wallet Creation] Error saving phrase to database:', phraseErr);
          console.error('[Wallet Creation] Error details:', phraseErr.message);
          // Don't fail wallet creation if phrase save fails, but log it
        }
      } else {
        // For non-authenticated users, save with network
        const walletId = saveEncryptedWallet(encrypted, walletAddress, walletLabel.trim() || undefined, selectedNetwork);
      }
      refreshWallets();
      setMnemonic12(null);
      setExtraWord('');
      setWalletPassword('');
      setWalletLabel('');

      // Show success message
      const phraseSaveStatus = auth ? 'Phrase saved to database.' : '';
      showSuccessModal(`✅ ${selectedNetwork} wallet created and stored in your browser (encrypted). ${phraseSaveStatus} Keep all 13 words and your password safe.`);
    } catch (err: any) {
      console.error('Wallet creation error:', err);
      showErrorModal(`⚠️ Failed to create wallet: ${err.message || 'Please try again.'}`);
    }
  };

  const handleImportWallet = async () => {
    const words = importSeed.trim().split(/\s+/);
    if (words.length !== 12) {
      showErrorModal('⚠️ Import requires exactly 12 BIP-39 words.');
      return;
    }

    // 13th word is ALWAYS required for all users
    if (!importExtraWord.trim()) {
      showErrorModal('⚠️ Enter your custom 13th word to proceed. The 13th word is always required.');
      return;
    }

    // if (!walletPassword.trim()) {
    //   showErrorModal('⚠️ Please enter a wallet password.');
    //   return;
    // }

    // Check if this phrase combination was used by another user (if registered)
    if (auth) {
      try {
        const checkRes = await fetch(getApiUrl('wallets/check-phrase'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            mnemonic12: importSeed.trim(),
            extraWord: importExtraWord.trim(),
            userId: auth.user.id,
          }),
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists) {
            showErrorModal(`⚠️ ${checkData.message || 'This wallet phrase (12+13 words) is already registered by another user in MC Wallet. You cannot import it.'}`);
            return;
          }
        }
      } catch (checkErr) {
        console.error('[Import Wallet] Error checking phrase uniqueness:', checkErr);
        // Continue with import even if check fails
      }
    }

    try {
      const extraWordToUse = importExtraWord.trim();
      const wallet = walletFromMnemonicAndExtraWord(importSeed.trim(), extraWordToUse, selectedNetwork);
      const walletAddress = wallet.address || (wallet as any).address;
      const walletPrivateKey = wallet.privateKey;

      const encrypted = await encryptPrivateKey(
        walletPrivateKey,
        walletPassword,
        extraWordToUse,
        walletAddress,
      );

      if (auth) {
        saveUserWallet(encrypted, walletAddress, importWalletLabel.trim() || undefined, selectedNetwork);

        // Auto-register wallet with MC Wallet (with encrypted data)
        try {
          await registerWalletAddress(
            walletAddress,
            importWalletLabel.trim() || undefined,
            encrypted, // Save encrypted wallet data to database
            selectedNetwork,
            walletPassword
          );
          console.log('[Import Wallet] ✅ Wallet auto-registered with MC Wallet (encrypted data saved)');
        } catch (regErr: any) {
          console.error('[Import Wallet] Failed to auto-register wallet:', regErr);
          // Don't fail import if registration fails
        }

        // Save encrypted phrase to database
        try {
          const encryptedPhrase = await encryptPhrase(importSeed.trim(), extraWordToUse, walletPassword);

          // Create hash of phrase for uniqueness checking
          const phraseCombination = `${importSeed.trim().toLowerCase()}:${extraWordToUse.trim().toLowerCase()}`;
          const phraseHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(phraseCombination));
          const phraseHashHex = Array.from(new Uint8Array(phraseHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          await fetch(getApiUrl('wallets/save-phrase'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              walletAddress,
              encryptedPhrase,
              phraseHash: phraseHashHex,
              extraWordPlain: extraWordToUse,
              network: selectedNetwork,
              label: importWalletLabel.trim() || undefined,
            }),
          });
          console.log('[Import Wallet] ✅ Phrase saved to database');
        } catch (phraseErr) {
          console.error('[Import Wallet] Failed to save phrase:', phraseErr);
        }
      } else {
        saveEncryptedWallet(encrypted, walletAddress, importWalletLabel.trim() || undefined, selectedNetwork);
      }

      refreshWallets();
      setImportSeed('');
      setImportExtraWord('');
      setWalletPassword('');
      setImportWalletLabel('');

      const regMessage = auth ? ' Wallet registered with MC Wallet.' : '';
      const phraseMessage = auth ? ' Phrase saved to database.' : '';
      showSuccessModal(`✅ ${selectedNetwork} wallet imported and stored in your browser (encrypted).${regMessage}${phraseMessage}`);
    } catch (err: any) {
      console.error('Import wallet error:', err);
      showErrorModal(`⚠️ Invalid seed phrase or extra word: ${err.message || 'Please check your 12+1 words.'}`);
    }
  };

  const handleUnlock = async () => {
    // if (!unlockPassword.trim()) {
    //   showErrorModal('⚠️ Please enter your wallet password.');
    //   return;
    // }
    if (!unlockExtraWord.trim()) {
      showErrorModal('⚠️ Enter your custom 13th word to unlock.');
      return;
    }
    if (!selectedUnlockWalletId && allWallets.length > 0) {
      showErrorModal('⚠️ Please select a wallet to unlock.');
      return;
    }

    // Check if wallet exists in the list (from localStorage)
    let selectedWallet = allWallets.find(w => w.id === selectedUnlockWalletId);

    // If not found in localStorage, check if it's a registered wallet from database
    // The selectedUnlockWalletId might be the wallet address for registered wallets
    if (!selectedWallet) {
      const registeredWallet = registeredFdaWallets.find(
        (w: any) => w.address?.toLowerCase() === selectedUnlockWalletId?.toLowerCase() ||
          w.id?.toString() === selectedUnlockWalletId?.toString() ||
          w.address?.toLowerCase() === selectedUnlockWalletId?.toLowerCase()
      );
      if (registeredWallet) {
        // Convert registered wallet to WalletMeta format for consistency
        selectedWallet = {
          id: registeredWallet.address || registeredWallet.id?.toString() || '',
          address: registeredWallet.address || '',
          label: registeredWallet.label || `Registered Wallet`,
          network: registeredWallet.network || 'BNB Chain',
          createdAt: registeredWallet.created_at || new Date().toISOString(),
        };
      }
    }

    if (!selectedWallet && (allWallets.length > 0 || registeredFdaWallets.length > 0)) {
      showErrorModal('⚠️ Please select a wallet to unlock.');
      return;
    }

    // If it's a registered wallet, also try to find encrypted data by address
    const walletAddress = selectedWallet?.address?.toLowerCase();

    // Check if this wallet is registered in the database FIRST
    const isRegisteredWallet = registeredFdaWallets.some(
      (w: any) => w.address?.toLowerCase() === selectedWallet?.address?.toLowerCase()
    );

    // PRIORITY: If registered wallet, ALWAYS try to restore from database FIRST (before checking local storage)
    if (selectedWallet && isRegisteredWallet) {
      if (!unlockExtraWord) {
        showErrorModal(
          '⚠️ This wallet is registered in MC Wallet. Please enter your 13th word to restore it from the database.'
        );
        return;
      }

      // First, check if encrypted_data exists in registered wallets (faster, no API call needed)
      let registeredWallet = registeredFdaWallets.find(
        (w: any) => w.address?.toLowerCase() === selectedWallet.address?.toLowerCase()
      );

      console.log('[Unlock Wallet] 🔍 Checking registered wallet:', {
        walletAddress: selectedWallet.address,
        foundRegistered: !!registeredWallet,
        hasEncryptedData: !!registeredWallet?.encrypted_data,
        encryptedDataType: registeredWallet?.encrypted_data ? typeof registeredWallet.encrypted_data : 'none',
        registeredWalletsCount: registeredFdaWallets.length,
      });

      // If wallet is registered but has no encrypted_data, try to refresh from database
      if (registeredWallet && !registeredWallet.encrypted_data) {
        console.log('[Unlock Wallet] ⚠️ Wallet registered but no encrypted_data found, refreshing from database...');
        await fetchRegisteredFdaWallets();
        // Re-find the wallet after refresh
        registeredWallet = registeredFdaWallets.find(
          (w: any) => w.address?.toLowerCase() === selectedWallet.address?.toLowerCase()
        );
        console.log('[Unlock Wallet] 🔄 After refresh:', {
          foundRegistered: !!registeredWallet,
          hasEncryptedData: !!registeredWallet?.encrypted_data,
        });
      }

      // If still no encrypted_data, try to get it from local storage and re-register
      if (registeredWallet && !registeredWallet.encrypted_data) {
        console.log('[Unlock Wallet] ⚠️ Still no encrypted_data, checking local storage...');
        const localWallets = getUserWallets();
        const localWallet = localWallets.find(w => w.address.toLowerCase() === selectedWallet.address.toLowerCase());

        if (localWallet && localWallet.encrypted) {
          console.log('[Unlock Wallet] ✅ Found encrypted data in local storage, re-registering wallet...');
          try {
            await registerWalletAddress(
              selectedWallet.address,
              selectedWallet.label || registeredWallet.label,
              localWallet.encrypted, // Use encrypted data from local storage
              selectedWallet.network || registeredWallet.network || 'BNB Chain'
            );
            // Refresh registered wallets to get updated data
            await fetchRegisteredFdaWallets();
            // Re-find the wallet after re-registration
            registeredWallet = registeredFdaWallets.find(
              (w: any) => w.address?.toLowerCase() === selectedWallet.address?.toLowerCase()
            );
            console.log('[Unlock Wallet] 🔄 After re-registration:', {
              foundRegistered: !!registeredWallet,
              hasEncryptedData: !!registeredWallet?.encrypted_data,
            });
          } catch (reRegErr: any) {
            console.error('[Unlock Wallet] ❌ Failed to re-register wallet with encrypted_data:', reRegErr);
          }
        } else {
          console.log('[Unlock Wallet] ⚠️ No encrypted data found in local storage either');
        }
      }

      if (registeredWallet?.encrypted_data) {
        // Try to use encrypted_data directly (no need for phrase)
        try {
          // Parse encrypted_data if it's a JSON string
          let encryptedData = registeredWallet.encrypted_data;
          if (encryptedData && typeof encryptedData === 'string') {
            try {
              encryptedData = JSON.parse(encryptedData);
            } catch (parseErr) {
              console.error('[Unlock Wallet] Failed to parse encrypted_data:', parseErr);
              encryptedData = null;
            }
          }

          if (encryptedData && encryptedData.address) {
            // Decrypt and unlock directly
            const { decryptPrivateKey } = await import('./walletCrypto');
            const { privateKey } = await decryptPrivateKey(
              encryptedData,
              unlockPassword,
              unlockExtraWord.trim(),
            );
            unlockedPrivateKeyRef.current = privateKey;
            setWalletUnlockEpoch((n) => n + 1);

            // Also restore to local storage if not already there
            const localWallets = getUserWallets();
            const hasLocal = localWallets.some(w => w.address.toLowerCase() === selectedWallet.address.toLowerCase());
            if (!hasLocal) {
              const { saveEncryptedWallet } = await import('./walletStorage');
              const walletId = saveEncryptedWallet(
                encryptedData,
                selectedWallet.address,
                selectedWallet.label || registeredWallet.label,
                (selectedWallet.network || registeredWallet.network || 'BNB Chain') as any
              );
              refreshWallets();
              setSelectedUnlockWalletId(walletId);
            }

            showSuccessModal(`✅ Wallet unlocked from database! Address: ${selectedWallet.address}`);
            setUnlockPassword('');
            setUnlockExtraWord('');
            setActiveTab(unlockReturnTab || 'dashboard');
            return; // Success! Exit early
          }
        } catch (decryptErr: any) {
          console.error('[Unlock Wallet] Failed to decrypt encrypted_data:', decryptErr);
          // Fall through to try phrase method
        }
      }

      // If encrypted_data doesn't work, try to restore from phrase
      try {
        const phrasesRes = await fetch(getApiUrl('wallets/phrases'), {
          headers: { Authorization: `Bearer ${auth?.token}` },
        });

        if (phrasesRes.ok) {
          const phrasesData = await phrasesRes.json();
          const savedPhrases = phrasesData.phrases || [];
          const savedPhrase = savedPhrases.find(
            (p: any) => p.wallet_address?.toLowerCase() === selectedWallet.address?.toLowerCase()
          );

          if (savedPhrase) {
            // Try to decrypt the phrase and restore wallet
            try {
              const { decryptPhrase } = await import('./walletCrypto');
              // Parse encrypted phrase from database
              let encryptedPhraseData;
              try {
                encryptedPhraseData = typeof savedPhrase.encrypted_phrase === 'string'
                  ? JSON.parse(savedPhrase.encrypted_phrase)
                  : savedPhrase.encrypted_phrase;
              } catch {
                encryptedPhraseData = savedPhrase.encrypted_phrase;
              }

              const decrypted = await decryptPhrase(encryptedPhraseData, unlockPassword);
              const { mnemonic12, extraWord } = decrypted;

              if (extraWord.trim() === unlockExtraWord.trim()) {
                // Phrase matches! Restore the wallet locally
                const { walletFromMnemonicAndExtraWord, encryptPrivateKey } = await import('./walletCrypto');
                const { saveEncryptedWallet } = await import('./walletStorage');

                const wallet = walletFromMnemonicAndExtraWord(mnemonic12, extraWord, selectedWallet.network || 'BNB Chain');
                const walletAddressFromPhrase = wallet.address || (wallet as any).address;

                if (walletAddressFromPhrase.toLowerCase() === selectedWallet.address.toLowerCase()) {
                  // Address matches! Restore wallet
                  const walletPrivateKey = wallet.privateKey;
                  const encrypted = await encryptPrivateKey(
                    walletPrivateKey,
                    unlockPassword,
                    extraWord,
                    walletAddressFromPhrase,
                  );

                  const walletId = saveEncryptedWallet(
                    encrypted,
                    walletAddressFromPhrase,
                    selectedWallet.label || savedPhrase.label,
                    (selectedWallet.network || savedPhrase.network || 'BNB Chain') as any
                  );

                  // Refresh wallets and set as active
                  refreshWallets();
                  setSelectedUnlockWalletId(walletId);

                  // IMPORTANT: Save encrypted_data to database for future unlocks
                  try {
                    console.log('[Unlock Wallet] 💾 Saving encrypted_data to database after phrase unlock...');
                    await registerWalletAddress(
                      walletAddressFromPhrase,
                      selectedWallet.label || savedPhrase.label,
                      encrypted, // Save the encrypted wallet data
                      (selectedWallet.network || savedPhrase.network || 'BNB Chain')
                    );
                    console.log('[Unlock Wallet] ✅ encrypted_data saved to database');
                    // Refresh registered wallets to get updated data
                    await fetchRegisteredFdaWallets();
                  } catch (saveErr: any) {
                    console.error('[Unlock Wallet] ⚠️ Failed to save encrypted_data to database:', saveErr);
                    // Don't fail unlock if save fails, but log it
                  }

                  // Now unlock the restored wallet
                  const restoredEncrypted = loadEncryptedWallet(walletId);
                  if (restoredEncrypted) {
                    const { decryptPrivateKey } = await import('./walletCrypto');
                    const { privateKey } = await decryptPrivateKey(
                      restoredEncrypted,
                      unlockPassword,
                      unlockExtraWord.trim(),
                    );
                    unlockedPrivateKeyRef.current = privateKey;
                    setWalletUnlockEpoch((n) => n + 1);
                    showSuccessModal(`✅ Wallet restored from database and unlocked! Address: ${walletAddressFromPhrase}`);
                    setUnlockPassword('');
                    setUnlockExtraWord('');
                    setActiveTab(unlockReturnTab || 'dashboard');
                    return; // Success! Exit early
                  }
                } else {
                  showErrorModal('⚠️ Wallet address mismatch. The phrase does not match the selected wallet address.');
                  return;
                }
              } else {
                showErrorModal('⚠️ 13th word does not match. Please check your 13th word.');
                return;
              }
            } catch (decryptErr: any) {
              // Decryption failed
              console.error('[Wallet Restoration] Failed to decrypt phrase:', decryptErr);
              const errorMsg = decryptErr.message?.includes('password') || decryptErr.message?.includes('decrypt')
                ? 'Incorrect password. Please check your password and try again.'
                : 'Failed to decrypt wallet phrase. Please check your password and 13th word.';
              showErrorModal(`⚠️ ${errorMsg}`);
              return;
            }
          } else {
            // No saved phrase found, but check if encrypted_data exists in registered wallets
            const registeredWallet = registeredFdaWallets.find(
              (w: any) => w.address?.toLowerCase() === selectedWallet.address?.toLowerCase()
            );

            if (registeredWallet?.encrypted_data) {
              // Try to use encrypted_data directly (no need for phrase)
              try {
                const encryptedData = typeof registeredWallet.encrypted_data === 'string'
                  ? JSON.parse(registeredWallet.encrypted_data)
                  : registeredWallet.encrypted_data;

                if (encryptedData && encryptedData.address) {
                  // Decrypt and unlock directly
                  const { decryptPrivateKey } = await import('./walletCrypto');
                  const { privateKey } = await decryptPrivateKey(
                    encryptedData,
                    unlockPassword,
                    unlockExtraWord.trim(),
                  );
                  unlockedPrivateKeyRef.current = privateKey;
                  setWalletUnlockEpoch((n) => n + 1);

                  // Also restore to local storage if not already there
                  const localWallets = getUserWallets();
                  const hasLocal = localWallets.some(w => w.address.toLowerCase() === selectedWallet.address.toLowerCase());
                  if (!hasLocal) {
                    const { saveEncryptedWallet } = await import('./walletStorage');
                    saveEncryptedWallet(
                      encryptedData,
                      selectedWallet.address,
                      selectedWallet.label,
                      (selectedWallet.network || registeredWallet.network || 'BNB Chain') as any
                    );
                    refreshWallets();
                  }

                  showSuccessModal(`✅ Wallet unlocked from database! Address: ${selectedWallet.address}`);
                  setUnlockPassword('');
                  setUnlockExtraWord('');
                  setActiveTab(unlockReturnTab || 'dashboard');
                  return;
                }
              } catch (decryptErr: any) {
                console.error('[Unlock Wallet] Failed to decrypt encrypted_data:', decryptErr);
                const errorMsg = decryptErr.message?.includes('password') || decryptErr.message?.includes('decrypt')
                  ? 'Incorrect password. Please check your password and try again.'
                  : 'Failed to decrypt wallet. Please check your password and 13th word.';
                showErrorModal(`⚠️ ${errorMsg}`);
                setUnlockExtraWord('');
                setUnlockPassword('');
                return;
              }
            } else {
              // No saved phrase and no encrypted_data found in database
              showErrorModal(
                '⚠️ No saved wallet data found in database for this wallet.\n\n' +
                'Please go to "Import wallet" in the sidebar and enter your 12-word phrase + 13th word to import this wallet.'
              );
              setTimeout(() => {
                setActiveTab('import');
              }, 2000);
              return;
            }
          }
        }
      } catch (restoreErr: any) {
        console.error('[Wallet Restoration] Error:', restoreErr);
        showErrorModal('⚠️ Failed to restore wallet from database. Please try importing the wallet manually.');
        return;
      }
    }

    // Load encrypted wallet from user-specific storage (only if not registered or restoration failed)
    let encrypted: EncryptedWalletData | null = null;
    if (auth && selectedUnlockWalletId) {
      const userWalletsKey = `fda_wallets_user_${auth.user.id}`;
      const raw = localStorage.getItem(userWalletsKey);
      if (raw) {
        try {
          const userWallets = JSON.parse(raw) as StoredWallet[];
          // Try to find by ID first
          let wallet = userWallets.find(w => w.meta.id === selectedUnlockWalletId);
          // If not found and we have an address, try to find by address
          if (!wallet && walletAddress) {
            wallet = userWallets.find(w => w.meta.address?.toLowerCase() === walletAddress);
          }
          if (wallet && wallet.encrypted) {
            encrypted = wallet.encrypted;
          }
        } catch (err) {
          console.error('Error loading user wallets:', err);
        }
      }
    }

    // Fallback to global storage if not found in user storage
    if (!encrypted) {
      encrypted = loadEncryptedWallet(selectedUnlockWalletId || undefined);
      // If still not found and we have an address, try loading by address
      if (!encrypted && walletAddress) {
        // Try to find wallet by address in all wallets
        const walletByAddress = allWallets.find(w => w.address.toLowerCase() === walletAddress);
        if (walletByAddress) {
          encrypted = loadEncryptedWallet(walletByAddress.id);
        }
      }
    }

    if (!encrypted) {
      // If we reach here and wallet is registered, restoration from database already failed above
      // Only show error for non-registered wallets or if restoration failed
      if (selectedWallet && !isRegisteredWallet) {
        showErrorModal('⚠️ This wallet does not have encrypted data stored. Please create or import a wallet with a password first.');
        setUnlockExtraWord('');
        setUnlockPassword('');
      } else if (selectedWallet && isRegisteredWallet) {
        // This shouldn't happen if restoration worked, but just in case
        showErrorModal(
          '⚠️ Failed to restore wallet from database. Please try importing the wallet manually using "Import wallet" in the sidebar.'
        );
        setUnlockExtraWord('');
        setUnlockPassword('');
        setTimeout(() => {
          setActiveTab('import');
        }, 2000);
      } else {
        const hasRegisteredWallets = registeredFdaWallets.length > 0;
        if (hasRegisteredWallets) {
          showErrorModal('⚠️ No encrypted wallet found in your browser. The wallets you see are registered MC wallets (for zero-fee transfers). To unlock and send transactions, please create or import a wallet first using "Create wallet" or "Import wallet" in the sidebar.');
        } else {
          showErrorModal('⚠️ No encrypted wallet found in your browser. Please create or import a wallet first using "Create wallet" or "Import wallet" in the sidebar.');
        }
      }
      return;
    }

    // If we reach here, we have encrypted data and can unlock
    try {
      const { privateKey } = await decryptPrivateKey(
        encrypted,
        unlockPassword,
        unlockExtraWord.trim(),
      );
      unlockedPrivateKeyRef.current = privateKey;
      setWalletUnlockEpoch((n) => n + 1);
      showSuccessModal(`✅ Wallet unlocked in memory. Address: ${encrypted.address}`);

      // Clear fields after successful unlock
      setUnlockPassword('');
      setUnlockExtraWord('');
      if (allWallets.length > 0) {
        setSelectedUnlockWalletId(allWallets[0].id);
      }
      setActiveTab(unlockReturnTab || 'dashboard');
    } catch {
      showErrorModal('⚠️ Failed to unlock wallet. Check your password and 13th word.');
    }
  };

  const loadOffers = async () => {
    if (!auth) {
      showErrorModal('⚠️ Login first to load offers.');
      return;
    }
    setLoadingOffers(true);
    try {
      const res = await fetch(getApiUrl('offers'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || 'Failed to load offers'}`);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      if (!Array.isArray(data)) {
        console.warn('loadOffers: expected array, got', typeof data, data);
      }
      console.log('Loaded offers:', list);
      setOffers(list);
    } catch {
      showErrorModal('⚠️ Unable to load offers (check backend is running and CORS / API URL).');
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleAddFdaBalance = async () => {
    if (!auth) {
      showErrorModal('⚠️ Please login to add FDA tokens.');
      return;
    }

    const amountNum = Number(addFdaAmount);
    if (!addFdaAmount || isNaN(amountNum) || amountNum <= 0) {
      showErrorModal('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setAddingFdaBalance(true);
      setMessage(null); // Clear previous messages

      if (!storedMeta?.address) {
        showErrorModal('⚠️ No wallet selected. Please select a wallet first.');
        return;
      }

      const res = await fetch(getApiUrl('internal/add-balance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          wallet_address: storedMeta.address,
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (res.status === 404) {
          showErrorModal('❌ Route not found. Please restart the backend server and try again.');
        } else {
          showErrorModal(`❌ Server error (${res.status}). Please check if the backend server is running.`);
        }
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || data.message || `Server error: ${res.status}`;
        console.error('Add balance error response:', data);
        showErrorModal(`❌ ${errorMsg}`);
        return;
      }

      if (data.success) {
        showSuccessModal(`✅ Added ${amountNum} FDA to your internal balance! New balance: ${data.balance.toFixed(2)} FDA`);
        setAddFdaAmount('');
        if (storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address); // Refresh balance
        }
      } else {
        showErrorModal(`❌ ${data.message || 'Failed to add FDA tokens'}`);
      }
    } catch (err: any) {
      console.error('Add FDA balance error:', err);
      const errorMsg = err.message || 'Network error. Please check your connection and try again.';
      showErrorModal(`❌ ${errorMsg}`);
    } finally {
      setAddingFdaBalance(false);
    }
  };

  const createOffer = async () => {
    if (!auth) {
      showErrorModal('Please login to create offers.');
      return;
    }

    // Require 13th word for creating offers
    if (!unlockedPrivateKeyRef.current) {
      showErrorModal('⚠️ Please unlock your wallet first. You need to enter your Custom 13th word to create offers.');
      openUnlockTab(activeTab);
      return;
    }

    if (!offerAmount || Number(offerAmount) <= 0) {
      showErrorModal('Please enter a valid amount.');
      return;
    }
    if (!offerPrice || Number(offerPrice) <= 0) {
      showErrorModal('Please enter a valid price.');
      return;
    }
    const minPriceRequired =
      offerFiatCurrency === 'USDT' ? p2pMinPricePerFdaUsdt : p2pMinPricePerFda;
    if (Number(offerPrice) < minPriceRequired) {
      const unit = offerFiatCurrency === 'USDT' ? 'USDT' : 'INR';
      showErrorModal(`Minimum price per FDA is ${minPriceRequired} ${unit}.`);
      return;
    }

    if (offerFiatCurrency === 'USDT' && offerType === 'SELL') {
      const addr = (p2pUsdtPayoutAddress || '').trim();
      if (!/^0x[a-fA-F0-9]{40}$/i.test(addr)) {
        showErrorModal(
          'Add a valid USDT (BEP20) payout address under Payment Methods before creating USDT SELL offers.',
        );
        return;
      }
    }

    // Check for active payment methods if currency is INR
    if (offerType === 'SELL' && offerFiatCurrency === 'INR') {
      try {
        const paymentMethodsRes = await fetch(getApiUrl('payment-methods'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (paymentMethodsRes.ok) {
          const paymentMethodsData = await paymentMethodsRes.json();
          const activePaymentMethods = (paymentMethodsData || []).filter((pm: any) => pm.is_active);
          if (activePaymentMethods.length === 0) {
            showErrorModal('⚠️ No active payment methods found. Please add at least one active payment method in the "Payment Methods" section before creating an offer.');
            return;
          }
          // Also check if at least one payment method is selected
          if (!offerPaymentMethods || offerPaymentMethods.trim() === '') {
            showErrorModal('⚠️ Please select at least one payment method before creating an offer.');
            return;
          }
        } else {
          showErrorModal('⚠️ Failed to verify payment methods. Please try again.');
          return;
        }
      } catch (err) {
        console.error('Error checking payment methods:', err);
        showErrorModal('⚠️ Failed to verify payment methods. Please try again.');
        return;
      }
    }

    // CRITICAL: Get the CURRENT offerType value - check it IMMEDIATELY
    // Check FDA balance only for SELL offers (BUY offers don't need balance upfront - you're buying, not selling)
    console.log('[FRONTEND] ========================================');
    console.log('[FRONTEND] 🚨 CREATE OFFER CALLED 🚨');
    console.log('[FRONTEND] Current offerType state value:', offerType);
    console.log('[FRONTEND] offerType type:', typeof offerType);
    console.log('[FRONTEND] offerType JSON:', JSON.stringify(offerType));
    console.log('[FRONTEND] offerType === "BUY":', offerType === 'BUY');
    console.log('[FRONTEND] offerType === "SELL":', offerType === 'SELL');
    console.log('[FRONTEND] offerType === "buy":', offerType === 'buy');
    console.log('[FRONTEND] offerType === "sell":', offerType === 'sell');
    console.log('[FRONTEND] Creating offer - Amount:', offerAmount);

    // Normalize offerType to uppercase for case-insensitive comparison
    // Use the current state value directly - no closure issues
    const currentOfferType = offerType;
    const normalizedOfferType = String(currentOfferType || '').toUpperCase().trim();
    console.log('[FRONTEND] Current offerType from state:', currentOfferType);
    console.log('[FRONTEND] Normalized offerType:', normalizedOfferType);
    console.log('[FRONTEND] Is BUY?', normalizedOfferType === 'BUY', 'or', currentOfferType === 'BUY');
    console.log('[FRONTEND] Is SELL?', normalizedOfferType === 'SELL', 'or', currentOfferType === 'SELL');
    console.log('[FRONTEND] ⚠️ WARNING: If normalizedOfferType is BUY but you selected SELL, the state is not updating!');
    console.log('[FRONTEND] ========================================');

    // CRITICAL: Only check balance for SELL offers, NEVER for BUY offers
    // BUY offers: Buyer pays fiat, seller provides tokens - NO balance check needed
    // SELL offers: Seller needs tokens to sell - MUST check balance

    // EXPLICITLY CHECK FOR BUY FIRST - If it's BUY (in any form), skip ALL balance checks immediately
    // Use multiple checks to ensure we catch BUY in all possible formats
    const isBuy = normalizedOfferType === 'BUY' ||
      currentOfferType === 'BUY' ||
      String(currentOfferType).toUpperCase() === 'BUY' ||
      String(currentOfferType).toUpperCase().trim() === 'BUY';

    const isSell = normalizedOfferType === 'SELL' ||
      currentOfferType === 'SELL' ||
      String(currentOfferType).toUpperCase() === 'SELL' ||
      String(currentOfferType).toUpperCase().trim() === 'SELL';

    console.log('[FRONTEND] Detection results - isBuy:', isBuy, 'isSell:', isSell);

    if (isBuy) {
      console.log('[FRONTEND] ✅✅✅ BUY OFFER DETECTED - SKIPPING ALL BALANCE CHECKS ✅✅✅');
      console.log('[FRONTEND] BUY offers do NOT require FDA balance - proceeding to create offer');
      // DO NOT CHECK BALANCE - Continue directly to creating the offer
    }
    // Only check balance for SELL offers - must be explicitly SELL
    else if (isSell) {
      console.log('[FRONTEND] ✅ This is a SELL offer, checking balance...');
      const fdaSellCap =
        internalFdaUsable !== null && Number.isFinite(internalFdaUsable)
          ? Math.max(0, internalFdaUsable)
          : internalFdaBalance;
      if (fdaSellCap === null || fdaSellCap < Number(offerAmount)) {
        console.log('[FRONTEND] ❌ Balance check failed for SELL offer');
        showErrorModal(
          `Insufficient FDA available for a new sell offer. You can list up to ${fdaSellCap ?? 0} FDA (active holds and minimum reserve are excluded).`,
        );
        return;
      }
    } else {
      console.log('[FRONTEND] ⚠️ Unknown offer type:', normalizedOfferType, 'Raw:', currentOfferType);
      console.log('[FRONTEND] isBuy:', isBuy, 'isSell:', isSell);
      showErrorModal(`⚠️ Invalid offer type: "${normalizedOfferType}". Must be BUY or SELL. Current state: "${currentOfferType}". Please select BUY or SELL from the dropdown.`);
      return;
    }

    try {
      setCreatingOffer(true);
      // CRITICAL: Use the normalized type from above, not the raw state
      // This ensures we're using the value we validated, not a stale closure value
      const typeToSend = normalizedOfferType; // Use the normalized value we already calculated
      console.log('[FRONTEND] ========================================');
      console.log('[FRONTEND] PREPARING TO SEND OFFER TO BACKEND');
      console.log('[FRONTEND] Raw offerType state:', offerType);
      console.log('[FRONTEND] Normalized offerType:', normalizedOfferType);
      console.log('[FRONTEND] Type to send to backend:', typeToSend);
      console.log('[FRONTEND] Request body will contain:', {
        type: typeToSend,
        assetSymbol: 'FDA',
        fiatCurrency: offerFiatCurrency,
        price: Number(offerPrice),
        amount: Number(offerAmount),
      });
      console.log('[FRONTEND] ========================================');
      if (!storedMeta?.address) {
        showErrorModal('⚠️ No wallet selected. Please select a wallet first.');
        setCreatingOffer(false);
        return;
      }

      const res = await fetch(getApiUrl('offers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          type: typeToSend, // Use normalized value: 'BUY' or 'SELL'
          assetSymbol: 'FDA',
          fiatCurrency: offerFiatCurrency,
          price: Number(offerPrice),
          amount: Number(offerAmount),
          minLimit: offerMinLimit ? Number(offerMinLimit) : null,
          maxLimit: offerMaxLimit ? Number(offerMaxLimit) : null,
          paymentMethods: offerPaymentMethods || null,
          wallet_address: storedMeta.address, // Include wallet address for balance checks
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || 'Failed to create offer.'}`);
        return;
      }

      console.log('[FRONTEND] ========================================');
      console.log('[FRONTEND] ✅ OFFER CREATION RESPONSE RECEIVED');
      console.log('[FRONTEND] Response data:', data);
      console.log('[FRONTEND] Type sent:', typeToSend);
      console.log('[FRONTEND] Type received in response:', data.type);
      console.log('[FRONTEND] Type match?', typeToSend === data.type);
      console.log('[FRONTEND] ========================================');

      if (typeToSend !== data.type) {
        console.error('[FRONTEND] ❌ TYPE MISMATCH! Sent:', typeToSend, 'Received:', data.type);
        showErrorModal(`⚠️ Warning: Offer created but type mismatch detected. Sent: ${typeToSend}, Received: ${data.type}. Please check the offer in the list.`);
      } else {
        showSuccessModal('✅ Offer created successfully! You can view it in the offers list.');
      }
      setOfferAmount('');
      setOfferPrice('');
      setOfferMinLimit('');
      setOfferMaxLimit('');
      setOfferPaymentMethods('');
      // So the new offer is not hidden by an existing BUY/SELL filter or search text
      setOffersFilterType('ALL');
      setOffersSearch('');
      setOffersPage(1);
      await loadOffers();
      if (storedMeta?.address) {
        await fetchInternalBalance(storedMeta.address); // Refresh internal FDA balance
      }
    } catch (err) {
      console.error('Failed to create offer:', err);
      showErrorModal('⚠️ Failed to create offer. Please try again.');
    } finally {
      setCreatingOffer(false);
    }
  };

  const loadMyTrades = async () => {
    if (!auth) {
      showErrorModal('⚠️ Please login to view your trades.');
      return;
    }
    setLoadingMyTrades(true);
    try {
      // Get trades where user is buyer or seller
      const res = await fetch(getApiUrl('trades'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMyTrades(data);
      }
    } catch (err) {
      console.error('Failed to load trades:', err);
    } finally {
      setLoadingMyTrades(false);
    }
  };

  const canAcceptAnotherOffer = useMemo(() => {
    const done = new Set(['COMPLETED', 'CANCELLED']);
    return !myTrades.some((t) => !done.has(String(t.status || '').trim().toUpperCase()));
  }, [myTrades]);

  const openAcceptModal = (offer: any) => {
    if (!canAcceptAnotherOffer) {
      showErrorModal(
        '⚠️ You already have an active trade. Complete it, cancel it, or wait for it to finish before accepting another offer.',
      );
      return;
    }
    setSelectedOffer(offer);
    setAcceptAmount('');
    setShowAcceptModal(true);
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setSelectedOffer(null);
    setAcceptAmount('');
  };

  const acceptOffer = async () => {
    if (!auth || !selectedOffer) {
      closeAcceptModal(); // Close modal first
      showErrorModal('Please login to accept offers.');
      return;
    }

    const amountNum = Number(acceptAmount);
    if (!acceptAmount || amountNum <= 0 || isNaN(amountNum)) {
      closeAcceptModal(); // Close modal first
      showErrorModal('❌ Please enter a valid amount greater than 0.');
      return;
    }

    if (amountNum > selectedOffer.remaining) {
      closeAcceptModal(); // Close modal first
      showErrorModal(`❌ Amount cannot exceed available: ${selectedOffer.remaining} FDA`);
      return;
    }

    if (!canAcceptAnotherOffer) {
      closeAcceptModal();
      showErrorModal(
        '⚠️ You already have an active trade. Complete or cancel it before accepting another offer.',
      );
      return;
    }

    // CRITICAL: Check FDA balance if accepting a BUY offer (user will be SELLER)
    // If accepting a SELL offer (user will be BUYER), no balance check needed (pays fiat)
    const offerType = (selectedOffer.type || selectedOffer.offer_type || 'SELL').toUpperCase();
    if (offerType === 'BUY' && selectedOffer.assetSymbol === 'FDA') {
      console.log('[FRONTEND] ✅ Accepting BUY offer - user will be SELLER, checking FDA balance...');
      const fdaSellCap =
        internalFdaUsable !== null && Number.isFinite(internalFdaUsable)
          ? Math.max(0, internalFdaUsable)
          : internalFdaBalance;
      if (fdaSellCap === null || fdaSellCap < amountNum) {
        closeAcceptModal(); // Close modal first
        showErrorModal(
          `❌ Insufficient FDA available to sell into this offer. You can use up to ${fdaSellCap ?? 0} FDA (active holds and minimum reserve are excluded).`,
        );
        return;
      }
    } else if (offerType === 'SELL') {
      console.log('[FRONTEND] ✅ Accepting SELL offer - user will be BUYER, no FDA balance check needed (pays fiat)');
      // No balance check needed - buyer pays fiat
    }

    setAcceptingOffer(selectedOffer.id);
    const activeAddress = getActiveWalletAddress();

    if (!activeAddress) {
      showErrorModal("⚠️ No active wallet selected.");
      return;
    }
    setAcceptingOffer(selectedOffer.id);
    try {
      const res = await fetch(getApiUrl('trades'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ offerId: selectedOffer.id, amount: amountNum, wallet_address: activeAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        closeAcceptModal(); // Close modal first
        showErrorModal(`❌ ${data.error || 'Failed to accept offer.'}`);
        return;
      }
      closeAcceptModal();
      await loadOffers();
      await loadMyTrades();
      showSuccessModal(`✅ Trade created successfully! Trade ID: ${data.id}\n\nGo to "My Trades" section below to upload payment screenshot.`);
    } catch (err) {
      console.error('Failed to accept offer:', err);
      closeAcceptModal(); // Close modal first
      showErrorModal('❌ Failed to accept offer. Please try again.');
    } finally {
      setAcceptingOffer(null);
    }
  };

  const markTradeAsPaid = async (tradeId: number, screenshot?: string | null) => {
    if (!auth) return;
    setMarkingAsPaid(tradeId);
    try {
      const res = await fetch(getApiUrl(`trades/${tradeId}/mark-paid`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          payment_screenshot: screenshot || null,
        }),
      });
      if (res.ok) {
        showSuccessModal('✅ Trade marked as paid successfully!');
        setShowPaymentModal(false);
        setPaymentScreenshot(null);
        setSelectedTradeForPayment(null);
        await loadMyTrades();
      } else {
        const data = await res.json();
        showErrorModal(data.error || 'Failed to mark trade as paid.');
      }
    } catch (err) {
      console.error('Failed to mark as paid:', err);
      showErrorModal('Failed to mark trade as paid. Please try again.');
    } finally {
      setMarkingAsPaid(null);
    }
  };

  const compressImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        showErrorModal('❌ Image is too large. Please select an image smaller than 10MB.');
        return;
      }

      try {
        setUploadingScreenshot(true);
        const compressedBase64 = await compressImage(file);
        // Check compressed size (max 2MB base64 = ~1.5MB actual)
        if (compressedBase64.length > 2 * 1024 * 1024) {
          // Try with lower quality
          const lowerQuality = await compressImage(file, 1000, 1000, 0.5);
          setPaymentScreenshot(lowerQuality);
        } else {
          setPaymentScreenshot(compressedBase64);
        }
      } catch (err) {
        console.error('Failed to compress image:', err);
        showErrorModal('❌ Failed to process image. Please try a different image.');
      } finally {
        setUploadingScreenshot(false);
      }
    }
  };

  const openReleaseConfirmModal = (trade: any) => {
    setSelectedTradeToRelease(trade);
    setShowReleaseConfirmModal(true);
  };

  const closeReleaseConfirmModal = () => {
    setShowReleaseConfirmModal(false);
    setSelectedTradeToRelease(null);
  };

  const releaseTrade = async () => {
    if (!auth || !selectedTradeToRelease) return;
    const tradeId = selectedTradeToRelease.id;
    setReleasingTokens(tradeId);
    try {
      const res = await fetch(getApiUrl(`trades/${tradeId}/release`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (res.ok) {
        closeReleaseConfirmModal();
        showSuccessModal('✅ Tokens released to buyer successfully!');
        setSelectedTradeForChat((prev: any) =>
          prev && Number(prev.id) === Number(tradeId) ? { ...prev, status: 'COMPLETED' } : prev,
        );
        setShowTradeChatModal((prev) =>
          selectedTradeForChat && Number(selectedTradeForChat.id) === Number(tradeId) ? false : prev,
        );
        await loadMyTrades();
        if (storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address);
        }
      } else {
        const data = await res.json();
        showErrorModal(`❌ ${data.error || 'Failed to release tokens'}`);
      }
    } catch (err) {
      console.error('Failed to release trade:', err);
      showErrorModal('❌ Failed to release tokens. Please try again.');
    } finally {
      setReleasingTokens(null);
    }
  };

  const cancelTrade = async (tradeId: number) => {
    if (!auth) return;
    if (!confirm('Are you sure you want to cancel this trade?')) return;

    setCancellingTrade(tradeId);
    try {
      const res = await fetch(getApiUrl(`trades/${tradeId}/cancel`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (res.ok) {
        showSuccessModal('✅ Trade cancelled successfully!');
        await loadMyTrades();
        await loadOffers();
      } else {
        const data = await res.json();
        showErrorModal(`❌ ${data.error || 'Failed to cancel trade'}`);
      }
    } catch (err) {
      console.error('Failed to cancel trade:', err);
      showErrorModal('❌ Failed to cancel trade. Please try again.');
    } finally {
      setCancellingTrade(null);
    }
  };

  const openCancelOfferModal = (offer: any) => {
    setSelectedOfferToCancel(offer);
    setShowCancelOfferModal(true);
  };

  const closeCancelOfferModal = () => {
    setShowCancelOfferModal(false);
    setSelectedOfferToCancel(null);
  };

  const cancelOffer = async () => {
    if (!auth || !selectedOfferToCancel) return;
    const offerType = String(selectedOfferToCancel.type || selectedOfferToCancel.offer_type || '').toUpperCase();
    const assetSymbol = String(selectedOfferToCancel.assetSymbol || selectedOfferToCancel.asset_symbol || '').toUpperCase();
    const returnsLockedFda = offerType === 'SELL' && assetSymbol === 'FDA';

    setCancellingOffer(selectedOfferToCancel.id);
    try {
      const res = await fetch(getApiUrl(`offers/${selectedOfferToCancel.id}/cancel`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      if (res.ok) {
        closeCancelOfferModal();
        await loadOffers();
        if (returnsLockedFda && storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address); // Refresh balance since locked amount will be returned
        }
        showSuccessModal(
          returnsLockedFda
            ? '✅ Offer cancelled successfully. Your locked FDA balance has been returned.'
            : '✅ Offer cancelled successfully.',
        );
      } else {
        const data = await res.json();
        showErrorModal(`❌ ${data.error || 'Failed to cancel offer'}`);
      }
    } catch (err) {
      console.error('Failed to cancel offer:', err);
      showErrorModal('❌ Failed to cancel offer. Please try again.');
    } finally {
      setCancellingOffer(null);
    }
  };

  const openDisputeModal = (trade: any) => {
    setSelectedTradeToDispute(trade);
    setShowDisputeModal(true);
  };

  const closeDisputeModal = () => {
    setShowDisputeModal(false);
    setSelectedTradeToDispute(null);
  };

  const openTradeChatModal = (trade: any) => {
    setSelectedTradeForChat(trade);
    setShowTradeChatModal(true);
  };

  const closeTradeChatModal = () => {
    setShowTradeChatModal(false);
    setSelectedTradeForChat(null);
  };

  const createDispute = async (reason: string) => {
    if (!auth || !selectedTradeToDispute) return;
    const tradeId = selectedTradeToDispute.id;

    if (!reason || reason.trim() === '') {
      showErrorModal('❌ Dispute reason is required.');
      return;
    }

    setDisputingTrade(tradeId);
    try {
      const res = await fetch(getApiUrl(`trades/${tradeId}/disputes`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        closeDisputeModal();
        showSuccessModal('✅ Dispute created successfully. An admin will review it.');
        await loadMyTrades();
      } else {
        const data = await res.json();
        showErrorModal(`❌ ${data.error || 'Failed to create dispute'}`);
      }
    } catch (err) {
      console.error('Failed to create dispute:', err);
      showErrorModal('❌ Failed to create dispute. Please try again.');
    } finally {
      setDisputingTrade(null);
    }
  };

  const estimateGasAndMax = useCallback(async () => {
    if (
      transferType === 'internal' &&
      assetType === 'token' &&
      tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()
    ) {
      setEstimatedGas(null);
      return;
    }
    if (!sendTo.trim() || !ethers.isAddress(sendTo.trim())) {
      setEstimatedGas(null);
      return;
    }

    const signingAddr = unlockedPrivateKeyRef.current
      ? new ethers.Wallet(unlockedPrivateKeyRef.current).address
      : storedMeta?.address?.trim() || null;

    if (!signingAddr || !ethers.isAddress(signingAddr)) {
      setEstimatedGas(null);
      return;
    }

    try {
      setEstimatingGas(true);
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);

      let gasLimit: bigint;

      if (assetType === 'native') {
        const testValue = ethers.parseEther('0.001');
        gasLimit = await provider.estimateGas({
          from: signingAddr,
          to: sendTo.trim(),
          value: testValue,
        });
      } else {
        const tok = tokenAddress.trim();
        if (!ethers.isAddress(tok)) {
          setEstimatedGas(null);
          return;
        }
        if (unlockedPrivateKeyRef.current) {
          const wallet = new ethers.Wallet(unlockedPrivateKeyRef.current, provider);
          const contract = new ethers.Contract(tok, ERC20_ABI, wallet);
          const testAmount = ethers.parseUnits('1', await contract.decimals());
          gasLimit = await contract.transfer.estimateGas(wallet.address, testAmount);
        } else {
          const contractRead = new ethers.Contract(tok, ERC20_ABI, provider);
          const dec = await contractRead.decimals();
          const testAmount = ethers.parseUnits('1', dec);
          const iface = new ethers.Interface(ERC20_ABI);
          const data = iface.encodeFunctionData('transfer', [signingAddr, testAmount]);
          gasLimit = await provider.estimateGas({
            from: signingAddr,
            to: tok,
            data,
          });
        }
      }

      const weiPerGas = await getEffectiveGasPriceWei(provider);
      if (weiPerGas === 0n) {
        setEstimatedGas(null);
        return;
      }
      const gasCostEth = parseFloat(ethers.formatEther(gasLimit * weiPerGas));
      setEstimatedGas(gasCostEth.toFixed(6));
    } catch (err) {
      const msg = String((err as any)?.message || '');
      if (
        !msg.includes('execution reverted') &&
        !msg.includes('CALL_EXCEPTION') &&
        !msg.includes('INSUFFICIENT_FUNDS') &&
        !msg.toLowerCase().includes('insufficient funds')
      ) {
        console.error('Gas estimation error:', err);
      }
      setEstimatedGas(null);
    } finally {
      setEstimatingGas(false);
    }
  }, [transferType, assetType, tokenAddress, sendTo, storedMeta?.address]);

  useEffect(() => {
    if (activeTab === 'send' && transferType === 'onchain' && sendTo.trim() && ethers.isAddress(sendTo.trim())) {
      const timer = setTimeout(() => {
        void estimateGasAndMax();
      }, 500);
      return () => clearTimeout(timer);
    }
    setEstimatedGas(null);
  }, [activeTab, transferType, sendTo, assetType, tokenAddress, walletUnlockEpoch, estimateGasAndMax]);

  const requestGasEstimate = useCallback(() => {
    void estimateGasAndMax();
  }, [estimateGasAndMax]);

  const handleMaxAmount = async () => {
    if (!unlockedPrivateKeyRef.current || !storedMeta?.address) {
      showErrorModal('⚠️ Unlock wallet first.');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
      const wallet = new ethers.Wallet(unlockedPrivateKeyRef.current, provider);
      const senderBalance = await provider.getBalance(wallet.address);
      const balanceEth = parseFloat(ethers.formatEther(senderBalance));

      if (assetType === 'native') {
        // Estimate gas first
        const testAmount = ethers.parseEther('0.001');
        const gasEstimate = await provider.estimateGas({
          from: wallet.address,
          to: sendTo.trim() || wallet.address, // Use sender as fallback for estimation
          value: testAmount,
        });
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));

        // Max sendable = balance - gas fees (with 10% buffer for safety)
        const maxSendable = Math.max(0, balanceEth - gasCostEth * 1.1);
        setSendAmount(maxSendable.toFixed(6));
        setEstimatedGas(gasCostEth.toFixed(6));
        showSuccessModal(`✅ Max amount set: ${maxSendable.toFixed(6)} BNB (gas: ~${gasCostEth.toFixed(6)} BNB)`);
      } else {
        // For tokens, show token balance
        if (!tokenAddress.trim() || !ethers.isAddress(tokenAddress.trim())) {
          showErrorModal('⚠️ Enter token contract address first.');
          return;
        }
        const tokenAddr = tokenAddress.trim();
        const contractRead = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
        const decimals = await contractRead.decimals();
        const tokenBalance = await contractRead.balanceOf(wallet.address);
        const balanceFormatted = ethers.formatUnits(tokenBalance, decimals);
        setSendAmount(parseFloat(balanceFormatted).toFixed(4));

        // Gas estimate must use signer contract — provider-only makes transfer() simulate from 0x0 (BEP20 revert)
        try {
          const contractSigner = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
          const testAmount = ethers.parseUnits('1', decimals);
          const gasEstimate = await contractSigner.transfer.estimateGas(wallet.address, testAmount);
          const gasPrice = await provider.getFeeData();
          const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
          const gasCostEth = parseFloat(ethers.formatEther(gasCost));
          setEstimatedGas(gasCostEth.toFixed(6));
          showSuccessModal(`✅ Max tokens: ${parseFloat(balanceFormatted).toFixed(4)} (gas: ~${gasCostEth.toFixed(6)} BNB)`);
        } catch (gasErr) {
          console.warn('Token gas estimate skipped:', gasErr);
          setEstimatedGas(null);
          showSuccessModal(`✅ Max tokens: ${parseFloat(balanceFormatted).toFixed(4)}`);
        }
      }
    } catch (err) {
      console.error('Max amount error:', err);
      showErrorModal('⚠️ Failed to calculate max amount. Check RPC and wallet.');
    }
  };

  type OnchainHistoryItem = {
    id: string;
    kind: 'onchain';
    assetSymbol: string;
    tokenAddress?: string;
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    createdAt: string;
  };

  const pushOnchainHistory = (item: Omit<OnchainHistoryItem, 'id' | 'kind' | 'createdAt'>) => {
    try {
      const userId = auth?.user?.id ?? 'guest';
      const key = `onchain_transfer_history_${userId}`;
      const raw = localStorage.getItem(key);
      const rows: OnchainHistoryItem[] = raw ? JSON.parse(raw) : [];
      const next: OnchainHistoryItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: 'onchain',
        createdAt: new Date().toISOString(),
        ...item,
      };
      localStorage.setItem(key, JSON.stringify([next, ...rows].slice(0, 500)));
    } catch (err) {
      console.warn('Failed to save on-chain transfer history locally:', err);
    }
  };

  const logOnchainTransferServer = async (payload: {
    fromAddress: string;
    toAddress: string;
    amount: string;
    txHash: string;
    assetSymbol: string;
    tokenAddress?: string;
    chain?: string;
  }) => {
    if (!auth?.token) return;
    try {
      await fetch(getApiUrl('onchain/transfers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Failed to persist on-chain transfer to server:', err);
    }
  };

  const handleSend = async () => {

    // Handle internal FDA transfers (zero fee)
    if (transferType === 'internal' && assetType === 'token' && tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()) {
      if (!auth) {
        showErrorModal('⚠️ Please login to use internal transfers.');
        return;
      }
      if (!sendTo.trim()) {
        showErrorModal('⚠️ Destination address is required.');
        return;
      }
      if (!ethers.isAddress(sendTo.trim())) {
        showErrorModal('⚠️ Destination address is invalid.');
        return;
      }
      if (!sendAmount || Number(sendAmount) <= 0) {
        showErrorModal('⚠️ Amount must be greater than zero.');
        return;
      }

      // Check if recipient is an MC wallet
      const recipientInfo = await checkIfFdaWallet(sendTo.trim());
      if (!recipientInfo) {
        showErrorModal('⚠️ Recipient address is not registered as an MC wallet. Click "Register This Address" above to enable zero-fee transfers, or use on-chain transfer instead.');
        return;
      }

      // Check internal balance
      if (internalFdaBalance === null || internalFdaBalance < Number(sendAmount)) {
        showErrorModal(`⚠️ Insufficient internal FDA balance. You have ${internalFdaBalance || 0} FDA, but trying to send ${sendAmount}.`);
        return;
      }

      try {
        // Processing message - no need to show modal for this
        if (!storedMeta?.address) {
          showErrorModal('⚠️ No wallet selected. Please select a wallet first.');
          return;
        }

        const res = await fetch(getApiUrl('internal/transfer'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            fromAddress: storedMeta.address,
            toAddress: sendTo.trim(),
            amount: Number(sendAmount),
            note: `Internal transfer to ${recipientInfo.fullName || recipientInfo.email || recipientInfo.walletLabel || 'MC Wallet'}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          showErrorModal(`⚠️ ${data.error || 'Failed to process internal transfer.'}`);
          return;
        }

        showSuccessModal(`✅ Internal transfer completed! ${sendAmount} tokens sent to ${recipientInfo.fullName || recipientInfo.email || recipientInfo.walletLabel || 'MC Wallet'} (Zero fee, instant)`);
        if (storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address);
        }
        setSendAmount('');
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        return;
      } catch (err) {
        console.error(err);
        showErrorModal('⚠️ Failed to process internal transfer. Please try again.');
        return;
      }
    }

    // On-chain transfers - use only unlocked local wallet (no MetaMask)
    if (!unlockedPrivateKeyRef.current) {
      showErrorModal('⚠️ Please unlock your wallet first before sending on-chain transactions.');
      return;
    }

    // Use unlocked local wallet
    const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
    const tempWallet = new ethers.Wallet(unlockedPrivateKeyRef.current);
    const walletAddress = tempWallet.address;
    const wallet = new ethers.Wallet(unlockedPrivateKeyRef.current, provider);

    if (!wallet || !walletAddress) {
      showErrorModal('⚠️ Failed to initialize wallet. Please try again.');
      return;
    }
    if (!sendTo.trim()) {
      showErrorModal('⚠️ Destination address is required.');
      return;
    }
    if (!ethers.isAddress(sendTo.trim())) {
      showErrorModal('⚠️ Destination address is invalid.');
      return;
    }
    if (!sendAmount || Number(sendAmount) <= 0) {
      showErrorModal('⚠️ Amount must be greater than zero.');
      return;
    }

    try {
      // Check sender's native balance (BNB) for gas fees
      const senderBalance = await provider.getBalance(walletAddress);
      const balanceEth = parseFloat(ethers.formatEther(senderBalance));

      if (assetType === 'native') {
        // For native transfers, need amount + gas fees
        const sendAmountWei = ethers.parseEther(sendAmount);
        const sendAmountEth = parseFloat(sendAmount);

        // Estimate gas
        const gasEstimate = await provider.estimateGas({
          from: walletAddress,
          to: sendTo.trim(),
          value: sendAmountWei,
        });
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));
        const totalNeeded = sendAmountEth + gasCostEth;

        if (balanceEth < totalNeeded) {
          showErrorModal(
            `⚠️ Insufficient BNB balance. You have ${balanceEth.toFixed(6)} BNB, but need ${totalNeeded.toFixed(6)} BNB (${sendAmountEth.toFixed(6)} + ~${gasCostEth.toFixed(6)} gas).`
          );
          return;
        }

        const tx = await wallet.sendTransaction({
          to: sendTo.trim(),
          value: sendAmountWei,
          gasLimit: gasEstimate,
        });
        showSuccessModal(`✅ Native transfer sent! Tx hash: ${tx.hash}. Waiting for confirmation...`);

        // Wait for confirmation
        const receipt = await tx.wait();
        if (receipt) {
          showSuccessModal(`✅ Transaction confirmed! Block: ${receipt.blockNumber}. Tx hash: ${tx.hash}`);
          pushOnchainHistory({
            assetSymbol: 'BNB',
            txHash: tx.hash,
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
          });
          void logOnchainTransferServer({
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
            txHash: tx.hash,
            assetSymbol: 'BNB',
            chain: 'BNB',
          });
        } else {
          showSuccessModal(`✅ Transaction sent! Tx hash: ${tx.hash}`);
          pushOnchainHistory({
            assetSymbol: 'BNB',
            txHash: tx.hash,
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
          });
          void logOnchainTransferServer({
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
            txHash: tx.hash,
            assetSymbol: 'BNB',
            chain: 'BNB',
          });
        }

        setTimeout(() => {
          window.location.reload();
        }, 2500);
      } else {
        // For token transfers, need BNB for gas only
        if (!tokenAddress.trim() || !ethers.isAddress(tokenAddress.trim())) {
          showErrorModal('⚠️ Valid token contract address is required.');
          return;
        }

        const contract = new ethers.Contract(tokenAddress.trim(), ERC20_ABI, wallet);
        const decimals: number = await contract.decimals();
        const amountWei = ethers.parseUnits(sendAmount, decimals);

        // Check token balance
        const tokenBalance = await contract.balanceOf(walletAddress);
        if (tokenBalance < amountWei) {
          const balanceFormatted = ethers.formatUnits(tokenBalance, decimals);
          showErrorModal(`⚠️ Insufficient token balance. You have ${parseFloat(balanceFormatted).toFixed(4)} tokens, but trying to send ${sendAmount}.`);
          return;
        }

        // Estimate gas for token transfer
        const gasEstimate = await contract.transfer.estimateGas(sendTo.trim(), amountWei);
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));

        if (balanceEth < gasCostEth) {
          showErrorModal(
            `⚠️ Insufficient BNB for gas fees. You have ${balanceEth.toFixed(6)} BNB, but need ~${gasCostEth.toFixed(6)} BNB for gas.`
          );
          return;
        }

        const tx = await contract.transfer(sendTo.trim(), amountWei);
        showSuccessModal(`✅ Token transfer sent! Tx hash: ${tx.hash}. Waiting for confirmation...`);

        // Wait for confirmation
        const receipt = await tx.wait();
        if (receipt) {
          showSuccessModal(`✅ Transaction confirmed! Block: ${receipt.blockNumber}. Tx hash: ${tx.hash}`);
          pushOnchainHistory({
            assetSymbol: tokenSymbol.trim() || 'TOKEN',
            tokenAddress: tokenAddress.trim(),
            txHash: tx.hash,
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
          });
          void logOnchainTransferServer({
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
            txHash: tx.hash,
            assetSymbol: tokenSymbol.trim() || 'TOKEN',
            tokenAddress: tokenAddress.trim(),
            chain: 'BNB',
          });
        } else {
          showSuccessModal(`✅ Transaction sent! Tx hash: ${tx.hash}`);
          pushOnchainHistory({
            assetSymbol: tokenSymbol.trim() || 'TOKEN',
            tokenAddress: tokenAddress.trim(),
            txHash: tx.hash,
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
          });
          void logOnchainTransferServer({
            fromAddress: walletAddress,
            toAddress: sendTo.trim(),
            amount: sendAmount,
            txHash: tx.hash,
            assetSymbol: tokenSymbol.trim() || 'TOKEN',
            tokenAddress: tokenAddress.trim(),
            chain: 'BNB',
          });
        }
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      }

      // Refresh balances after successful transfer
      if (storedMeta?.address) {
        setTimeout(() => fetchBalances(storedMeta.address), 2000);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = '⚠️ Failed to send transaction. ';
      if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMsg += 'Insufficient balance for transaction and gas fees.';
        } else if (err.message.includes('nonce')) {
          errorMsg += 'Transaction nonce error. Please try again.';
        } else if (err.message.includes('replacement fee too low')) {
          errorMsg += 'Gas price too low. Please try again.';
        } else {
          errorMsg += err.message;
        }
      } else {
        errorMsg += 'Check RPC URL, balances, and transaction details.';
      }
      showErrorModal(errorMsg);
    }
  };

  const loadAdminData = async () => {
    if (!auth || !auth.user.isAdmin) {
      showErrorModal('⚠️ Admin login required.');
      return;
    }
    try {
      const [tradesRes, disputesRes, usersRes] = await Promise.all([
        fetch(getApiUrl('admin/trades'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(getApiUrl('admin/disputes'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(getApiUrl('admin/users'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
      ]);
      const tradesData = await tradesRes.json();
      const disputesData = await disputesRes.json();
      const usersRaw = usersRes.ok ? await usersRes.json() : [];
      const usersData = Array.isArray(usersRaw) ? usersRaw : [];
      if (!tradesRes.ok) {
        showErrorModal(`⚠️ ${tradesData.error || 'Failed to load admin trades'}`);
        return;
      }
      if (!disputesRes.ok) {
        showErrorModal(`⚠️ ${disputesData.error || 'Failed to load admin disputes'}`);
        return;
      }
      setAdminTrades(tradesData);
      setAdminDisputes(enrichAdminDisputesFdaIds(disputesData, usersData));

      // Load settings
      const settingsRes = await fetch(getApiUrl('admin/settings'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const feeSetting = settingsData.find((s: any) => s.key === 'p2p_fee_rate');
        if (feeSetting) {
          const feeRate = parseFloat(feeSetting.value);
          setP2pFeeRate(feeRate);
          setNewFeeRate(feeSetting.value);
          console.log('✅ Admin panel loaded fee rate:', feeRate + '%');
        } else {
          // If not found in admin settings, fetch from public endpoint
          fetchP2PFeeRate();
        }

        const holdingSetting = settingsData.find((s: any) => s.key === 'holding_fda_amount');
        if (holdingSetting) {
          console.log('✅ Found holding setting in admin data:', holdingSetting);
          setHoldingFdaAmount(holdingSetting.value);
          setNewHoldingFda(holdingSetting.value);
          console.log('✅ Admin panel loaded holding FDA:', holdingSetting.value);
        } else {
          // If not found, set default to '0'
          console.warn('⚠️ Holding FDA amount setting not found in admin data, defaulting to 0');
          setHoldingFdaAmount('0');
          setNewHoldingFda('0');
        }

        const minOfferSetting =
          settingsData.find((s: any) => s.key === 'p2p_min_price_per_fda') ||
          settingsData.find((s: any) => s.key === 'p2p_min_offer_amount');
        const minOfferUsdtSetting = settingsData.find((s: any) => s.key === 'p2p_min_price_per_fda_usdt');
        if (minOfferSetting) {
          const minAmount = Number(minOfferSetting.value);
          if (Number.isFinite(minAmount) && minAmount > 0) {
            setP2pMinPricePerFda(minAmount);
          }
        } else {
          fetchP2PMinOfferAmount();
        }
        if (minOfferUsdtSetting?.value) {
          const mu = Number(minOfferUsdtSetting.value);
          if (Number.isFinite(mu) && mu > 0) {
            setP2pMinPricePerFdaUsdt(mu);
          }
        }
      } else {
        // If admin settings fail, try public endpoint for fee rate
        fetchP2PFeeRate();
        fetchP2PMinOfferAmount();
        // Try to fetch holding FDA amount from public endpoint
        try {
          const holdingRes = await fetch(getApiUrl('settings/holding-fda-amount'));
          if (holdingRes.ok) {
            const holdingData = await holdingRes.json();
            const holdingValue = holdingData.holdingAmount?.toString() || '0';
            setHoldingFdaAmount(holdingValue);
            setNewHoldingFda(holdingValue);
          }
        } catch (e) {
          console.error('Failed to fetch holding FDA amount:', e);
        }
      }
    } catch (e) {
      console.error(e);
      showErrorModal('⚠️ Unable to load admin data.');
    }
  };

  const updateFeeRate = async () => {
    if (!auth || !auth.user.isAdmin) return;

    // Allow empty string to be treated as 0
    const feeRateValue = newFeeRate.trim() === '' ? '0' : newFeeRate;
    const feeRateNum = parseFloat(feeRateValue);
    if (isNaN(feeRateNum) || feeRateNum < 0 || feeRateNum > 100) {
      showErrorModal('❌ Fee rate must be a number between 0 and 100');
      return;
    }

    // Ensure we send "0" as string, not empty
    const feeRateToSave = feeRateNum === 0 ? '0' : feeRateValue;

    setUpdatingFeeRate(true);
    try {
      const res = await fetch(getApiUrl('admin/settings/p2p_fee_rate'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ value: feeRateToSave }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedFeeRate = parseFloat(data.value);
        setP2pFeeRate(updatedFeeRate);
        setNewFeeRate(data.value);
        setEditingFeeRate(false);
        // Refresh fee rate to ensure consistency
        await fetchP2PFeeRate();
        showSuccessModal(`✅ P2P Trading Fee Rate updated to ${data.value}%`);
      } else {
        const errorData = await res.json();
        showErrorModal(errorData.error || 'Failed to update fee rate');
      }
    } catch (err) {
      console.error('Failed to update fee rate:', err);
      showErrorModal('❌ Failed to update fee rate. Please try again.');
    } finally {
      setUpdatingFeeRate(false);
    }
  };

  const updateHoldingFda = async () => {
    if (!auth || !auth.user.isAdmin) return;

    // Validate the input: must be a valid decimal number with up to 18 decimal places
    const trimmedValue = newHoldingFda.trim();
    if (trimmedValue === '' || trimmedValue === '.') {
      showErrorModal('❌ Please enter a valid holding FDA amount');
      return;
    }

    // Validate format: number with optional decimal and up to 18 decimal places
    if (!/^\d+(\.\d{0,18})?$/.test(trimmedValue)) {
      showErrorModal('❌ Invalid format. Please enter a number with up to 18 decimal places (e.g., 2.000250 or 0.000000000000000000)');
      return;
    }

    const holdingNum = parseFloat(trimmedValue);
    if (isNaN(holdingNum) || holdingNum < 0) {
      showErrorModal('❌ Holding FDA amount must be a number >= 0');
      return;
    }

    setUpdatingHoldingFda(true);
    try {
      const res = await fetch(getApiUrl('admin/settings/holding_fda_amount'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ value: trimmedValue }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Backend response after update:', data);
        const updatedValue = data.value || trimmedValue;
        console.log('✅ Setting holding FDA amount to:', updatedValue);
        setHoldingFdaAmount(updatedValue);
        setNewHoldingFda(updatedValue);
        setEditingHoldingFda(false);
        // Reload admin data to ensure everything is in sync
        await loadAdminData();
        console.log('✅ After loadAdminData, holdingFdaAmount should be:', updatedValue);
        showSuccessModal(`✅ Holding FDA Amount updated to ${updatedValue} FDA`);
      } else {
        const errorData = await res.json();
        showErrorModal(errorData.error || 'Failed to update holding FDA amount');
      }
    } catch (err) {
      console.error('Failed to update holding FDA amount:', err);
      showErrorModal('❌ Failed to update holding FDA amount. Please try again.');
    } finally {
      setUpdatingHoldingFda(false);
    }
  };

  const fetchTokenInfo = async (address: string) => {
    if (!address.trim() || !ethers.isAddress(address.trim())) {
      showErrorModal('⚠️ Please enter a valid token contract address.');
      return;
    }

    setTokenInfoLoading(true);
    setMessage(null);
    try {
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
      const tokenContract = new ethers.Contract(address.trim(), ERC20_ABI, provider);

      const [name, symbol] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
      ]);

      setNewTokenName(name || '');
      setNewTokenSymbol(symbol || '');
      showSuccessModal(`✅ Token info fetched: ${name} (${symbol})`);
    } catch (err) {
      console.error('Failed to fetch token info:', err);
      showErrorModal('⚠️ Failed to fetch token info. Make sure the address is a valid ERC-20 token contract.');
    } finally {
      setTokenInfoLoading(false);
    }
  };

  // const handleAddCustomToken = () => {
  //   if (!newTokenAddress.trim() || !ethers.isAddress(newTokenAddress.trim())) {
  //     showErrorModal('⚠️ Please enter a valid token contract address.');
  //     return;
  //   }
  //   if (!newTokenSymbol.trim()) {
  //     showErrorModal('⚠️ Please enter a token symbol or fetch token info first.');
  //     return;
  //   }

  //   const token: CustomToken = {
  //     address: newTokenAddress.trim(),
  //     symbol: newTokenSymbol.trim().toUpperCase(),
  //     name: newTokenName.trim() || undefined,
  //   };

  //   if (addCustomToken(token, auth?.user.id)) {
  //     setCustomTokens(loadCustomTokens(auth?.user.id));
  //     setNewTokenAddress('');
  //     setNewTokenSymbol('');
  //     setNewTokenName('');
  //     showSuccessModal(`✅ Token ${token.symbol} added successfully.`);
  //     // Refresh balances if we have an address
  //     if (storedMeta?.address) {
  //       fetchBalances(storedMeta.address);
  //     } else if (checkAddress) {
  //       fetchBalances(checkAddress);
  //     }
  //   } else {
  //     showErrorModal('⚠️ Token already exists in your list.');
  //   }
  // };


  const handleAddCustomToken = async () => {

    if (!newTokenAddress.trim() || !ethers.isAddress(newTokenAddress.trim())) {
      showErrorModal('⚠️ Please enter a valid token contract address.');
      return;
    }

    if (!newTokenSymbol.trim()) {
      showErrorModal('⚠️ Please enter a token symbol or fetch token info first.');
      return;
    }

    const token: CustomToken = {
      address: newTokenAddress.trim(),
      symbol: newTokenSymbol.trim().toUpperCase(),
      name: newTokenName.trim() || undefined,
    };

    try {

      const res = await fetch(
        "https://merchantcoinwallet.com/api/customTokens",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            contract_address: token.address,   // ✅ renamed
            token_symbol: token.symbol,
            token_name: token.name,
            status: "ON"                       // ✅ enum instead of enabled
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save token");
      }

      if (data.alreadyExists?.length) {

        showErrorModal("⚠️ Token already added in custom wallets");

        return;
      }
      // reload tokens from DB
      await fetchCustomTokens();

      setNewTokenAddress('');
      setNewTokenSymbol('');
      setNewTokenName('');

      showSuccessModal(`✅ Token ${token.symbol} added successfully.`);

      if (storedMeta?.address)
        fetchBalances(storedMeta.address);
      else if (checkAddress)
        fetchBalances(checkAddress);

    }
    catch (err: any) {
      showErrorModal(`⚠️ ${err.message}`);
    }

  };

  useEffect(() => {

    if (auth?.token) {
      fetchCustomTokens();
    }

  }, [auth]);
  const fetchCustomTokens = async () => {

    if (!auth?.token) return;

    try {

      const res = await fetch(getApiUrl("customTokens"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (res.status === 401) {
        onUnauthorizedApi();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Request failed (${res.status})`,
        );
      }

      const mapped = data.tokens.map((t: any) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        status: t.status,
        enabled: t.status === "ON"
      }));
      setCustomTokens(mapped);

      if (storedMeta?.address && ethers.isAddress(storedMeta.address)) {
        await fetchBalances(storedMeta.address, mapped);
      }

    }
    catch (err) {
      console.error(err);
    }

  };


  const handleToggleCustomToken = async (address: string) => {
    try {

      const token = customTokens.find(
        t => t.address.toLowerCase() === address.toLowerCase()
      );

      if (!token || token.status === "GLOBAL") return;

      const newStatus = token.status === "ON" ? "OFF" : "ON";

      const res = await fetch(
        getApiUrl(`customTokens/${address}/status`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      await fetchCustomTokens();

    } catch (err: any) {
      showErrorModal(err.message);
    }
  };
  const handleRemoveCustomToken = (address: string) => {
    if (removeCustomToken(address, auth?.user.id)) {
      setCustomTokens(loadCustomTokens(auth?.user.id));
      const newBalances = { ...customTokenBalances };
      delete newBalances[address.toLowerCase()];
      setCustomTokenBalances(newBalances);
      showSuccessModal('✅ Token removed successfully.');
    }
  };

  // const handleToggleCustomToken = (address: string) => {
  //   if (toggleCustomToken(address, auth?.user.id)) {
  //     setCustomTokens(loadCustomTokens(auth?.user.id));
  //     // State is updated silently, no modal needed
  //   }
  // };

  const handleSwitchWallet = (walletId: string) => {
    setActiveWalletId(walletId);
    refreshWallets();
    showSuccessModal('✅ Wallet switched successfully.');
    // Refresh balances for the new wallet
    const userWallets = getUserWallets();
    const newMeta = userWallets.find(w => w.id === walletId);
    if (newMeta?.address) {
      fetchBalances(newMeta.address);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    // Find wallet to get address for FDA balance check
    const walletToDelete = allWallets.find(w => w.id === walletId);
    const walletAddress = walletToDelete?.address;

    // Find database wallet ID from registered wallets (by address match)
    const dbWallet = registeredFdaWallets.find((w: any) =>
      w.address?.toLowerCase() === walletAddress?.toLowerCase()
    );
    const dbWalletId = dbWallet?.id;

    if (window.confirm('Are you sure you want to delete this wallet? This action cannot be undone. Make sure you have your seed phrase backed up!')) {
      // If authenticated and wallet exists in database, delete from database (which will check FDA balance)
      if (auth && dbWalletId) {
        try {
          const res = await fetch(getApiUrl(`wallets/${dbWalletId}`), {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
          });

          // Check if response is JSON
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('[Delete Wallet] Non-JSON response:', text.substring(0, 200));
            if (res.status === 404) {
              showErrorModal(`⚠️ Wallet deletion endpoint not found (404). The wallet may have already been deleted, or the backend route is missing.`);
            } else {
              showErrorModal(`⚠️ Failed to delete wallet: Server returned non-JSON response (${res.status})`);
            }
            return;
          }

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            if (errorData.error?.includes('FDA balance')) {
              showErrorModal(`⚠️ ${errorData.error}\n\nPlease transfer or use your FDA balance before deleting this wallet.`);
              return;
            }
            showErrorModal(`⚠️ Failed to delete wallet: ${errorData.error || 'Unknown error'}`);
            return;
          }

          const data = await res.json();
          // Successfully deleted from database
          console.log('[Delete Wallet] ✅ Wallet deleted from database:', data);
        } catch (err: any) {
          console.error('[Delete Wallet] Error deleting from database:', err);
          if (err.message?.includes('JSON')) {
            showErrorModal(`⚠️ Failed to delete wallet: Server returned invalid response. Please check if the backend server is running and the route exists.`);
          } else {
            showErrorModal(`⚠️ Failed to delete wallet from database: ${err.message || 'Please try again.'}`);
          }
          return;
        }
      }

      // Delete from local storage
      if (auth) {
        const userWalletsKey = `fda_wallets_user_${auth.user.id}`;
        const raw = localStorage.getItem(userWalletsKey);
        if (raw) {
          try {
            const wallets = JSON.parse(raw);
            const filtered = wallets.filter((w: any) => w.meta.id !== walletId);
            localStorage.setItem(userWalletsKey, JSON.stringify(filtered));

            // If we deleted the active wallet, switch to another
            if (getActiveWalletId() === walletId) {
              if (filtered.length > 0) {
                setActiveWalletId(filtered[0].meta.id);
              } else {
                localStorage.removeItem('fda_active_wallet_id');
              }
            }
          } catch (err) {
            console.error('Failed to delete wallet from localStorage:', err);
          }
        }
      } else {
        clearEncryptedWallet(walletId);
      }

      refreshWallets();
      showSuccessModal('✅ Wallet deleted successfully');
      // Clear unlocked key if it was for the deleted wallet
      unlockedPrivateKeyRef.current = null;
      setWalletUnlockEpoch((n) => n + 1);
      // Refresh balances
      const userWallets = getUserWallets();
      const activeId = getActiveWalletId();
      const newMeta = activeId
        ? userWallets.find(w => w.id === activeId) || userWallets[0]
        : userWallets[0];
      if (newMeta?.address) {
        fetchBalances(newMeta.address);
      } else {
        setNativeBalance(null);
        setFdaBalance(null);
        setCustomTokenBalances({});
      }
    }
  };

  const handleRenameWallet = (walletId: string, newLabel: string) => {
    if (newLabel.trim()) {
      updateWalletLabel(walletId, newLabel.trim());
      refreshWallets();
      showSuccessModal('✅ Wallet renamed successfully.');
    }
  };

  const handleLogout = () => {
    // localStorage.removeItem(AUTH_KEY);
    localStorage.clear();
    navigate('/login');
  };

  // Filter and paginate offers
  const filteredOffers = offers.filter((offer) => {
    // Handle both camelCase and snake_case field names
    const assetSymbol = offer.assetSymbol || offer.asset_symbol || '';
    const fiatCurrency = offer.fiatCurrency || offer.fiat_currency || '';
    const paymentMethods = offer.paymentMethods || offer.payment_methods || '';
    const offerType = String(offer.type || '').toUpperCase().trim();
    const status = String(offer.status || 'OPEN').toUpperCase().trim();

    // CRITICAL: Filter out offers with 0 remaining/available amount
    const remaining = parseFloat(String(offer.remaining ?? offer.available_amount ?? 0));
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return false; // Don't show offers with 0 or negative available amount
    }

    // Filter offers by type (BUY, SELL, or ALL)
    const makerEmail = String(offer?.maker?.email || '').toLowerCase();
    const makerPhone = String(offer?.maker?.phone || '').toLowerCase();
    const makerFdaRaw =
      offer?.maker?.fdaUserId ||
      offer?.maker?.fda_user_id ||
      (Number(offer?.maker?.id) === Number(auth?.user?.id) ? auth?.user?.fdaUserId : null);
    const makerFda = String(makerFdaRaw || '').toLowerCase();
    const matchesSearch = !offersSearch ||
      assetSymbol.toLowerCase().includes(offersSearch.toLowerCase()) ||
      fiatCurrency.toLowerCase().includes(offersSearch.toLowerCase()) ||
      paymentMethods.toLowerCase().includes(offersSearch.toLowerCase()) ||
      makerEmail.includes(offersSearch.toLowerCase()) ||
      makerPhone.includes(offersSearch.toLowerCase()) ||
      makerFda.includes(offersSearch.toLowerCase());
    const matchesType = offersFilterType === 'ALL' || offerType === offersFilterType;
    return matchesSearch && matchesType && status === 'OPEN';
  });

  const totalPages = Math.ceil(filteredOffers.length / offersPerPage);
  const paginatedOffers = filteredOffers.slice(
    (offersPage - 1) * offersPerPage,
    offersPage * offersPerPage
  );

  const handleSetActiveTab = (tab: Tab) => {
    setActiveTab(tab);
    // Close sidebar on mobile when a tab is selected
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };


  /** Helper funtion to define the structure of the table  */

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
  // Get the custom token in the mobile view 
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

  /** USD line on mobile home for API/custom tokens (popularTokens effect does not cover JW, etc.). */
  useEffect(() => {
    let cancelled = false;
    const addrs = customTokens
      .map((t) => t.address)
      .filter((a) => a && ethers.isAddress(a));
    if (addrs.length === 0) return;
    const run = async () => {
      const additions: Record<string, number> = {};
      await Promise.all(
        addrs.map(async (addr) => {
          try {
            const res = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${addr}`
            );
            const data = await res.json();
            const price = getBestPrice(data);
            if (Number.isFinite(price) && price > 0) {
              additions[addr.toLowerCase()] = price;
              additions[addr] = price;
            }
          } catch {
            /* ignore */
          }
        })
      );
      if (!cancelled && Object.keys(additions).length > 0) {
        setTokenPrices((prev) => ({ ...prev, ...additions }));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [customTokens]);

  const mobileWalletTitle = useMemo(() => {
    const raw = storedMeta?.label?.trim();
    const addr = storedMeta?.address;
    const walletIndex =
      storedMeta && allWallets.length > 0
        ? allWallets.findIndex((w) => w.id === storedMeta.id) + 1
        : 0;
    if (raw && !/^new$/i.test(raw)) return raw;
    if (walletIndex > 0) return `Wallet ${walletIndex}`;
    if (addr && addr.length > 10) {
      return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    }
    if (addr) return addr;
    return "Wallet";
  }, [storedMeta?.label, storedMeta?.address, storedMeta?.id, allWallets]);

    const loadFdaPrice = async () => {
    try {
      const priceUrl = getApiUrl("fdaPrice");
      const res = await fetch(priceUrl);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          const nextPrice = Number(data?.data ?? data?.price ?? data?.fda_price ?? 0);
          if (Number.isFinite(nextPrice) && nextPrice > 0) {
            setFdaPrice(nextPrice);
            return;
          }
        }
      }

      // Fallback to profile price if /fdaPrice is unavailable or empty.
      if (auth?.token) {
        const profileRes = await fetch(getApiUrl("auth/profile"), {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!profileRes.ok) return;
        const profile = await profileRes.json().catch(() => ({}));
        const profilePrice = Number(profile?.fda_price ?? 0);
        if (Number.isFinite(profilePrice) && profilePrice > 0) {
          setFdaPrice(profilePrice);
        }
      }
  
    } catch (err) {
      console.error("Failed to load FDA price:", err);
    }
  };
  
  useEffect(() =>{
  loadFdaPrice()
  },[])

  const handleChangeTab = (tab: string) => {
  setActiveTab(tab);

  // optional: close sidebar on mobile
  if (useMobileLayout) {
    setSidebarOpen(false);
  }
};

const normalizePaymentLabel = (raw: any) => {
  const text = String(raw || '').trim();
  if (!text) return 'Payment method';
  const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return text;
};

const normalizeOfferPaymentMethods = (offer: any) => {
  const raw = offer?.sellerPaymentMethods ?? offer?.paymentMethods ?? offer?.payment_method ?? null;
  if (!raw) return [] as any[];
  let methods: any = raw;
  if (typeof methods === 'string') {
    try {
      methods = JSON.parse(methods);
    } catch {
      return String(methods)
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => ({ paymentname: normalizePaymentLabel(m), payment_method: m }));
    }
  }
  if (!Array.isArray(methods)) methods = [methods];
  return methods.filter(Boolean);
};

const copyFieldValue = async (value: string, label = 'Value') => {
  try {
    await navigator.clipboard.writeText(value);
  } catch (_err) {
    // Keep copy action silent to avoid blocking popup overlays.
  }
};

const resolveQrCodeValue = (pm: any) => {
  const possible = [
    pm?.qr_code,
    pm?.qrCode,
    pm?.qr,
    pm?.qr_image,
    pm?.qrImage,
    pm?.image,
    pm?.image_url,
    pm?.imageUrl,
  ];
  const raw = possible.find((v) => String(v || '').trim().length > 0);
  const text = String(raw || '').trim();
  if (!text) return '';
  if (text.startsWith('data:image') || text.startsWith('http://') || text.startsWith('https://')) {
    return text;
  }
  // Support relative/static image paths returned by backend (e.g. /uploads/qr.png).
  if (text.startsWith('/')) return text;
  if (text.startsWith('uploads/') || text.startsWith('./uploads/')) return `/${text.replace(/^\.?\//, '')}`;
  // Some rows store raw base64 without data URI prefix.
  if (/^[A-Za-z0-9+/=\s]+$/.test(text)) {
    return `data:image/png;base64,${text.replace(/\s+/g, '')}`;
  }
  return '';
};

const formatPaymentFieldLabel = (key: string) => {
  const k = String(key || '').trim().toLowerCase();
  if (k === 'upi_id') return 'UPI ID';
  if (k === 'usdt_address') return 'USDT address';
  if (k === 'ifsc' || k === 'ifsc_code') return 'IFSC Code';
  if (k === 'payment_method') return 'Payment Method';
  if (k === 'paymentname') return 'Payment';
  return k
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const getPaymentDetailRows = (pm: any) => {
  if (!pm || typeof pm !== 'object') return [] as Array<{ key: string; label: string; value: string }>;
  const skip = new Set([
    'id', 'user_id', 'is_active', 'created_at', 'updated_at',
    'paymentname', 'payment_method', 'method',
    'qr_code', 'qrCode', 'qr', 'qr_image', 'qrImage', 'image', 'image_url', 'imageUrl',
  ]);
  const orderedKeys = [
    'upi_id', 'usdt_address', 'name', 'account_holder', 'bank_account', 'account_number', 'card_number',
    'ifsc', 'ifsc_code', 'bank_name', 'account_type', 'branch', 'opening_branch',
  ];
  const allKeys = Object.keys(pm);
  const finalKeys = [
    ...orderedKeys.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !orderedKeys.includes(k)),
  ];
  return finalKeys
    .filter((k) => !skip.has(k))
    .map((k) => ({ key: k, label: formatPaymentFieldLabel(k), value: String(pm[k] ?? '').trim() }))
    .filter((r) => r.value.length > 0 && r.value.toLowerCase() !== 'null');
};

  if (!isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#f8fafc',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Mobile Only</h2>
          <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
            This website is available only on mobile devices. Please open it on your phone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      id="dashboard-root"
      className={
        useMobileLayout
          ? "min-h-screen min-h-[100dvh] mobile-app-shell bg-[#f2f4f6] text-slate-900"
          : "min-h-screen bg-slate-950 text-slate-50"
      }
    >
      {/* Mobile Menu Toggle Button */}
     {useMobileLayout && (
       <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', paddingBlock: 12, paddingInline: 16, position: 'sticky', top: 0, zIndex: 999, color: '#0f172a', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(15,23,42,0.06)'}}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowWalletModal(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowWalletModal(true);
            }
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
            fontSize: 15,
            maxWidth: "min(200px, 55vw)",
          }}
          aria-label="Switch wallet"
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={storedMeta?.address || undefined}
          >
            {mobileWalletTitle}
          </span>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 12, opacity: 0.7, flexShrink: 0 }}></i>
        </div>

      
         <div style={{display: 'flex', alignItems: 'center'}}>
        <div style={{marginRight: 14, cursor: 'pointer', padding: 8}} onClick={() => setShowWalletModal(true)} aria-label="Copy address">
          <i className="fa-regular fa-copy" style={{ fontSize: 18 }}></i>
        </div>
         <span
         style={{cursor : 'pointer', padding: 8, fontSize: 20, lineHeight: 1}}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? '✕' : '☰'}

        </span>
       </div>
      

      </div>
     )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        id="dashboard-container"
        className="flex max-w-7xl mx-auto"
        style={{
          alignItems: "flex-start",
          paddingBottom: useMobileLayout ? 0 : 60,
          display: useMobileLayout ? "flex" : "block",
        }}
      >
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          auth={auth}
          onLogout={handleLogout}
          isMobileOpen={sidebarOpen}
          sideBarClose={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

       
         {/* Main content */}
        <main
          id="main-content"
          className="flex-1 main-container"
          style={{
            padding: useMobileLayout ? "12px 12px 0" : "2.5rem",
            paddingBottom: useMobileLayout
              ? "calc(92px + env(safe-area-inset-bottom, 0px))"
              : undefined,
            boxSizing: "border-box",
            width: useMobileLayout ? "100%" : undefined,
          }}
        >
          {/* Top Header with Profile and Balances */}
          {useMobileLayout ? ('') : (
            <TopHeader
            auth={auth}
            internalFdaBalance={internalFdaBalance}
            storedMeta={storedMeta}
            allWallets={allWallets}
            registeredFdaWallets={registeredFdaWallets}
            onProfileClick={() => setActiveTab('profile')}
            onSwitchWallet={handleSwitchWallet}
          />
          )}

        

          
          

          {useMobileLayout && activeTab === 'dashboard' && (
            <div style={{ backgroundColor: MM.pageBg, width: "100%", minHeight: "100%" }}>
              <MobileDashboard
              auth={auth}
              price={fdaPrice}
              change="0 (-0.01%)"
              walletAddress={storedMeta?.address || null}
              actions={[
                { label: "Buy", icon: "fa-solid fa-dollar-sign", changeTab: () => handleChangeTab('p2p') },
                { label: "Swap", icon: "fa-solid fa-right-left", changeTab: () => setShowSwapModal(true) },
                {
                  label: "Send",
                  icon: "fa-solid fa-arrow-up-right-from-square",
                  changeTab: () => {
                    setSendSkipAssetPickerStep(false);
                    handleChangeTab('send');
                  },
                },
                { label: "Receive", icon: "fa-solid fa-arrow-down", changeTab: () => setShowWalletModal(true) },
              ]}
              tokens={popularTokens}
              tokenPrices={tokenPrices}
              nativeBalance={nativeBalance}
              fdaBalance={fdaBalance}
              customTokens={customTokens}
              customTokenBalances={customTokenBalances}
              allWallets={allWallets}
              indiAction={() => setActiveTab('tokens')}
              internalFdaBalance={internalFdaBalance}
              setActiveTab={handleChangeTab}
              onAssetClick={(row) => {
                switch (row.assetKind) {
                  case 'bnb':
                    setSendSkipAssetPickerStep(true);
                    setAssetType('native');
                    setTransferType('onchain');
                    handleChangeTab('send');
                    break;
                  case 'fda-internal':
                    setSendSkipAssetPickerStep(true);
                    setAssetType('token');
                    setTokenAddress(FDA_TOKEN_ADDRESS);
                    setTransferType('internal');
                    handleChangeTab('send');
                    break;
                  case 'fda-chain':
                    setSendSkipAssetPickerStep(true);
                    setAssetType('token');
                    setTokenAddress(FDA_TOKEN_ADDRESS);
                    setTransferType('onchain');
                    handleChangeTab('send');
                    break;
                  case 'custom':
                    if (row.tokenAddress) {
                      setSendSkipAssetPickerStep(true);
                      setAssetType('token');
                      setTokenAddress(row.tokenAddress);
                      setTransferType('onchain');
                      handleChangeTab('send');
                    }
                    break;
                  default:
                    break;
                }
              }}
            />
            </div>
          )}
          
          {!useMobileLayout &&  activeTab === 'dashboard' && (
            <div id="wallet-overview-card" className="bg-card mb-6 card">
              <div id="wallet-overview-header" className="card-header">
                <p id="wallet-overview-title" className="card-title">Wallet overview</p>
                {(storedMeta?.address || checkAddress) && (
                  <button
                    id="refresh-balance-btn"
                    className={`btn btn-yellow text-xs px-2 py-1 ${balanceLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      const addr = checkAddress || storedMeta?.address;
                      if (addr) fetchBalances(addr);
                      if (auth && addr) {
                        fetchInternalBalance(addr);
                      }
                    }}
                    disabled={balanceLoading}
                  >
                    {balanceLoading ? 'Loading...' : '🔄 Refresh'}
                  </button>
                )}
              </div>
              <div id="wallet-address-input-group" className="form-group">
                <input
                  id="wallet-address-input"
                  type="text"
                  className="form-input mb-3 text-sm py-2"
                  placeholder="Enter wallet address to check balance (e.g. 0x817C0B006b8B85d0807F48A1489b470C52A0DeB6)"
                  value={checkAddress}
                  onChange={(e) => setCheckAddress(e.target.value)}
                />
                <button
                  id="check-balance-btn"
                  className={`btn btn-yellow text-sm py-2 px-4 ${(!checkAddress || balanceLoading) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (checkAddress && ethers.isAddress(checkAddress)) {
                      fetchBalances(checkAddress);
                    } else {
                      showErrorModal('⚠️ Please enter a valid wallet address.');
                    }
                  }}
                  disabled={balanceLoading || !checkAddress}
                >
                  Check Balance
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  💡 You can only check balance for your own wallets
                </p>
              </div>
              {allWallets.length > 0 && (
                <div id="wallet-selector-group" className="form-group">
                  <p className="text-xs text-slate-400 mb-2">Active Wallet ({allWallets.length} total)</p>
                  <select
                    id="wallet-selector"
                    className="form-select-dark"
                    value={storedMeta?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSwitchWallet(e.target.value);
                      }
                    }}
                  >
                    {allWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.label || `Wallet ${wallet.id.slice(-6)}`} - {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {storedMeta && (
                <div id="active-wallet-display" className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-slate-400">
                    Active wallet:{' '}
                  </p>
                  <span className="font-mono text-xs text-slate-300 flex-1">
                    {storedMeta.address}
                  </span>
                  <button
                    className="copy-address-btn-small"
                    onClick={() => {
                      navigator.clipboard.writeText(storedMeta.address).then(() => {
                        showSuccessModal('✅ Wallet address copied to clipboard!');
                      });
                    }}
                    title="Copy wallet address"
                  >
                    ⧉
                  </button>
                </div>
              )}
              <DashboardView
                auth={auth}
                storedMeta={storedMeta}
                checkAddress={checkAddress}
                balanceLoading={balanceLoading}
                nativeBalance={nativeBalance}
                fdaBalance={fdaBalance}
                internalFdaBalance={internalFdaBalance}
                customTokens={customTokens}
                customTokenBalances={customTokenBalances}
                onSetActiveTab={setActiveTab}
              />
            </div>
          )}

          {activeTab === 'create' && (
            <CreateWallet
              mnemonic12={mnemonic12}
              extraWord={extraWord}
              walletPassword={walletPassword}
              walletLabel={walletLabel}
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
              onGenerateSeed={handleGenerateSeed}
              onExtraWordChange={setExtraWord}
              onPasswordChange={setWalletPassword}
              onLabelChange={setWalletLabel}
              onSaveWallet={handleSaveNewWallet}
            />
          )}

          {activeTab === 'import' && (
            <ImportWallet
              importSeed={importSeed}
              importExtraWord={importExtraWord}
              walletPassword={walletPassword}
              importWalletLabel={importWalletLabel}
              selectedNetwork={selectedNetwork}
              isRegistered={!!auth}
              onNetworkChange={setSelectedNetwork}
              onSeedChange={setImportSeed}
              onExtraWordChange={setImportExtraWord}
              onPasswordChange={setWalletPassword}
              onLabelChange={setImportWalletLabel}
              onImport={handleImportWallet}
            />
          )}

          {activeTab === 'unlock' && (
            <UnlockWallet
              allWallets={allWallets}
              registeredFdaWallets={registeredFdaWallets}
              selectedWalletId={selectedUnlockWalletId}
              unlockExtraWord={unlockExtraWord}
              unlockPassword={unlockPassword}
              onWalletChange={setSelectedUnlockWalletId}
              onExtraWordChange={setUnlockExtraWord}
              onPasswordChange={setUnlockPassword}
              onUnlock={handleUnlock}
            />
          )}

          {activeTab === 'send' && (
            <SendTransfer
              key={`send-${unlockedPrivateKeyRef.current ? "unlocked" : "locked"}`}
              requestGasEstimate={requestGasEstimate}
              storedMeta={storedMeta}
              allWallets={allWallets}
              auth={auth}
              sendTo={sendTo}
              setSendTo={setSendTo}
              sendAmount={sendAmount}
              setSendAmount={setSendAmount}
              assetType={assetType}
              setAssetType={setAssetType}
              tokenAddress={tokenAddress}
              setTokenAddress={setTokenAddress}
              transferType={transferType}
              setTransferType={setTransferType}
              estimatedGas={estimatedGas}
              estimatingGas={estimatingGas}
              nativeBalance={nativeBalance}
              fdaBalance={fdaBalance}
              internalFdaBalance={internalFdaBalance}
              recipientFdaWallet={recipientFdaWallet}
              unlockedPrivateKeyRef={unlockedPrivateKeyRef}
              handleSend={handleSend}
              handleMaxAmount={handleMaxAmount}
              registerRecipientWallet={registerRecipientWallet}
              goto={() => openUnlockTab('send')}
              customTokens={customTokens}
              customTokenBalances={customTokenBalances}
              fdaPrice={fdaPrice}
              skipAssetPickerStep={sendSkipAssetPickerStep}
              onExit={() => {
                setSendSkipAssetPickerStep(false);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'tokens' && (
            <CustomTokens
              newTokenAddress={newTokenAddress}
              onAddressChange={setNewTokenAddress}
              newTokenSymbol={newTokenSymbol}
              onSymbolChange={setNewTokenSymbol}
              newTokenName={newTokenName}
              onNameChange={setNewTokenName}
              tokenInfoLoading={tokenInfoLoading}
              customTokenBalances={customTokenBalances}
              onFetchTokenInfo={fetchTokenInfo}
              onAddToken={handleAddCustomToken}
              customTokens={customTokens}
              onRemoveToken={handleRemoveCustomToken}
              onToggleToken={handleToggleCustomToken}
              isValidAddress={(address: string) => ethers.isAddress(address)}
            />
          )}

          {activeTab === 'wallets' && (
            <ManageWallets
              allWallets={allWallets}
              storedMeta={storedMeta}
              editingWalletId={editingWalletId}
              editWalletLabel={editWalletLabel}
              onEditLabelChange={setEditWalletLabel}
              onStartEdit={(walletId: string, currentLabel: string) => {
                setEditingWalletId(walletId);
                setEditWalletLabel(currentLabel);
              }}
              onCancelEdit={() => {
                setEditingWalletId(null);
                setEditWalletLabel('');
              }}
              onSaveEdit={handleRenameWallet}
              onSwitchWallet={handleSwitchWallet}
              onDeleteWallet={handleDeleteWallet}
            />
          )}

          {activeTab === 'fdawallets' && (
            <FDAWallets
              auth={auth}
              registeredFdaWallets={registeredFdaWallets}
              allWallets={allWallets}
              newFdaWalletAddress={newFdaWalletAddress}
              setNewFdaWalletAddress={setNewFdaWalletAddress}
              newFdaWalletLabel={newFdaWalletLabel}
              setNewFdaWalletLabel={setNewFdaWalletLabel}
              registeringWallet={registeringWallet}
              handleCreateAndRegisterFdaWallet={handleCreateAndRegisterFdaWallet}
              registerRecipientWallet={registerRecipientWallet}
            />
          )}

          {activeTab === 'hold-fda' && (
            <HoldFdaProgram
              auth={auth}
              walletAddress={storedMeta?.address || null}
              onHoldingStarted={() => {
                if (storedMeta?.address) {
                  void fetchInternalBalance(storedMeta.address);
                }
              }}
              onShowSuccessModal={showSuccessModal}
              onShowErrorModal={showErrorModal}
            />
          )}

          {activeTab === 'metamask' && (
            <MetaMaskConnect
              auth={auth}
              storedMeta={storedMeta}
              metamaskAddress={metamaskAddress}
              metamaskConnected={metamaskConnected}
              connectingMetaMask={connectingMetaMask}
              fdaPrivateKey={fdaPrivateKey}
              showPrivateKey={showPrivateKey}
              registeringWallet={registeringWallet}
              unlockedPrivateKeyRef={unlockedPrivateKeyRef}
              setActiveTab={setActiveTab}
              connectMetaMask={connectMetaMask}
              registerMetaMaskAsFdaWallet={registerMetaMaskAsFdaWallet}
              exportFdaWalletToMetaMask={exportFdaWalletToMetaMask}
              metamaskAccounts={metamaskAccounts}
              showMetamaskAccountSelector={showMetamaskAccountSelector}
              setShowMetamaskAccountSelector={setShowMetamaskAccountSelector}
              connectToMetamaskAccount={connectToMetamaskAccount}
              getMetamaskAccounts={getMetamaskAccounts}
            />
          )}

          {activeTab === 'p2p' && (
            <P2PTrading
              inMobileShell={useMobileLayout}
              auth={auth}
              canUseUsdt={/^0x[a-fA-F0-9]{40}$/i.test((p2pUsdtPayoutAddress || '').trim())}
              internalFdaBalance={internalFdaBalance}
              internalFdaUsable={internalFdaUsable}
              internalFdaLocked={internalFdaLocked}
              p2pFeeRate={p2pFeeRate}
              p2pMinPricePerFda={p2pMinPricePerFda}
              p2pMinPricePerFdaUsdt={p2pMinPricePerFdaUsdt}
              addFdaAmount={addFdaAmount}
              setAddFdaAmount={setAddFdaAmount}
              addingFdaBalance={addingFdaBalance}
              offerType={offerType}
              setOfferType={setOfferType}
              offerFiatCurrency={offerFiatCurrency}
              setOfferFiatCurrency={setOfferFiatCurrency}
              offerAmount={offerAmount}
              setOfferAmount={setOfferAmount}
              offerPrice={offerPrice}
              setOfferPrice={setOfferPrice}
              offerMinLimit={offerMinLimit}
              setOfferMinLimit={setOfferMinLimit}
              offerMaxLimit={offerMaxLimit}
              setOfferMaxLimit={setOfferMaxLimit}
              offerPaymentMethods={offerPaymentMethods}
              setOfferPaymentMethods={setOfferPaymentMethods}
              creatingOffer={creatingOffer}
              myTrades={myTrades}
              releasingTokens={releasingTokens}
              disputingTrade={disputingTrade}
              cancellingTrade={cancellingTrade}
              cancelTrade={cancelTrade}
              setSelectedTradeForPayment={setSelectedTradeForPayment}
              setPaymentScreenshot={setPaymentScreenshot}
              setShowPaymentModal={setShowPaymentModal}
              handleAddFdaBalance={handleAddFdaBalance}
              createOffer={createOffer}
              loadMyTrades={loadMyTrades}
              openReleaseConfirmModal={openReleaseConfirmModal}
              openDisputeModal={openDisputeModal}
            />
          )}

          {activeTab === 'trade-listing' && (
            <TradeListing
              auth={auth}
              inMobileShell={useMobileLayout}
              p2pFeeRate={p2pFeeRate}
              canAcceptAnotherOffer={canAcceptAnotherOffer}
              filteredOffers={filteredOffers}
              paginatedOffers={paginatedOffers}
              totalPages={totalPages}
              offersPage={offersPage}
              setOffersPage={setOffersPage}
              offersSearch={offersSearch}
              setOffersSearch={setOffersSearch}
              offersFilterType={offersFilterType}
              setOffersFilterType={setOffersFilterType}
              loadingOffers={loadingOffers}
              loadingMyTrades={loadingMyTrades}
              acceptingOffer={acceptingOffer}
              cancellingOffer={cancellingOffer}
              markingAsPaid={markingAsPaid}
              cancellingTrade={cancellingTrade}
              disputingTrade={disputingTrade}
              releasingTokens={releasingTokens}
              myTrades={myTrades}
              setSelectedTradeForPayment={setSelectedTradeForPayment}
              setPaymentScreenshot={setPaymentScreenshot}
              setShowPaymentModal={setShowPaymentModal}
              loadOffers={loadOffers}
              loadMyTrades={loadMyTrades}
              openAcceptModal={openAcceptModal}
              openCancelOfferModal={openCancelOfferModal}
              cancelTrade={cancelTrade}
              openDisputeModal={openDisputeModal}
              openTradeChatModal={openTradeChatModal}
              openReleaseConfirmModal={openReleaseConfirmModal}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              auth={auth}
              p2pFeeRate={p2pFeeRate}
              editingFeeRate={editingFeeRate}
              newFeeRate={newFeeRate}
              setNewFeeRate={setNewFeeRate}
              updatingFeeRate={updatingFeeRate}
              holdingFdaAmount={holdingFdaAmount}
              editingHoldingFda={editingHoldingFda}
              newHoldingFda={newHoldingFda}
              setNewHoldingFda={setNewHoldingFda}
              updatingHoldingFda={updatingHoldingFda}
              adminTrades={adminTrades}
              adminDisputes={adminDisputes}
              setEditingFeeRate={setEditingFeeRate}
              setEditingHoldingFda={setEditingHoldingFda}
              updateFeeRate={updateFeeRate}
              updateHoldingFda={updateHoldingFda}
              loadAdminData={loadAdminData}
              isValidAddress={(address: string) => ethers.isAddress(address)}
              newTokenAddress={newTokenAddress}
              newTokenSymbol={newTokenSymbol}
              onAddressChange={setNewTokenAddress}
              onFetchTokenInfo={fetchTokenInfo}
              tokenInfoLoading={tokenInfoLoading}
              newTokenName={newTokenName}
              onShowSuccessModal={showSuccessModal}
              onShowErrorModal={showErrorModal}
              onP2PMinPricesUpdated={fetchP2PMinOfferAmount}
            />
          )}

          {activeTab === 'disputes' && (
            <DisputesPanel
              auth={auth}
              adminDisputes={adminDisputes}
              loadAdminData={loadAdminData}
            />
          )}

          {activeTab === 'history' && (
            <TransactionHistory
              auth={auth}
              userWalletAddresses={userWalletAddresses}
              walletOptions={allWallets.map((w) => ({ address: w.address, label: w.label }))}
            />
          )}

          {activeTab === 'profile' && (
            <Profile
              auth={auth}
              onUpdateAuth={setAuth}
              showErrorModal={showErrorModal}
              showSuccessModal={showSuccessModal}
            />
          )}

          {activeTab === 'charts' && (
            <TradingChart
              selectedCoins={['BTC', 'ETH', 'FDA', 'JIO']}
              auth={auth}
              fdaPrice={fdaPrice}
              inMobileShell={useMobileLayout}
            />
          )}

          {activeTab === 'payment-methods' && (
            <PaymentMethods
              auth={auth}
              p2pFiatCurrency={offerFiatCurrency}
              onP2pFiatCurrencyChange={setOfferFiatCurrency}
              usdtPayoutAddress={p2pUsdtPayoutAddress}
              onP2pUsdtPayoutSaved={() => {
                void refreshUserProfile();
              }}
            />
          )}

          {activeTab === 'view-phrases' && (
            <ViewPhrases auth={auth} />
          )}
          
        </main>       
        
      </div>

       {useMobileLayout && (
          <nav
            aria-label="Main"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: MM.surface,
              borderTop: `1px solid ${MM.borderLight}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto 1fr 1fr",
              alignItems: "end",
              justifyItems: "stretch",
              columnGap: 0,
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 8,
              paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
              zIndex: 9990,
              boxShadow: MM.shadowBar,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <TabItem
                glyph="home"
                label="Home"
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <TabItem
                glyph="explore"
                label="Explore"
                active={activeTab === "charts"}
                onClick={() => setActiveTab("charts")}
              />
            </div>

            <div
              role="presentation"
              onClick={() => setActiveTab("p2p")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                cursor: "pointer",
                position: "relative",
                width: MM.navFabSize + 16,
                paddingBottom: 2,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                aria-label="Trade"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("p2p");
                }}
                style={{
                  position: "absolute",
                  top: -MM.navFabRise,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: MM.accent,
                  border: `3px solid ${MM.surface}`,
                  borderRadius: "50%",
                  width: MM.navFabSize,
                  height: MM.navFabSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  color: "#fff",
                  boxShadow:
                    "0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg
                  width={28}
                  height={28}
                  viewBox="0 0 24 24"
                  aria-hidden
                  style={{ display: "block" }}
                >
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.25}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span
                style={{
                  marginTop: MM.navFabRise - 6,
                  fontSize: 10,
                  letterSpacing: "0.02em",
                  color: activeTab === "p2p" ? MM.accent : MM.navInactive,
                  fontWeight: activeTab === "p2p" ? 600 : 500,
                  lineHeight: 1.1,
                }}
              >
                Trade
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <TabItem
                glyph="activity"
                label="Activity"
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <TabItem
                glyph="profile"
                label="Profile"
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              />
            </div>
          </nav>
        )}
      {/* Error/Message Modal */}
      <MessageModal show={showMessageModal} message={message} variant={messageVariant} onClose={closeMessageModal} />

      {/* Accept Offer Modal */}
      {showAcceptModal && selectedOffer && (
        <div className="modal-overlay" onClick={closeAcceptModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {selectedOffer.type === 'SELL' ? '📥 Buy FDA' : '📤 Sell FDA'}
            </h3>
            <div className="modal-content">
              <p className="modal-text">
                Price: <strong>{selectedOffer.price} {selectedOffer.fiatCurrency || selectedOffer.fiat_currency}</strong> per FDA
              </p>
              <p className="modal-text">
                Available: <strong>{selectedOffer.remaining || selectedOffer.available_amount || 0} FDA</strong>
              </p>
              {!canAcceptAnotherOffer && (
                <p className="modal-text" style={{ color: '#fbbf24', fontWeight: 600 }}>
                  You already have an active trade. Close this dialog and finish or cancel that trade first.
                </p>
              )}
              <div className="modal-text">
                Payment:
                {(() => {
                  const methods = normalizeOfferPaymentMethods(selectedOffer);
                  if (!methods.length) return <strong> Not specified</strong>;
                  return (
                    <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                      {methods.map((pm: any, i: number) => {
                        const methodLabel = normalizePaymentLabel(pm?.paymentname || pm?.payment_method || pm?.method || 'Payment method');
                        const detailRows = getPaymentDetailRows(pm);
                        const qrCode = resolveQrCodeValue(pm);
                        const hasQr = !!qrCode;
                        return (
                          <div key={`${pm?.id ?? 'pm'}-${i}`} style={{ border: '1px solid #334155', borderRadius: 8, padding: 8 }}>
                            <strong style={{ display: 'block', marginBottom: detailRows.length ? 4 : 0 }}>{methodLabel}</strong>
                            {detailRows.length > 0 && (
                              <div style={{ display: 'grid', gap: 0 }}>
                                {detailRows.map((row, rowIndex) => (
                                  <div
                                    key={`${row.key}-${rowIndex}`}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr auto',
                                      gap: 8,
                                      alignItems: 'center',
                                      padding: '6px 0',
                                      borderBottom: rowIndex < detailRows.length - 1 ? '1px solid #1f2937' : 'none',
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ color: '#94a3b8', fontSize: 11 }}>{row.label}</div>
                                      <div style={{ color: '#e2e8f0', fontSize: 12, wordBreak: 'break-word' }}>{row.value}</div>
                                    </div>
                                    <button
                                      type="button"
                                      title={`Copy ${row.label}`}
                                      onClick={() => void copyFieldValue(row.value, row.label)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        width: 20,
                                        height: 20,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.95,
                                      }}
                                    >
                                      <span style={{ fontSize: 14, fontWeight: 700 }}>⧉</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {detailRows.length > 0 && hasQr && (
                              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 7, marginBottom: 2, textAlign: 'center' }}>
                                OR
                              </div>
                            )}
                            {hasQr && (
                              <img
                                src={qrCode}
                                alt="Payment QR"
                                style={{ marginTop: 8, width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 6 }}
                                onClick={() => {
                                  const win = window.open();
                                  if (!win) return;
                                  win.document.write(`
                                    <html>
                                      <head><title>Payment QR</title></head>
                                      <body style="margin:0;display:flex;align-items:center;justify-content:center;background:#0f172a;min-height:100vh;">
                                        <img src="${qrCode}" style="max-width:95vw;max-height:95vh;border-radius:10px;" />
                                      </body>
                                    </html>
                                  `);
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <label className="modal-label">
                Amount to {selectedOffer.type === 'SELL' ? 'buy' : 'sell'} (FDA):
              </label>
              <input
                type="number"
                className="modal-input"
                value={acceptAmount}
                onChange={(e) => setAcceptAmount(e.target.value)}
                placeholder={`Max: ${selectedOffer.remaining || selectedOffer.available_amount || 0}`}
                max={selectedOffer.remaining || selectedOffer.available_amount || 0}
              />
              {acceptAmount && Number(acceptAmount) > 0 && (
                <p className="modal-text">
                  Total: <strong>{(Number(acceptAmount) * selectedOffer.price).toFixed(2)} {selectedOffer.fiatCurrency || selectedOffer.fiat_currency}</strong>
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-button modal-button-secondary" onClick={closeAcceptModal}>
                Cancel
              </button>
              <button
                className={`modal-button ${(!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === selectedOffer.id || !canAcceptAnotherOffer) ? 'modal-button-secondary' : 'modal-button-success'}`}
                onClick={acceptOffer}
                disabled={!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === selectedOffer.id || !canAcceptAnotherOffer}
              >
                {acceptingOffer === selectedOffer.id ? 'Accepting...' : 'Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Upload Modal */}
      <PaymentModal
        show={showPaymentModal}
        trade={selectedTradeForPayment}
        paymentScreenshot={paymentScreenshot || undefined}
        uploadingScreenshot={uploadingScreenshot}
        markingAsPaid={markingAsPaid}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentScreenshot(null);
          setSelectedTradeForPayment(null);
        }}
        onMarkAsPaid={(screenshot) => markTradeAsPaid(selectedTradeForPayment?.id, screenshot)}
        onError={showErrorModal}
      />

      {/* OLD Payment Modal - TO BE REMOVED AFTER TESTING */}
      {false && showPaymentModal && selectedTradeForPayment && (
        <div className="modal-overlay" onClick={() => {
          setShowPaymentModal(false);
          setPaymentScreenshot(null);
          setSelectedTradeForPayment(null);
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">📸 Upload Payment Screenshot</h3>
            <div className="modal-content">
              <p className="modal-text">
                Trade #{selectedTradeForPayment.id}
              </p>
              <p className="modal-text">
                Amount: <strong>{selectedTradeForPayment.amount} {selectedTradeForPayment.asset_symbol}</strong>
              </p>
              <p className="modal-text">
                Total: <strong>{(selectedTradeForPayment.amount * selectedTradeForPayment.price).toFixed(2)} {selectedTradeForPayment.fiat_currency}</strong>
              </p>
              <label className="modal-label">
                Payment Screenshot (Max 10MB, will be compressed):
              </label>
              <input
                type="file"
                accept="image/*"
                className={`modal-input ${uploadingScreenshot ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                onChange={handleScreenshotUpload}
                disabled={uploadingScreenshot}
              />
              {uploadingScreenshot && (
                <p className="modal-info-text-small">
                  ⏳ Compressing image...
                </p>
              )}
              {paymentScreenshot && (
                <div className="modal-content">
                  <img
                    src={paymentScreenshot}
                    alt="Payment screenshot preview"
                    className="image-preview"
                  />
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="modal-button modal-button-secondary"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentScreenshot(null);
                  setSelectedTradeForPayment(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`modal-button ${markingAsPaid === selectedTradeForPayment.id ? 'modal-button-secondary' : 'modal-button-primary'}`}
                onClick={() => markTradeAsPaid(selectedTradeForPayment.id, paymentScreenshot)}
                disabled={markingAsPaid === selectedTradeForPayment.id || !paymentScreenshot || uploadingScreenshot}
              >
                {markingAsPaid === selectedTradeForPayment.id ? 'Uploading...' : '✅ Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Offer Confirmation Modal */}
      <CancelOfferModal
        show={showCancelOfferModal}
        offer={selectedOfferToCancel}
        cancellingOffer={cancellingOffer}
        onClose={closeCancelOfferModal}
        onConfirm={cancelOffer}
      />

      {/* Release Tokens Confirmation Modal */}
      <ReleaseConfirmModal
        show={showReleaseConfirmModal}
        trade={selectedTradeToRelease}
        releasingTokens={releasingTokens}
        onClose={closeReleaseConfirmModal}
        onConfirm={releaseTrade}
      />

      {/* Dispute Modal */}
      <DisputeModal
        show={showDisputeModal}
        trade={selectedTradeToDispute}
        disputingTrade={disputingTrade}
        onClose={closeDisputeModal}
        onConfirm={createDispute}
      />
      <TradeChatModal
        show={showTradeChatModal}
        trade={selectedTradeForChat}
        auth={auth}
        onClose={closeTradeChatModal}
        onError={showErrorModal}
      />

      {/* OLD Cancel Offer Modal - TO BE REMOVED AFTER TESTING */}
      {false && showCancelOfferModal && selectedOfferToCancel && (
        <div className="modal-overlay" onClick={closeCancelOfferModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-large">⚠️</div>
              <h3 className="modal-title">Cancel Offer?</h3>
            </div>
            <div className="modal-content">
              <p className="modal-text">
                Are you sure you want to cancel this offer?
              </p>
              <div className="modal-info-box">
                <p className="modal-info-text">
                  <strong>Type:</strong> {selectedOfferToCancel.type} {selectedOfferToCancel.assetSymbol || selectedOfferToCancel.asset_symbol} / {selectedOfferToCancel.fiatCurrency || selectedOfferToCancel.fiat_currency}
                </p>
                <p className="modal-info-text">
                  <strong>Price:</strong> {selectedOfferToCancel.price} {selectedOfferToCancel.fiatCurrency || selectedOfferToCancel.fiat_currency} per FDA
                </p>
                <p className="modal-info-text">
                  <strong>Remaining:</strong> {selectedOfferToCancel.remaining || selectedOfferToCancel.available_amount || 0} FDA
                </p>
                <p className="modal-info-text-small">
                  ⚠️ The locked amount ({selectedOfferToCancel.remaining || selectedOfferToCancel.available_amount || 0} FDA) will be returned to your balance.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-button modal-button-secondary" onClick={closeCancelOfferModal}>
                Keep Offer
              </button>
              <button
                className={`modal-button ${cancellingOffer === selectedOfferToCancel.id ? 'modal-button-secondary' : 'modal-button-danger'}`}
                onClick={cancelOffer}
                disabled={cancellingOffer === selectedOfferToCancel.id}
              >
                {cancellingOffer === selectedOfferToCancel.id ? 'Cancelling...' : 'Yes, Cancel Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {/* Wallet Modal for Mobile view only */}
    <WalletModal
      isOpen={showWalletModal}
      onClose={() => setShowWalletModal(false)}
      wallets={allWallets}
      onSwitchWallet={handleSwitchWallet}
      storedMeta={storedMeta}
    />
    <SwapWalletModal
      user={auth}
      isOpen={showSwapModal}
      onClose={() => setShowSwapModal(false)}
      wallets={allWallets}
      onSwitchWallet={handleSwitchWallet}
      storedMeta={storedMeta}
      internalFdaBalance={internalFdaBalance}
      unlockedPrivateKeyRef={unlockedPrivateKeyRef}
      nativeBalance={nativeBalance}
      fdaBalance={fdaBalance}
      onSwapComplete={() => {
        if (storedMeta?.address) {
          void fetchBalances(storedMeta.address);
          void fetchInternalBalance(storedMeta.address);
        }
      }}
    />
    </>
  );
}


