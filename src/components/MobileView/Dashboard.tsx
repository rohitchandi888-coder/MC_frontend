import React, { useEffect, useMemo, useState } from "react";
import { WalletMeta } from "../../walletStorage";
import type { CustomToken } from "../../walletStorage";
import NetworkModal from "./Modal/NetworkModal";

import { AuthState, Tab, FDA_TOKEN_ADDRESS } from "../types";
import AddCustomTokenModal from "./Modal/AddCustomTokenModal";
import { fetchAllPopularNetworkPairs } from "../../utils/dexPopularTokens";
import { MobileExplorePanels } from "./MobileExplorePanels";
import { MM } from "../../theme/metaMaskShell";

import BNB from "/images/bnb.png";
import BTC from "/images/btc.png";
import ETH from "/images/eth.png";
import Tron from "/images/tron.png";

import Radium from "/images/subpart/ray.png";
import osmo from "/images/subpart/osmo.png";
import hydro from "/images/subpart/hydro.png";
import sunswap from "/images/subpart/sunswap.png";
import pumpswap from "/images/subpart/pumpswap.png";
import pancakeswap from "/images/subpart/pancakeswap.png";

const FDA_LOGO_URL = "https://img.lightshot.app/Ge3AnFucTIyQQTmVErIWpw.png";

const HomePageImage = [
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: BNB, sub: Radium },
  { main: ETH, sub: osmo },
  { main: ETH, sub: Radium },
  { main: ETH, sub: hydro },
  { main: ETH, sub: sunswap },
  { main: ETH, sub: pumpswap },
  { main: BTC, sub: osmo },
  { main: BTC, sub: Radium },
  { main: BTC, sub: sunswap },
  { main: BTC, sub: osmo },
  { main: BTC, sub: osmo },
  { main: Tron, sub: Radium },
  { main: Tron, sub: pumpswap },
  { main: Tron, sub: Radium },
  { main: Tron, sub: Radium },
  { main: Tron, sub: pancakeswap },
];

const BNB_NATIVE = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

/** Always-visible chain glyph (avoids broken /images/* in dev). */
const NetworkChainGlyph = ({
  chain,
}: {
  chain: "BNB" | "ETH" | "BTC" | "TRON";
}) => {
  const cfg = {
    BNB: { fill: "#F0B90B", label: "B" },
    ETH: { fill: "#627EEA", label: "E" },
    BTC: { fill: "#F7931A", label: "₿" },
    TRON: { fill: "#FF0013", label: "T" },
  }[chain];
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ flexShrink: 0, borderRadius: "50%", display: "block" }}
    >
      <circle cx="12" cy="12" r="11" fill={cfg.fill} />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="white"
        fontSize={chain === "BTC" ? 11 : 12}
        fontWeight={700}
        fontFamily='system-ui, -apple-system, "Segoe UI", sans-serif'
      >
        {cfg.label}
      </text>
    </svg>
  );
};

const svgStroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SvgSearch = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden
    style={{ flexShrink: 0, display: "block" }}
    {...svgStroke}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const SvgGlobe = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden
    style={{ flexShrink: 0, display: "block" }}
    {...svgStroke}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SvgChevronDown = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden
    style={{ flexShrink: 0, display: "block" }}
    {...svgStroke}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SvgFilter = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden
    style={{ flexShrink: 0, display: "block" }}
    {...svgStroke}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const OverlayIcon = ({
  mainIcon,
  subIcon,
  symbol,
}: {
  mainIcon: string;
  subIcon?: string;
  symbol?: string;
}) => {
  const [mainFailed, setMainFailed] = useState(false);
  const fallbackLabel = (symbol || "?").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: 44,
        height: 44,
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!mainFailed ? (
        <img
          src={mainIcon}
          alt=""
          onError={() => setMainFailed(true)}
          style={{
            width: 40,
            height: 40,
            objectFit: "contain",
            borderRadius: "50%",
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            letterSpacing: "0.02em",
          }}
        >
          {fallbackLabel}
        </div>
      )}
      {subIcon && (
        <img
          src={subIcon}
          alt=""
          style={{
            width: 16,
            height: 16,
            objectFit: "contain",
            position: "absolute",
            bottom: 0,
            right: 0,
            borderRadius: "50%",
            border: "2px solid #fff",
            background: "#fff",
          }}
        />
      )}
    </div>
  );
};

interface ActionItem {
  label: string;
  icon: string;
  changeTab: () => void;
}

type PopularToken = { symbol: string; name: string; address: string };

