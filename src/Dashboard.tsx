import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

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

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
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
  const [showMessageModal, setShowMessageModal] = useState(false);

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
  
  // Offers pagination and filters
  const [offersPage, setOffersPage] = useState(1);
  const [offersPerPage] = useState(20);
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
  const [offerFiatCurrency, setOfferFiatCurrency] = useState('USD');
  const [offerMinLimit, setOfferMinLimit] = useState('');
  const [offerMaxLimit, setOfferMaxLimit] = useState('');
  const [offerPaymentMethods, setOfferPaymentMethods] = useState('');
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [addFdaAmount, setAddFdaAmount] = useState('');
  const [addingFdaBalance, setAddingFdaBalance] = useState(false);

  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [assetType, setAssetType] = useState<'native' | 'token'>('native');
  const [tokenAddress, setTokenAddress] = useState(FDA_TOKEN_ADDRESS);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);

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
  const [recipientFdaWallet, setRecipientFdaWallet] = useState<any>(null);
  
  const [registeredFdaWallets, setRegisteredFdaWallets] = useState<any[]>([]);
  const [newFdaWalletAddress, setNewFdaWalletAddress] = useState('');
  const [newFdaWalletLabel, setNewFdaWalletLabel] = useState('');
  const [registeringWallet, setRegisteringWallet] = useState(false);
  
  const [customTokens, setCustomTokens] = useState<CustomToken[]>(loadCustomTokens(auth?.user.id));
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

  const unlockedPrivateKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();

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

  const fetchBalances = async (address: string) => {
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
      
      // Fetch custom token balances
      const tokens = loadCustomTokens(auth?.user.id);
      const balances: Record<string, string> = {};
      for (const token of tokens) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const decimals = await tokenContract.decimals();
          const tokenBal = await tokenContract.balanceOf(address);
          balances[token.address] = ethers.formatUnits(tokenBal, decimals);
        } catch (err) {
          console.error(`Failed to fetch balance for ${token.symbol}:`, err);
          balances[token.address] = 'Error';
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
    setShowMessageModal(true);
  };

  const showSuccessModal = (successMessage: string) => {
    setMessage(successMessage);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setMessage(null);
  };

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

  const registerWalletAddress = async (address: string, label?: string, encryptedData?: any, network?: string) => {
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
        body: JSON.stringify({ address, label, encryptedData, network }),
      });
      
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
        return await res.json();
      }
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
          // Register wallet address if not already registered
          registerWalletAddress(storedMeta.address, storedMeta.label);
          // Fetch P2P fee rate on login/load
          fetchP2PFeeRate();
        }
      }
  }, [storedMeta?.address, auth]);

  useEffect(() => {
    if (activeTab === 'wallets') {
      refreshWallets();
    }
    if (activeTab === 'fdawallets' && auth) {
      fetchRegisteredFdaWallets();
    }
    if (activeTab === 'p2p' || activeTab === 'trade-listing') {
      fetchP2PFeeRate();
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

      if (res.ok) {
        const profileData = await res.json();
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

  // Auto-calculate Min Limit and Max Limit based on Amount and Price
  useEffect(() => {
    if (offerAmount && offerPrice) {
      const amount = Number(offerAmount);
      const price = Number(offerPrice);
      
      if (amount > 0 && price > 0) {
        // Min Limit = Price per FDA (minimum 1 FDA)
        const minLimit = price.toFixed(2);
        // Max Limit = Amount * Price (total value)
        const maxLimit = (amount * price).toFixed(2);
        
        setOfferMinLimit(minLimit);
        setOfferMaxLimit(maxLimit);
      }
    } else {
      // Clear limits if amount or price is empty
      setOfferMinLimit('');
      setOfferMaxLimit('');
    }
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

  // Estimate gas when send form inputs change (only for on-chain)
  useEffect(() => {
    if (activeTab === 'send' && transferType === 'onchain' && unlockedPrivateKeyRef.current && sendTo.trim() && ethers.isAddress(sendTo.trim())) {
      const timer = setTimeout(() => {
        estimateGasAndMax();
      }, 500); // Debounce
      return () => clearTimeout(timer);
    } else {
      setEstimatedGas(null);
    }
  }, [sendTo, assetType, tokenAddress, activeTab, transferType]);

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
    if (!walletPassword.trim()) {
      showErrorModal('⚠️ Please enter a wallet password.');
      return;
    }

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
            selectedNetwork
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
    
    if (!walletPassword.trim()) {
      showErrorModal('⚠️ Please enter a wallet password.');
      return;
    }

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
            selectedNetwork
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
    if (!unlockPassword.trim()) {
      showErrorModal('⚠️ Please enter your wallet password.');
      return;
    }
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
      if (!unlockPassword || !unlockExtraWord) {
        showErrorModal(
          '⚠️ This wallet is registered in MC Wallet. Please enter your password and 13th word to restore it from the database.'
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
                    showSuccessModal(`✅ Wallet restored from database and unlocked! Address: ${walletAddressFromPhrase}`);
                    setUnlockPassword('');
                    setUnlockExtraWord('');
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
                  return;
                }
              } catch (decryptErr: any) {
                console.error('[Unlock Wallet] Failed to decrypt encrypted_data:', decryptErr);
                const errorMsg = decryptErr.message?.includes('password') || decryptErr.message?.includes('decrypt')
                  ? 'Incorrect password. Please check your password and try again.'
                  : 'Failed to decrypt wallet. Please check your password and 13th word.';
                showErrorModal(`⚠️ ${errorMsg}`);
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
      } else if (selectedWallet && isRegisteredWallet) {
        // This shouldn't happen if restoration worked, but just in case
        showErrorModal(
          '⚠️ Failed to restore wallet from database. Please try importing the wallet manually using "Import wallet" in the sidebar.'
        );
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
      showSuccessModal(`✅ Wallet unlocked in memory. Address: ${encrypted.address}`);
      
      // Clear fields after successful unlock
      setUnlockPassword('');
      setUnlockExtraWord('');
      if (allWallets.length > 0) {
        setSelectedUnlockWalletId(allWallets[0].id);
      }
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
      console.log('Loaded offers:', data);
      setOffers(data);
    } catch {
      showErrorModal('⚠️ Unable to load offers.');
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
        showErrorModal(`✅ Added ${amountNum} FDA to your internal balance! New balance: ${data.balance.toFixed(2)} FDA`);
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
      setActiveTab('unlock');
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
    
    // Check for active payment methods if currency is INR
    if (offerFiatCurrency === 'INR') {
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
      if (internalFdaBalance === null || internalFdaBalance < Number(offerAmount)) {
        console.log('[FRONTEND] ❌ Balance check failed for SELL offer');
        showErrorModal(`Insufficient FDA balance. You have ${internalFdaBalance || 0} FDA, but trying to sell ${offerAmount}.`);
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
        showErrorModal('✅ Offer created successfully! You can view it in the offers list.');
      }
      setOfferAmount('');
      setOfferPrice('');
      setOfferMinLimit('');
      setOfferMaxLimit('');
      setOfferPaymentMethods('');
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

  const openAcceptModal = (offer: any) => {
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
    
    // CRITICAL: Check FDA balance if accepting a BUY offer (user will be SELLER)
    // If accepting a SELL offer (user will be BUYER), no balance check needed (pays fiat)
    const offerType = (selectedOffer.type || selectedOffer.offer_type || 'SELL').toUpperCase();
    if (offerType === 'BUY' && selectedOffer.assetSymbol === 'FDA') {
      console.log('[FRONTEND] ✅ Accepting BUY offer - user will be SELLER, checking FDA balance...');
      if (internalFdaBalance === null || internalFdaBalance < amountNum) {
        closeAcceptModal(); // Close modal first
        showErrorModal(`❌ Insufficient FDA balance. You have ${internalFdaBalance || 0} FDA, but trying to sell ${amountNum} FDA.`);
        return;
      }
    } else if (offerType === 'SELL') {
      console.log('[FRONTEND] ✅ Accepting SELL offer - user will be BUYER, no FDA balance check needed (pays fiat)');
      // No balance check needed - buyer pays fiat
    }
    
    setAcceptingOffer(selectedOffer.id);
    try {
      const res = await fetch(getApiUrl('trades'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ offerId: selectedOffer.id, amount: amountNum }),
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
      showErrorModal(`✅ Trade created successfully! Trade ID: ${data.id}\n\nGo to "My Trades" section below to upload payment screenshot.`);
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
        showErrorModal('✅ Trade marked as paid successfully!');
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
        showErrorModal('✅ Tokens released to buyer successfully!');
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
        showErrorModal('✅ Trade cancelled successfully!');
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
        if (storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address); // Refresh balance since locked amount will be returned
        }
        showErrorModal('✅ Offer cancelled successfully. Your locked FDA balance has been returned.');
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
        showErrorModal('✅ Dispute created successfully. An admin will review it.');
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

  const estimateGasAndMax = async () => {
      if (!unlockedPrivateKeyRef.current || !sendTo.trim() || !ethers.isAddress(sendTo.trim())) {
      setEstimatedGas(null);
      return;
    }

    try {
      setEstimatingGas(true);
      const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
      const wallet = new ethers.Wallet(unlockedPrivateKeyRef.current, provider);
      const senderBalance = await provider.getBalance(wallet.address);
      const balanceEth = parseFloat(ethers.formatEther(senderBalance));

      if (assetType === 'native') {
        // Estimate gas for a small native transfer
        const testAmount = ethers.parseEther('0.001');
        const gasEstimate = await provider.estimateGas({
          from: wallet.address,
          to: sendTo.trim(),
          value: testAmount,
        });
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));
        setEstimatedGas(gasCostEth.toFixed(6));
      } else {
        // Estimate gas for token transfer
        if (!tokenAddress.trim() || !ethers.isAddress(tokenAddress.trim())) {
          setEstimatedGas(null);
          return;
        }
        const contract = new ethers.Contract(tokenAddress.trim(), ERC20_ABI, provider);
        const testAmount = ethers.parseUnits('1', await contract.decimals());
        const gasEstimate = await contract.transfer.estimateGas(sendTo.trim(), testAmount);
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));
        setEstimatedGas(gasCostEth.toFixed(6));
      }
    } catch (err) {
      console.error('Gas estimation error:', err);
      setEstimatedGas(null);
    } finally {
      setEstimatingGas(false);
    }
  };

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
        const contract = new ethers.Contract(tokenAddress.trim(), ERC20_ABI, provider);
        const decimals = await contract.decimals();
        const tokenBalance = await contract.balanceOf(wallet.address);
        const balanceFormatted = ethers.formatUnits(tokenBalance, decimals);
        setSendAmount(parseFloat(balanceFormatted).toFixed(4));
        
        // Also estimate gas
        const testAmount = ethers.parseUnits('1', decimals);
        const gasEstimate = await contract.transfer.estimateGas(wallet.address, testAmount);
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
        const gasCostEth = parseFloat(ethers.formatEther(gasCost));
        setEstimatedGas(gasCostEth.toFixed(6));
        showSuccessModal(`✅ Max tokens: ${parseFloat(balanceFormatted).toFixed(4)} (gas: ~${gasCostEth.toFixed(6)} BNB)`);
      }
    } catch (err) {
      console.error('Max amount error:', err);
      showErrorModal('⚠️ Failed to calculate max amount. Check RPC and wallet.');
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
        
        showErrorModal(`✅ Internal transfer completed! ${sendAmount} tokens sent to ${recipientInfo.fullName || recipientInfo.email || recipientInfo.walletLabel || 'MC Wallet'} (Zero fee, instant)`);
        if (storedMeta?.address) {
          await fetchInternalBalance(storedMeta.address);
        }
        setSendAmount('');
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
        } else {
          showSuccessModal(`✅ Transaction sent! Tx hash: ${tx.hash}`);
        }
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
        } else {
          showSuccessModal(`✅ Transaction sent! Tx hash: ${tx.hash}`);
        }
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
      const [tradesRes, disputesRes] = await Promise.all([
        fetch(getApiUrl('admin/trades'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
        fetch(getApiUrl('admin/disputes'), {
          headers: { Authorization: `Bearer ${auth.token}` },
        }),
      ]);
      const tradesData = await tradesRes.json();
      const disputesData = await disputesRes.json();
      if (!tradesRes.ok) {
        showErrorModal(`⚠️ ${tradesData.error || 'Failed to load admin trades'}`);
        return;
      }
      if (!disputesRes.ok) {
        showErrorModal(`⚠️ ${disputesData.error || 'Failed to load admin disputes'}`);
        return;
      }
      setAdminTrades(tradesData);
      setAdminDisputes(disputesData);
      
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
      } else {
        // If admin settings fail, try public endpoint for fee rate
        fetchP2PFeeRate();
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
        showErrorModal(`✅ P2P Trading Fee Rate updated to ${data.value}%`);
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
        showErrorModal(`✅ Holding FDA Amount updated to ${updatedValue} FDA`);
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

  const handleAddCustomToken = () => {
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
    
    if (addCustomToken(token, auth?.user.id)) {
      setCustomTokens(loadCustomTokens(auth?.user.id));
      setNewTokenAddress('');
      setNewTokenSymbol('');
      setNewTokenName('');
      showSuccessModal(`✅ Token ${token.symbol} added successfully.`);
      // Refresh balances if we have an address
      if (storedMeta?.address) {
        fetchBalances(storedMeta.address);
      } else if (checkAddress) {
        fetchBalances(checkAddress);
      }
    } else {
      showErrorModal('⚠️ Token already exists in your list.');
    }
  };

  const handleRemoveCustomToken = (address: string) => {
    if (removeCustomToken(address, auth?.user.id)) {
      setCustomTokens(loadCustomTokens(auth?.user.id));
      const newBalances = { ...customTokenBalances };
      delete newBalances[address];
      setCustomTokenBalances(newBalances);
      showSuccessModal('✅ Token removed successfully.');
    }
  };

  const handleToggleCustomToken = (address: string) => {
    if (toggleCustomToken(address, auth?.user.id)) {
      setCustomTokens(loadCustomTokens(auth?.user.id));
      // State is updated silently, no modal needed
    }
  };

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
    localStorage.removeItem(AUTH_KEY);
    navigate('/login');
  };

  // Filter and paginate offers
  const filteredOffers = offers.filter((offer) => {
    // Handle both camelCase and snake_case field names
    const assetSymbol = offer.assetSymbol || offer.asset_symbol || '';
    const fiatCurrency = offer.fiatCurrency || offer.fiat_currency || '';
    const paymentMethods = offer.paymentMethods || offer.payment_methods || '';
    const offerType = offer.type || '';
    const status = offer.status || 'OPEN';
    
    // CRITICAL: Filter out offers with 0 remaining/available amount
    const remaining = parseFloat(offer.remaining || offer.available_amount || 0);
    if (remaining <= 0) {
      return false; // Don't show offers with 0 or negative available amount
    }
    
    // Filter offers by type (BUY, SELL, or ALL)
    const matchesSearch = !offersSearch || 
      assetSymbol.toLowerCase().includes(offersSearch.toLowerCase()) ||
      fiatCurrency.toLowerCase().includes(offersSearch.toLowerCase()) ||
      paymentMethods.toLowerCase().includes(offersSearch.toLowerCase());
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

  return (
    <div id="dashboard-root" className="min-h-screen bg-slate-950 text-slate-50">
      {/* Mobile Menu Toggle Button */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div id="dashboard-container" className="flex max-w-7xl mx-auto" style={{ alignItems: 'flex-start' }}>
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
        <main id="main-content" className="flex-1 main-container">
          {/* Top Header with Profile and Balances */}
          <TopHeader
            auth={auth}
            internalFdaBalance={internalFdaBalance}
            storedMeta={storedMeta}
            allWallets={allWallets}
            registeredFdaWallets={registeredFdaWallets}
            onProfileClick={() => setActiveTab('profile')}
          />
          
          <header id="main-header" className="main-header">
            <div>
              <h1 id="dashboard-title" className="main-title">MC Wallet Dashboard</h1>
              <p id="dashboard-subtitle" className="main-subtitle">
                Manage your MC wallet and P2P trades. Wallet is non-custodial and encrypted locally.
              </p>
            </div>
          </header>

          {/* Wallet Overview - Only show on Dashboard */}
          {activeTab === 'dashboard' && (
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
                internalFdaBalance={internalFdaBalance}
                recipientFdaWallet={recipientFdaWallet}
                unlockedPrivateKeyRef={unlockedPrivateKeyRef}
                handleSend={handleSend}
                handleMaxAmount={handleMaxAmount}
                registerRecipientWallet={registerRecipientWallet}
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
                auth={auth}
                internalFdaBalance={internalFdaBalance}
                internalFdaLocked={internalFdaLocked}
                p2pFeeRate={p2pFeeRate}
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
                p2pFeeRate={p2pFeeRate}
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
              <TradingChart selectedCoins={['BTC', 'ETH', 'FDA', 'JIO']} auth={auth} />
            )}

            {activeTab === 'payment-methods' && (
              <PaymentMethods auth={auth} />
            )}

            {activeTab === 'view-phrases' && (
              <ViewPhrases auth={auth} />
            )}

        </main>
      </div>

      {/* Error/Message Modal */}
      <MessageModal show={showMessageModal} message={message} onClose={closeMessageModal} />

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
              <p className="modal-text">
                Payment: <strong>{selectedOffer.paymentMethods || selectedOffer.payment_method || 'Not specified'}</strong>
              </p>
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
                className={`modal-button ${(!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === selectedOffer.id) ? 'modal-button-secondary' : 'modal-button-success'}`}
                onClick={acceptOffer}
                disabled={!acceptAmount || Number(acceptAmount) <= 0 || acceptingOffer === selectedOffer.id}
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
  );
}


