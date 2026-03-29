import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ethers } from "ethers";
import {
  fetchPopularPairsForTab,
  type NetworkTabKey,
} from "../../../utils/dexPopularTokens";
import { MM } from "../../../theme/metaMaskShell";
import { getApiUrl } from "../../../config";
import { DEFAULT_RPC_URL, ETHEREUM_RPC_URL } from "../../types";

type TokenRow = {
  address: string;
  symbol: string;
  name: string;
  logo?: string;
};

type TabKey = "search" | "custom";

/** Shown if DexScreener returns nothing (offline, rate limit, filter mismatch). */
const BNB_TOKEN_LIST_FALLBACK: TokenRow[] = [
  {
    address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    symbol: "WBNB",
    name: "Wrapped BNB",
  },
  {
    address: "0x55d398326f99059fF775485246999027B3197955",
    symbol: "USDT",
    name: "Tether USD",
  },
  {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    symbol: "USDC",
    name: "USD Coin",
  },
  {
    address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    symbol: "BUSD",
    name: "BUSD Token",
  },
  {
    address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    symbol: "ETH",
    name: "Ethereum Token",
  },
  {
    address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    symbol: "CAKE",
    name: "PancakeSwap Token",
  },
  {
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    symbol: "BTCB",
    name: "BTCB Token",
  },
];

const ETH_TOKEN_LIST_FALLBACK: TokenRow[] = [
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    name: "Wrapped Ether",
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    name: "USD Coin",
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    name: "Wrapped BTC",
  },
  {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    symbol: "DAI",
    name: "Dai Stablecoin",
  },
  {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    symbol: "LINK",
    name: "ChainLink Token",
  },
];

const BTC_TAB_FALLBACK: TokenRow[] = [
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    name: "Wrapped BTC",
  },
];

const TRON_TOKEN_LIST_FALLBACK: TokenRow[] = [
  {
    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    symbol: "USDT",
    name: "Tether USD (TRC20)",
  },
];

const TOKEN_FALLBACK_BY_NETWORK: Record<NetworkTabKey, TokenRow[]> = {
  BNB: BNB_TOKEN_LIST_FALLBACK,
  ETH: ETH_TOKEN_LIST_FALLBACK,
  BTC: BTC_TAB_FALLBACK,
  TRON: TRON_TOKEN_LIST_FALLBACK,
};

const IMPORT_NETWORK_COPY: Record<
  NetworkTabKey,
  { title: string; subtitle: string; explorerHost: string; explorerLabel: string }
> = {
  BNB: {
    title: "BNB Chain",
    subtitle: "BNB Smart Chain · Search & custom import use this network",
    explorerHost: "bscscan.com",
    explorerLabel: "BscScan",
  },
  ETH: {
    title: "Ethereum",
    subtitle: "ERC-20 tokens on Ethereum mainnet",
    explorerHost: "etherscan.io",
    explorerLabel: "Etherscan",
  },
  BTC: {
    title: "Bitcoin (WBTC)",
    subtitle: "Wrapped BTC and related tokens on Ethereum (not native Bitcoin UTXO)",
    explorerHost: "etherscan.io",
    explorerLabel: "Etherscan",
  },
  TRON: {
    title: "Tron",
    subtitle: "TRC-20 tokens on Tron · custom import uses manual symbol/decimals",
    explorerHost: "tronscan.org",
    explorerLabel: "Tronscan",
  },
};

const NETWORK_PICKER_ROWS: {
  key: NetworkTabKey;
  headline: string;
  sub: string;
}[] = [
  { key: "BNB", headline: "BNB Chain", sub: "BNB Smart Chain" },
  { key: "ETH", headline: "Ethereum", sub: "ERC-20 · Mainnet" },
  { key: "BTC", headline: "Bitcoin", sub: "WBTC on Ethereum" },
  { key: "TRON", headline: "Tron", sub: "TRC-20" },
];

const READ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const SYMBOL_BYTES32_ABI = [
  "function symbol() view returns (bytes32)",
];