/** Home token row — used to open Send with the right asset (BNB vs FDA vs custom). */
export type HomeHoldingRow = {
  key: string;
  symbol: string;
  name: string;
  amountStr: string;
  value: number;
  quoteCurrency: "USD" | "INR";
  changePct: number | null;
  mainIcon: string;
  subIcon?: string;
  assetKind: "bnb" | "fda-chain" | "fda-internal" | "custom";
  /** Set for FDA rows and custom tokens (BEP20 address). */
  tokenAddress: string | null;
};

interface MobileDashboardProps {
  auth: AuthState | null;
  price: number | null;
  change: string;
  actions: ActionItem[];
  nativeBalance: string;
  fdaBalance: string;
  allWallets: WalletMeta[];
  indiAction: () => void;
  internalFdaBalance: number | null;
  setActiveTab: (tab: Tab | string) => void;
  tokens?: PopularToken[];
  tokenPrices?: Record<string, number>;
  customTokens?: CustomToken[];
  customTokenBalances?: Record<string, string>;
  /** Opens Send tab with BNB / FDA / custodial FDA / custom token preset. */
  onAssetClick?: (row: HomeHoldingRow) => void;
  /** @deprecated Prefer onAssetClick — kept for older callers */
  onFdaClick?: () => void;
}

const allTabs: Tab[] = [
  "dashboard",
  "create",
  "import",
  "unlock",
  "send",
  "tokens",
  "wallets",
  "fdawallets",
  "metamask",
  "p2p",
  "trade-listing",
  "history",
  "profile",
  "charts",
  "payment-methods",
  "view-phrases",
];

type AssetTab = "tokens" | "perps" | "predictions" | "defi";

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatInr(n: number): string {
  if (!Number.isFinite(n)) return "INR.V 0.00";
  const amount = new Intl.NumberFormat("en-IN", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `INR.V ${amount}`;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({
  auth,
  price,
  change,
  actions,
  indiAction,
  internalFdaBalance,
  setActiveTab,
  nativeBalance,
  fdaBalance,
  tokenPrices = {},
  tokens = [],
  customTokens = [],
  customTokenBalances = {},
  onAssetClick,
  onFdaClick,
}) => {
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkData, setNetworkData] = useState<any>({});
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<
    "All" | "BNB" | "ETH" | "BTC" | "TRON"
  >("BNB");
  const [search, setSearch] = useState("");
  const [searchBar, setSearchBar] = useState(false);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [assetTab, setAssetTab] = useState<AssetTab>("tokens");

  const open = () => setSearchBar(true);
  const close = () => setSearchBar(false);
  const filteredTabs = allTabs.filter((tab) =>
    tab.toLowerCase().includes(search.toLowerCase()),
  );

  const priceForAddress = (addr: string): number => {
    const a = addr.toLowerCase();
    return tokenPrices[a] ?? tokenPrices[addr] ?? 0;
  };

  const holdingRows = useMemo(() => {
    const rows: HomeHoldingRow[] = [];

    const bnbPx = priceForAddress(BNB_NATIVE);
    const nb = parseFloat(nativeBalance || "0");
    if (nb > 1e-18) {
      rows.push({
        key: "bnb",
        symbol: "BNB",
        name: "BNB",
        amountStr: nb.toFixed(5),
        value: nb * bnbPx,
        quoteCurrency: "USD",
        changePct: null,
        mainIcon: BNB,
        subIcon: Radium,
        assetKind: "bnb",
        tokenAddress: null,
      });
    }

    const fdaAddr = FDA_TOKEN_ADDRESS.toLowerCase();
    const fdaPx =
      tokenPrices[fdaAddr] ??
      tokenPrices[FDA_TOKEN_ADDRESS] ??
      (price != null ? Number(price) : 0);

    const fb = parseFloat(fdaBalance || "0");
    if (fb > 1e-18) {
      rows.push({
        key: "fda-chain",
        symbol: "FDA",
        name: "Future Digi Assets",
        amountStr: fb.toFixed(5),
        value: fb * fdaPx,
        quoteCurrency: "INR",
        changePct: null,
        mainIcon: FDA_LOGO_URL,
        subIcon: pancakeswap,
        assetKind: "fda-chain",
        tokenAddress: FDA_TOKEN_ADDRESS,
      });
    }

    const intFda = internalFdaBalance ?? 0;
    if (intFda > 1e-12) {
      rows.push({
        key: "fda-internal",
        symbol: "FDA",
        name: "FDA (custodial)",
        amountStr: intFda.toFixed(5),
        value: intFda * (price != null ? Number(price) : 0),
        quoteCurrency: "INR",
        changePct: null,
        mainIcon: FDA_LOGO_URL,
        subIcon: hydro,
        assetKind: "fda-internal",
        tokenAddress: FDA_TOKEN_ADDRESS,
      });
    }

    for (const t of customTokens) {
      const addr = t.address;
      const balStr =
        customTokenBalances[addr.toLowerCase()] ??
        customTokenBalances[addr] ??
        customTokenBalances[addr.toUpperCase()] ??
        "0";
      if (balStr === "Error") {
        rows.push({
          key: `cust-${addr}`,
          symbol: t.symbol || "?",
          name: t.name || t.symbol || "?",
          amountStr: "—",
          value: 0,
          quoteCurrency: "USD",
          changePct: null,
          mainIcon: ETH,
          subIcon: osmo,
          assetKind: "custom",
          tokenAddress: addr,
        });
        continue;
      }
      const bal = parseFloat(balStr);
      if (!Number.isFinite(bal) || bal < 0) continue;
      const px = priceForAddress(addr);
      const sym = t.symbol || "?";
      let mainIcon = ETH;
      if (sym.toUpperCase() === "USDT") mainIcon = BNB;
      if (sym.toUpperCase() === "BNB") mainIcon = BNB;
      rows.push({
        key: `cust-${addr}`,
        symbol: sym,
        name: t.name || sym,
        amountStr: bal > 1 ? bal.toFixed(4) : bal.toFixed(8),
        value: bal * px,
        quoteCurrency: "USD",
        changePct: null,
        mainIcon,
        subIcon: osmo,
        assetKind: "custom",
        tokenAddress: addr,
      });
    }

    return rows;
  }, [
    nativeBalance,
    fdaBalance,
    internalFdaBalance,
    tokenPrices,
    customTokens,
    customTokenBalances,
    price,
  ]);

  const portfolioTotals = useMemo(
    () =>
      holdingRows.reduce(
        (acc, r) => {
          if (r.quoteCurrency === "INR") acc.inr += r.value;
          else acc.usd += r.value;
          return acc;
        },
        { usd: 0, inr: 0 },
      ),
    [holdingRows],
  );

  const fetchUserTokens = async () => {
    try {
      const res = await fetch(
        "https://merchantcoinwallet.com/api/customTokens",
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        },
      );

      const data = await res.json();
      const filtered = (data.tokens || []).filter(
        (t: any) => t.status !== "GLOBAL",
      );
      setUserTokens(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNetworks = async () => {
    try {
      setLoadingNetworks(true);
      const results = await fetchAllPopularNetworkPairs();
      setNetworkData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNetworks(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
    fetchUserTokens();
  }, []);

  /** Curated per-chain pairs from dexPopularTokens — show top markets for the selected network */
  const getFilteredData = () => {
    if (selectedNetwork === "All") {
      return [
        ...(networkData?.BNB || []).slice(0, 5),
        ...(networkData?.ETH || []).slice(0, 5),
        ...(networkData?.BTC || []).slice(0, 5),
        ...(networkData?.TRON || []).slice(0, 5),
      ];
    }
    return (networkData?.[selectedNetwork] || []).slice(0, 18);
  };

  const networkPillLabel =
    selectedNetwork === "BNB"
      ? "BNB Chain"
      : selectedNetwork === "ETH"
        ? "Ethereum"
        : selectedNetwork === "BTC"
          ? "Bitcoin"
          : selectedNetwork === "TRON"
            ? "Tron"
            : "Networks";

  const iconBtn: React.CSSProperties = {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: `1px solid ${MM.borderLight}`,
    background: MM.surface,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <>
      <div
        style={{
          padding: `12px 16px calc(96px + env(safe-area-inset-bottom, 0px))`,
          background: MM.pageBg,
          minHeight: "100%",
        }}
      >
        {/* Hidden quick navigation — open via menu search icon */}
        <div style={{ marginBottom: 8, position: "relative" }}>
          <button
            type="button"
            onClick={() => (searchBar ? close() : open())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              borderRadius: MM.radius,
              border: `1px solid ${MM.borderLight}`,
              background: MM.surface,
              color: MM.textSecondary,
              fontSize: 14,
            }}
          >
            <span style={{ color: MM.textSecondary, display: "flex" }}>
              <SvgSearch size={18} />
            </span>
            <span>Search or jump to screen…</span>
          </button>
          {searchBar && (
            <div style={{ marginTop: 8 }}>
              <input
                type="search"
                placeholder="Filter screens"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                }}
                autoFocus
                style={{
                  fontSize: 16,
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          )}
          {searchBar && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 6,
                background: "#fff",
                borderRadius: 12,
                zIndex: 999,
                maxHeight: 240,
                overflowY: "auto",
                color: "#0f172a",
                boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
                border: "1px solid #e5e7eb",
              }}
            >
              {filteredTabs.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 8, margin: 0 }}>
                  {filteredTabs.map((tab, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        setSearch("");
                        setSearchBar(false);
                        setActiveTab(tab);
                      }}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderRadius: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ textTransform: "capitalize" }}>{tab}</span>
                      <span
                        style={{
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          paddingInline: 10,
                          borderRadius: 8,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Go
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ padding: 12 }}>No results</p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              color: MM.text,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {portfolioTotals.inr > 0 ? formatInr(portfolioTotals.inr) : formatUsd(portfolioTotals.usd)}
          </span>
          <span
            style={{ color: MM.textSecondary, fontWeight: 500, fontSize: 13 }}
          >
            Total balance
          </span>
          {portfolioTotals.inr > 0 && portfolioTotals.usd > 0 && (
            <span style={{ color: MM.textSecondary, fontWeight: 500, fontSize: 12 }}>
              + {formatUsd(portfolioTotals.usd)} in USD assets
            </span>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: change.includes("-") ? "#dc2626" : "#16a34a",
            }}
          >
            {change}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          {actions.map((item, i) => (
            <button
              type="button"
              key={i}
              onClick={item.changeTab}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: MM.chipBg,
                border: `1px solid ${MM.borderLight}`,
                borderRadius: MM.radiusLg,
                padding: "14px 8px",
                cursor: "pointer",
              }}
            >
              <i
                className={item.icon}
                style={{ fontSize: 20, color: MM.text }}
              />
              <span
                style={{
                  color: MM.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            paddingBlock: 14,
            borderBottom: `1px solid ${MM.borderLight}`,
            marginBottom: 8,
            gap: 4,
          }}
        >
          {(
            [
              ["tokens", "Tokens"],
              ["perps", "Perps"],
              ["predictions", "Predictions"],
              ["defi", "DeFi"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAssetTab(id)}
              style={{
                background: "none",
                border: "none",
                padding: "4px 2px",
                cursor: "pointer",
                color: assetTab === id ? MM.text : MM.textMuted,
                fontWeight: assetTab === id ? 700 : 500,
                borderBottom:
                  assetTab === id
                    ? `3px solid ${MM.accent}`
                    : "3px solid transparent",
                marginBottom: -15,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {assetTab !== "tokens" && (
          <MobileExplorePanels
            tab={assetTab}
            onOpenCharts={() => setActiveTab("charts")}
          />
        )}

        {assetTab === "tokens" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto",
                alignItems: "center",
                gap: 10,
                backgroundColor: MM.surface,
                borderRadius: MM.radius,
                padding: "10px 12px",
                marginBottom: 12,
                border: `1px solid ${MM.borderLight}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={showNetworkModal}
                aria-label={`Network: ${networkPillLabel}. Open to change network`}
                style={{
                  padding: "10px 12px",
                  background: MM.pageBg,
                  color: MM.text,
                  borderRadius: 999,
                  border: `1px solid ${MM.border}`,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  minWidth: 0,
                  width: "100%",
                }}
                onClick={() => {
                  setShowNetworkModal(true);
                  if (!networkData?.BNB?.length) {
                    fetchNetworks();
                  }
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  {selectedNetwork === "All" ? (
                    <span
                      style={{
                        color: MM.textSecondary,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SvgGlobe size={20} />
                    </span>
                  ) : (
                    <NetworkChainGlyph chain={selectedNetwork} />
                  )}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {networkPillLabel}
                  </span>
                </span>
                <span
                  style={{
                    color: MM.textSecondary,
                    flexShrink: 0,
                    opacity: 0.85,
                    display: "flex",
                  }}
                  aria-hidden
                >
                  <SvgChevronDown size={14} />
                </span>
              </button>
              <button
                type="button"
                aria-label="Filter and manage tokens"
                title="Filter"
                onClick={indiAction}
                style={{
                  ...iconBtn,
                  border: `1px solid ${MM.border}`,
                  color: MM.textSecondary,
                }}
              >
                <SvgFilter size={18} />
              </button>
              <button
                type="button"
                aria-label="Add token"
                title="Add token"
                onClick={() => setShowAddTokenModal(true)}
                style={{
                  ...iconBtn,
                  border: `1px solid ${MM.accentMuted}`,
                  background: MM.accentMuted,
                  color: MM.accent,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontSize: 24,
                    fontWeight: 300,
                    lineHeight: 1,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  +
                </span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              {(["All", "BNB", "ETH", "BTC", "TRON"] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setSelectedNetwork(net)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedNetwork === net ? "#2563eb" : "#fff",
                    color: selectedNetwork === net ? "#fff" : "#64748b",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor:
                      selectedNetwork === net ? "#2563eb" : "#e5e7eb",
                  }}
                >
                  {net}
                </button>
              ))}
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 4,
                border: "1px solid #e5e7eb",
              }}
            >
              {holdingRows.length > 0
                ? holdingRows.map((row) => (
                    <div
                      key={row.key}
                      role={onAssetClick || (row.symbol === "FDA" && onFdaClick) ? "button" : undefined}
                      tabIndex={onAssetClick || (row.symbol === "FDA" && onFdaClick) ? 0 : undefined}
                      onClick={() => {
                        if (onAssetClick) {
                          onAssetClick(row);
                          return;
                        }
                        if (row.symbol === "FDA" && onFdaClick) onFdaClick();
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        if (onAssetClick) {
                          onAssetClick(row);
                          return;
                        }
                        if (row.symbol === "FDA" && onFdaClick) onFdaClick();
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 10px",
                        borderRadius: 10,
                        cursor:
                          onAssetClick || (row.symbol === "FDA" && onFdaClick)
                            ? "pointer"
                            : "default",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                        <OverlayIcon
                          mainIcon={row.mainIcon}
                          subIcon={row.subIcon}
                          symbol={row.symbol}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: "#64748b",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {row.name}
                          </div>
                          <div
                            style={{
                              fontSize: 16,
                              color: "#0f172a",
                              fontWeight: 700,
                            }}
                          >
                            {row.symbol}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: 600,
                            fontSize: 15,
                          }}
                        >
                          {row.quoteCurrency === "INR"
                            ? formatInr(row.value)
                            : formatUsd(row.value)}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {row.amountStr} {row.symbol}
                        </div>
                        {row.changePct != null && (
                          <div
                            style={{
                              fontSize: 12,
                              color:
                                row.changePct < 0 ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {row.changePct >= 0 ? "+" : ""}
                            {row.changePct.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                : null}

              {holdingRows.length === 0 && loadingNetworks && (
                <p style={{ color: "#64748b", padding: 16, margin: 0 }}>
                  Loading markets…
                </p>
              )}

              {holdingRows.length === 0 &&
                !loadingNetworks &&
                getFilteredData().map((pair: any, i: number) => {
                  const p = parseFloat(pair.priceUsd || 0);
                  const ch = pair.priceChange?.h24 || 0;
                  const isNegative = ch < 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: 12,
                        marginTop: 4,
                        borderRadius: 10,
                        borderTop: i > 0 ? "1px solid #f3f4f6" : undefined,
                      }}
                    >
                      <div style={{ display: "flex", gap: 12 }}>
                        <OverlayIcon
                          mainIcon={
                            HomePageImage[i % HomePageImage.length].main
                          }
                          subIcon={
                            HomePageImage[i % HomePageImage.length].sub
                          }
                          symbol={pair.baseToken?.symbol}
                        />
                        <div>
                          <div
                            style={{
                              color: "#64748b",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {pair.baseToken?.symbol}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: "#0f172a",
                              textTransform: "capitalize",
                              fontWeight: 600,
                            }}
                          >
                            {pair.dexId}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#0f172a", fontWeight: 600 }}>
                          ${p.toFixed(2)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: isNegative ? "#dc2626" : "#16a34a",
                          }}
                        >
                          {isNegative ? "" : "+"}
                          {ch.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}

              {holdingRows.length === 0 &&
                !loadingNetworks &&
                getFilteredData().length === 0 && (
                  <div
                    style={{
                      padding: 16,
                      color: "#64748b",
                      fontSize: 14,
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    No balances yet. Use{" "}
                    <strong style={{ color: "#2563eb" }}>Receive</strong> above or
                    tap <strong style={{ color: "#2563eb" }}>Add</strong> (top
                    right).
                    <br />
                    <span style={{ fontSize: 13 }}>
                      No market rows for this chain — try another network pill or
                      pick <strong>All</strong>.
                    </span>
                  </div>
                )}
            </div>
          </>
        )}
      </div>

      <NetworkModal
        auth={auth}
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        data={networkData}
        loading={loadingNetworks}
        userTokens={userTokens}
        onAdded={fetchUserTokens}
        indiAction={indiAction}
      />

      <AddCustomTokenModal
        isOpen={showAddTokenModal}
        onClose={() => setShowAddTokenModal(false)}
        auth={auth}
        userTokens={userTokens}
        onAdded={fetchUserTokens}
        initialImportNetwork={
          selectedNetwork === "All" ? "BNB" : selectedNetwork
        }
      />
    </>
  );
};

export default MobileDashboard;