function NetworkImportGlyph({ tab }: { tab: NetworkTabKey }) {
  const cfg =
    tab === "BNB"
      ? { bg: "#F3BA2F", fg: "#0f172a", ch: "B", fs: 13 }
      : tab === "ETH"
        ? { bg: "#627EEA", fg: "#fff", ch: "E", fs: 13 }
        : tab === "BTC"
          ? { bg: "#F7931A", fg: "#fff", ch: "₿", fs: 11 }
          : { bg: "#FF0013", fg: "#fff", ch: "T", fs: 13 };
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: cfg.bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: cfg.fs,
        color: cfg.fg,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {cfg.ch}
    </span>
  );
}

async function fetchErc20Meta(
  address: string,
  provider: ethers.JsonRpcProvider,
): Promise<{ name: string; symbol: string; decimals: number }> {
  const c = new ethers.Contract(address, READ_ABI, provider);
  let symbol: string;
  try {
    symbol = String(await c.symbol());
  } catch {
    const c32 = new ethers.Contract(address, SYMBOL_BYTES32_ABI, provider);
    const raw = await c32.symbol();
    symbol = ethers.decodeBytes32String(raw);
  }
  let name = "";
  try {
    name = String(await c.name());
  } catch {
    name = "";
  }
  let decimals = 18;
  try {
    decimals = Number(await c.decimals());
  } catch {
    decimals = 18;
  }
  return { name, symbol, decimals };
}

interface AddCustomTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: { token: string } | null;
  userTokens: { address: string; status?: string; token_symbol?: string }[];
  onAdded: () => void;
  /** Matches the token list chip (BTC = WBTC-style tokens on Ethereum per DEX config). */
  initialImportNetwork?: NetworkTabKey;
}

const AddCustomTokenModal: React.FC<AddCustomTokenModalProps> = ({
  isOpen,
  onClose,
  auth,
  userTokens,
  onAdded,
  initialImportNetwork = "BNB",
}) => {
  const [mainTab, setMainTab] = useState<TabKey>("search");
  const [importNetwork, setImportNetwork] =
    useState<NetworkTabKey>(initialImportNetwork);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [selected, setSelected] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [customAddress, setCustomAddress] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDecimals, setCustomDecimals] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const networkPickerRef = useRef<HTMLDivElement>(null);

  const evmRpcUrl =
    importNetwork === "BNB"
      ? DEFAULT_RPC_URL
      : importNetwork === "ETH" || importNetwork === "BTC"
        ? ETHEREUM_RPC_URL
        : null;

  const provider = useMemo(
    () => (evmRpcUrl ? new ethers.JsonRpcProvider(evmRpcUrl) : null),
    [evmRpcUrl],
  );

  const networkCopy = IMPORT_NETWORK_COPY[importNetwork];

  const norm = (a: string) => (a || "").toLowerCase();

  const isAlreadyAdded = (addr: string) =>
    userTokens.some((t) => {
      if (t.status !== "ON") return false;
      const ta = t.address || "";
      const a = addr || "";
      if (a.startsWith("0x") || ta.startsWith("0x")) {
        return norm(ta) === norm(a);
      }
      return ta === a;
    });

  const fetchTokensForNetwork = useCallback(async (tab: NetworkTabKey) => {
    try {
      setLoading(true);
      const pairs = await fetchPopularPairsForTab(tab);
      const rows: TokenRow[] = pairs
        .map((p: Record<string, unknown>) => {
          const base = p.baseToken as Record<string, string> | undefined;
          const info = p.info as Record<string, string> | undefined;
          return {
            address: base?.address,
            symbol: base?.symbol || "?",
            name: base?.name || base?.symbol || "Token",
            logo: info?.imageUrl || (base as { logoURI?: string })?.logoURI,
          };
        })
        .filter((t) => t.address);

      const seen = new Set<string>();
      const deduped = rows.filter((t) => {
        const k = norm(t.address);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const fallback = TOKEN_FALLBACK_BY_NETWORK[tab];
      setTokens(deduped.length > 0 ? deduped : fallback);
    } catch (err) {
      console.error(err);
      setTokens(TOKEN_FALLBACK_BY_NETWORK[tab]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectImportNetwork = useCallback(
    (next: NetworkTabKey) => {
      setImportNetwork(next);
      setSelected([]);
      setCustomError(null);
      setCustomAddress("");
      setCustomSymbol("");
      setCustomName("");
      setCustomDecimals("");
      setNetworkPickerOpen(false);
      void fetchTokensForNetwork(next);
    },
    [fetchTokensForNetwork],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelected([]);
    setSearchQuery("");
    setCustomError(null);
    setMainTab("search");
    setCustomAddress("");
    setCustomSymbol("");
    setCustomName("");
    setCustomDecimals("");
    setNetworkPickerOpen(false);
    setImportNetwork(initialImportNetwork);
    void fetchTokensForNetwork(initialImportNetwork);
  }, [isOpen, initialImportNetwork, fetchTokensForNetwork]);

  useEffect(() => {
    if (!isOpen) setNetworkPickerOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!networkPickerOpen || !isOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const el = networkPickerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setNetworkPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [networkPickerOpen, isOpen]);

  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        norm(t.address).includes(q.replace("0x", "")),
    );
  }, [tokens, searchQuery]);

  const toggleToken = (t: TokenRow) => {
    if (isAlreadyAdded(t.address)) return;
    setSelected((prev) => {
      if (prev.some((x) => norm(x.address) === norm(t.address))) {
        return prev.filter((x) => norm(x.address) !== norm(t.address));
      }
      return [...prev, t];
    });
  };

  const postToken = async (row: {
    address: string;
    symbol: string;
    name: string;
  }) => {
    const res = await fetch(getApiUrl("customTokens"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth!.token}`,
      },
      body: JSON.stringify({
        contract_address: row.address,
        token_symbol: row.symbol,
        token_name: row.name,
        status: "ON",
      }),
    });
    return res.ok;
  };

  const handleAddSelected = async () => {
    if (!selected.length) return;
    if (!auth?.token) {
      window.alert("Please sign in");
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.all(
        selected.map((t) =>
          postToken({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
          }),
        ),
      );
      if (results.some((ok) => !ok)) {
        window.alert("Some tokens failed to add");
        return;
      }
      setSelected([]);
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      window.alert("Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveCustomAddress = useCallback(async () => {
    setCustomError(null);
    const raw = customAddress.trim();
    if (!raw) {
      setCustomSymbol("");
      setCustomName("");
      setCustomDecimals("");
      return;
    }

    if (importNetwork === "TRON") {
      if (!/^T[A-Za-z1-9]{33}$/.test(raw)) {
        setCustomError(
          "Enter a valid TRC-20 address (starts with T, 34 characters)",
        );
        return;
      }
      if (isAlreadyAdded(raw)) {
        setCustomError("This token is already in your wallet");
        return;
      }
      return;
    }

    let addr = raw;
    if (!addr.startsWith("0x")) {
      addr = `0x${addr}`;
    }
    if (!ethers.isAddress(addr)) {
      setCustomError(
        importNetwork === "BNB"
          ? "Enter a valid BSC contract address"
          : "Enter a valid Ethereum contract address",
      );
      return;
    }
    const checksummed = ethers.getAddress(addr);
    if (isAlreadyAdded(checksummed)) {
      setCustomError("This token is already in your wallet");
      return;
    }
    const p = provider;
    if (!p) {
      setCustomError("No RPC configured for this network");
      return;
    }
    setMetaLoading(true);
    try {
      const code = await p.getCode(checksummed);
      if (!code || code === "0x") {
        setCustomError(
          importNetwork === "BNB"
            ? "No contract at this address on BNB Chain"
            : "No contract at this address on Ethereum",
        );
        setCustomSymbol("");
        setCustomName("");
        setCustomDecimals("");
        return;
      }
      const meta = await fetchErc20Meta(checksummed, p);
      setCustomAddress(checksummed);
      setCustomSymbol(meta.symbol);
      setCustomName(meta.name);
      setCustomDecimals(String(meta.decimals));
    } catch (e) {
      console.error(e);
      const chainHint =
        importNetwork === "BNB" ? "BNB Chain" : "Ethereum mainnet";
      setCustomError(
        `Could not read token. Check the address is an ERC-20 on ${chainHint}.`,
      );
      setCustomSymbol("");
      setCustomName("");
      setCustomDecimals("");
    } finally {
      setMetaLoading(false);
    }
  }, [customAddress, importNetwork, provider, userTokens]);

  useEffect(() => {
    if (!isOpen || mainTab !== "custom") return;
    const raw = customAddress.trim();
    if (!raw) return;
    const t = setTimeout(() => {
      void resolveCustomAddress();
    }, 500);
    return () => clearTimeout(t);
  }, [customAddress, isOpen, mainTab, resolveCustomAddress]);

  const handleCustomNext = async () => {
    if (!auth?.token) {
      window.alert("Please sign in");
      return;
    }
    setCustomError(null);
    const trimmed = customAddress.trim();

    if (importNetwork === "TRON") {
      if (!/^T[A-Za-z1-9]{33}$/.test(trimmed)) {
        setCustomError("Enter a valid TRC-20 contract address");
        return;
      }
      if (isAlreadyAdded(trimmed)) {
        setCustomError("This token is already in your wallet");
        return;
      }
      if (!customSymbol.trim()) {
        setCustomError("Token symbol is required (enter manually for Tron)");
        return;
      }
      const decStr = customDecimals.trim();
      let dec = 18;
      if (decStr !== "") {
        dec = Number(decStr);
        if (
          !Number.isFinite(dec) ||
          dec < 0 ||
          dec > 36 ||
          !Number.isInteger(dec)
        ) {
          setCustomError("Decimals must be a whole number from 0 to 36");
          return;
        }
      }
      setSubmitting(true);
      try {
        const ok = await postToken({
          address: trimmed,
          symbol: customSymbol.trim().toUpperCase(),
          name: customName.trim() || customSymbol.trim(),
        });
        if (!ok) {
          window.alert("Failed to add token");
          return;
        }
        onAdded();
        onClose();
      } catch (err) {
        console.error(err);
        window.alert("Failed to add");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let evmAddr = trimmed;
    if (!evmAddr.startsWith("0x")) {
      evmAddr = `0x${evmAddr}`;
    }
    if (!ethers.isAddress(evmAddr)) {
      setCustomError("Enter a valid contract address");
      return;
    }
    const checksummed = ethers.getAddress(evmAddr);
    if (isAlreadyAdded(checksummed)) {
      setCustomError("This token is already in your wallet");
      return;
    }
    if (!customSymbol.trim()) {
      setCustomError("Token symbol is required");
      return;
    }
    const decStr = customDecimals.trim();
    let dec = 18;
    if (decStr !== "") {
      dec = Number(decStr);
      if (
        !Number.isFinite(dec) ||
        dec < 0 ||
        dec > 36 ||
        !Number.isInteger(dec)
      ) {
        setCustomError("Decimals must be a whole number from 0 to 36");
        return;
      }
    }
    setSubmitting(true);
    try {
      const ok = await postToken({
        address: checksummed,
        symbol: customSymbol.trim().toUpperCase(),
        name: customName.trim() || customSymbol.trim(),
      });
      if (!ok) {
        window.alert("Failed to add token");
        return;
      }
      onAdded();
      onClose();
    } catch (err) {
      console.error(err);
      window.alert("Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tabBtn = (key: TabKey, label: string) => (
    <button
      type="button"
      key={key}
      onClick={() => {
        setMainTab(key);
        setCustomError(null);
      }}
      style={{
        flex: 1,
        padding: "12px 8px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontWeight: mainTab === key ? 700 : 600,
        fontSize: 15,
        color: mainTab === key ? MM.text : MM.textSecondary,
        borderBottom:
          mainTab === key
            ? `3px solid ${MM.text}`
            : "3px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: MM.overlay,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: MM.zModal,
        padding: 12,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          height: "min(90vh, 640px)",
          maxHeight: "90vh",
          background: MM.surface,
          borderRadius: MM.radiusLg,
          boxShadow: MM.shadowModal,
          border: `1px solid ${MM.borderLight}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        role="dialog"
        aria-labelledby="import-tokens-title"
      >
        {/* Custom network picker — avoids native OS menu */}
        <div
          ref={networkPickerRef}
          style={{
            padding: "16px 16px 12px",
            flexShrink: 0,
            borderBottom: `1px solid ${MM.borderLight}`,
            background: MM.pageBg,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: MM.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Network
          </div>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={networkPickerOpen}
            aria-label="Choose network for import"
            onClick={() => setNetworkPickerOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "14px 16px",
              borderRadius: MM.radius,
              border: `1px solid ${MM.border}`,
              background: MM.surface,
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <NetworkImportGlyph tab={importNetwork} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: MM.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {networkCopy.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: MM.textMuted,
                  marginTop: 2,
                }}
              >
                {networkPickerOpen ? "Tap an option below" : "Tap to change network"}
              </div>
            </div>
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              aria-hidden
              style={{
                flexShrink: 0,
                color: MM.textSecondary,
                transform: networkPickerOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {networkPickerOpen && (
            <div
              role="listbox"
              aria-label="Networks"
              style={{
                marginTop: 10,
                borderRadius: MM.radius,
                border: `1px solid ${MM.borderLight}`,
                background: MM.surface,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              }}
            >
              {NETWORK_PICKER_ROWS.map((row, i) => {
                const active = importNetwork === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectImportNetwork(row.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "14px 16px",
                      border: "none",
                      borderBottom:
                        i < NETWORK_PICKER_ROWS.length - 1
                          ? `1px solid ${MM.borderLight}`
                          : "none",
                      background: active ? MM.accentMuted : MM.surface,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <NetworkImportGlyph tab={row.key} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: MM.text,
                        }}
                      >
                        {row.headline}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: MM.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {row.sub}
                      </div>
                    </div>
                    {active && (
                      <span
                        aria-hidden
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: MM.accent,
                          color: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              color: MM.textSecondary,
              marginTop: 10,
              lineHeight: 1.45,
            }}
          >
            {networkCopy.subtitle}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 44px 12px 16px",
            borderBottom: `1px solid ${MM.borderLight}`,
            flexShrink: 0,
            background: MM.surface,
          }}
        >
          <h2
            id="import-tokens-title"
            style={{
              color: MM.text,
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Import tokens
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "none",
              background: MM.pageBg,
              color: MM.textSecondary,
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${MM.borderLight}`,
            paddingInline: 8,
            flexShrink: 0,
          }}
        >
          {tabBtn("search", "Search")}
          {tabBtn("custom", "Custom token")}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 16px 8px",
            minHeight: 200,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {mainTab === "search" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  background: MM.pageBg,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: MM.textMuted }} aria-hidden>
                  🔍
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tokens"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    fontSize: 15,
                    outline: "none",
                    color: MM.text,
                  }}
                />
              </div>

              {loading ? (
                <p
                  style={{
                    color: MM.textSecondary,
                    padding: 24,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  Loading popular tokens…
                </p>
              ) : (
                <div
                  style={{
                    borderRadius: MM.radius,
                    border: `1px solid ${MM.borderLight}`,
                    background: MM.pageBg,
                    overflow: "hidden",
                  }}
                >
                  {filteredTokens.length === 0 ? (
                    <p
                      style={{
                        color: MM.textSecondary,
                        padding: 20,
                        margin: 0,
                        textAlign: "center",
                        fontSize: 14,
                      }}
                    >
                      No tokens match your search.
                    </p>
                  ) : (
                    filteredTokens.map((t) => {
                      const added = isAlreadyAdded(t.address);
                      const isSel = selected.some(
                        (x) => norm(x.address) === norm(t.address),
                      );
                      return (
                        <button
                          key={t.address}
                          type="button"
                          onClick={() => !added && toggleToken(t)}
                          disabled={added}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            width: "100%",
                            padding: "12px 14px",
                            border: "none",
                            borderBottom: `1px solid ${MM.borderLight}`,
                            background: added
                              ? "#f0fdf4"
                              : isSel
                                ? MM.accentMuted
                                : MM.surface,
                            cursor: added ? "default" : "pointer",
                            textAlign: "left",
                          }}
                        >
                          {added ? (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#15803d",
                                minWidth: 72,
                              }}
                            >
                              In wallet
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSel}
                              style={{
                                width: 20,
                                height: 20,
                                accentColor: MM.accent,
                                cursor: "pointer",
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#F3BA2F22",
                              border: `1px solid ${MM.borderLight}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 12,
                              color: MM.text,
                              flexShrink: 0,
                              overflow: "hidden",
                            }}
                          >
                            {t.logo ? (
                              <img
                                src={t.logo}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              t.symbol.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color: MM.text,
                              }}
                            >
                              {t.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: MM.textSecondary,
                              }}
                            >
                              {t.symbol}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <p
                style={{
                  fontSize: 12,
                  color: MM.textMuted,
                  marginTop: 12,
                  lineHeight: 1.45,
                }}
              >
                Popular tokens for <strong>{networkCopy.title}</strong> from DEX
                data. Already-enabled tokens show &quot;In wallet&quot;. Only new
                selections are added.
              </p>
            </>
          )}

          {mainTab === "custom" && (
            <>
              <div
                style={{
                  padding: 12,
                  borderRadius: MM.radius,
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  marginBottom: 16,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
                  ⚠️
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#92400e",
                    lineHeight: 1.45,
                  }}
                >
                  Anyone can create a token, including fake versions of real
                  ones. Only paste addresses you trust. Verify on{" "}
                  <a
                    href={`https://${networkCopy.explorerHost}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", fontWeight: 600 }}
                  >
                    {networkCopy.explorerLabel}
                  </a>
                  .
                </p>
              </div>

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                Token contract address
              </label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                onBlur={() => void resolveCustomAddress()}
                placeholder={
                  importNetwork === "TRON"
                    ? "T… (TRC-20 contract)"
                    : "0x…"
                }
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 6,
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  fontSize: 15,
                  fontFamily: "ui-monospace, monospace",
                }}
              />

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                Token symbol
              </label>
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                placeholder="e.g. FDA"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 6,
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  fontSize: 15,
                }}
              />

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                Token decimal
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={customDecimals}
                onChange={(e) => setCustomDecimals(e.target.value)}
                placeholder="18"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 6,
                  marginBottom: 8,
                  padding: 12,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  fontSize: 15,
                }}
              />

              {metaLoading && (
                <p
                  style={{
                    fontSize: 12,
                    color: MM.textSecondary,
                    margin: "0 0 8px",
                  }}
                >
                  Reading contract…
                </p>
              )}
              {customError && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#b91c1c",
                    margin: "0 0 8px",
                  }}
                >
                  {customError}
                </p>
              )}
            </>
          )}
        </div>

        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: `1px solid ${MM.borderLight}`,
            flexShrink: 0,
            background: MM.surface,
          }}
        >
          {mainTab === "search" ? (
            <>
              <button
                type="button"
                onClick={() => void handleAddSelected()}
                disabled={selected.length === 0 || submitting}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background:
                    selected.length && !submitting ? MM.text : MM.border,
                  border: "none",
                  borderRadius: MM.radius,
                  color: "#fff",
                  cursor:
                    selected.length && !submitting ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {submitting
                  ? "Adding…"
                  : `Add selected (${selected.length})`}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  marginTop: 10,
                  background: MM.surface,
                  border: `1px solid ${MM.border}`,
                  borderRadius: MM.radius,
                  color: MM.text,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Close
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleCustomNext()}
              disabled={
                submitting ||
                metaLoading ||
                !customAddress.trim() ||
                !customSymbol.trim()
              }
              style={{
                width: "100%",
                padding: "14px 16px",
                background:
                  !submitting &&
                  !metaLoading &&
                  customAddress.trim() &&
                  customSymbol.trim()
                    ? MM.text
                    : MM.border,
                border: "none",
                borderRadius: MM.radius,
                color: "#fff",
                cursor:
                  !submitting &&
                  !metaLoading &&
                  customAddress.trim() &&
                  customSymbol.trim()
                    ? "pointer"
                    : "not-allowed",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {submitting ? "Adding…" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCustomTokenModal;
