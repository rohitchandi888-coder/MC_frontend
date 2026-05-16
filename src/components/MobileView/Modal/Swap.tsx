import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import type { WalletMeta } from "../../../walletStorage";
import type { AuthState } from "../../types";
import {
  DEFAULT_RPC_URL,
  ERC20_ABI,
  FDA_TOKEN_ADDRESS,
} from "../../types";
import { getApiUrl } from "../../../config";
import { MessageModal } from "../../modals/MessageModal";
import { QrAddressScannerModal } from "../../wallet/QrAddressScannerModal";
import { MM } from "../../../theme/metaMaskShell";

const PANCAKE_ROUTER_V2 = "0x10ED43C71871416363D554556468E5548C9507D8";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD_BSC = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

/** Liquidity hubs for V2 routing (tries all; picks best output). */
const ROUTER_HUBS = [WBNB, BUSD_BSC, USDT_BSC] as const;

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
];

const ERC20_EXT = [
  ...ERC20_ABI,
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export type SwapTokenSymbol = "BNB" | "FDA" | "USDT" | "BUSD";

const SWAP_TOKENS: { symbol: SwapTokenSymbol; address: string | null }[] = [
  { symbol: "BNB", address: null },
  { symbol: "FDA", address: FDA_TOKEN_ADDRESS },
  { symbol: "USDT", address: USDT_BSC },
  { symbol: "BUSD", address: BUSD_BSC },
];

function routeAddr(sym: SwapTokenSymbol): string {
  if (sym === "BNB") return WBNB;
  const t = SWAP_TOKENS.find((x) => x.symbol === sym);
  if (!t?.address) throw new Error("Unknown token");
  return t.address;
}

function formatBalanceDisplay(formatted: string): string {
  const n = Number(formatted);
  if (!Number.isFinite(n)) return formatted;
  if (n === 0) return "0";
  if (Math.abs(n) < 1e-8) return n.toExponential(2);
  if (Math.abs(n) >= 1e6) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function pathHasNoRepeatedAdjacent(path: string[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].toLowerCase() === path[i + 1].toLowerCase()) return false;
  }
  return path.length >= 2;
}

/** All candidate V2 paths up to 3 hops (direct + 1 hub + 2 hubs). */
function buildCandidatePaths(tokenIn: string, tokenOut: string): string[][] {
  const a = tokenIn;
  const b = tokenOut;
  if (a.toLowerCase() === b.toLowerCase()) return [];
  const seen = new Set<string>();
  const out: string[][] = [];
  const push = (p: string[]) => {
    if (!pathHasNoRepeatedAdjacent(p)) return;
    const k = p.map((x) => x.toLowerCase()).join(">");
    if (seen.has(k)) return;
    seen.add(k);
    out.push(p);
  };

  push([a, b]);

  for (const h of ROUTER_HUBS) {
    if (h.toLowerCase() === a.toLowerCase() || h.toLowerCase() === b.toLowerCase())
      continue;
    push([a, h, b]);
  }

  for (const h1 of ROUTER_HUBS) {
    for (const h2 of ROUTER_HUBS) {
      if (h1.toLowerCase() === h2.toLowerCase()) continue;
      push([a, h1, h2, b]);
    }
  }

  return out;
}

async function findBestPathAndOut(
  router: ethers.Contract,
  amountIn: bigint,
  paths: string[][],
): Promise<{ path: string[]; amountOut: bigint } | null> {
  let bestOut = 0n;
  let bestPath: string[] | null = null;
  for (const path of paths) {
    try {
      const amounts = await router.getAmountsOut(amountIn, path);
      const last = amounts[amounts.length - 1];
      if (last > bestOut) {
        bestOut = last;
        bestPath = path;
      }
    } catch {
      /* pair / path missing */
    }
  }
  if (!bestPath || bestOut === 0n) return null;
  return { path: bestPath, amountOut: bestOut };
}

function addressToRouteLabel(addr: string): string {
  const L = addr.toLowerCase();
  if (L === WBNB.toLowerCase()) return "WBNB";
  if (L === BUSD_BSC.toLowerCase()) return "BUSD";
  if (L === USDT_BSC.toLowerCase()) return "USDT";
  if (L === FDA_TOKEN_ADDRESS.toLowerCase()) return "FDA";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function describeRoute(path: string[]): string {
  if (path.length <= 2) return "Direct";
  const mids = path.slice(1, -1).map(addressToRouteLabel);
  return mids.join(" → ");
}

interface SwapModalProps {
  user: AuthState | null;
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletMeta[];
  onSwitchWallet: (walletId: string) => void;
  storedMeta: { address: string; label?: string; network?: string } | null;
  internalFdaBalance: number | null;
  unlockedPrivateKeyRef: React.MutableRefObject<string | null>;
  nativeBalance: string | null;
  fdaBalance: string | null;
  /** Android-only FDA Authenticator gate before internal FDA transfer. */
  requestFdaAuthenticator?: (action: () => void | Promise<void>) => void;
  onSwapComplete?: () => void;
}

const SwapWalletModal: React.FC<SwapModalProps> = ({
  user,
  isOpen,
  onClose,
  wallets,
  onSwitchWallet,
  storedMeta,
  internalFdaBalance,
  unlockedPrivateKeyRef,
  nativeBalance,
  fdaBalance,
  requestFdaAuthenticator,
  onSwapComplete,
}) => {
  const [mode, setMode] = useState<"swap" | "internal">("swap");
  const [fromSym, setFromSym] = useState<SwapTokenSymbol>("BNB");
  const [toSym, setToSym] = useState<SwapTokenSymbol>("FDA");
  const [amountIn, setAmountIn] = useState("");
  const [slippagePreset, setSlippagePreset] = useState<0.5 | 1 | 3>(1);
  const [slippageUseCustom, setSlippageUseCustom] = useState(false);
  const [slippageCustom, setSlippageCustom] = useState("");
  const [quoteOut, setQuoteOut] = useState<string | null>(null);
  const [routeDescription, setRouteDescription] = useState<string | null>(
    null,
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [decimalsCache, setDecimalsCache] = useState<Record<string, number>>(
    {},
  );
  const [dexExtraBalances, setDexExtraBalances] = useState<
    Partial<Record<"USDT" | "BUSD", string>>
  >({});

  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const provider = useMemo(
    () => new ethers.JsonRpcProvider(DEFAULT_RPC_URL),
    [],
  );

  const showErrorModal = (msg: string) => {
    setMessage(msg);
    setShowMessageModal(true);
  };
  const closeMessageModal = () => setShowMessageModal(false);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      for (const t of SWAP_TOKENS) {
        if (!t.address) continue;
        try {
          const c = new ethers.Contract(t.address, ERC20_EXT, provider);
          const d = Number(await c.decimals());
          if (!cancelled) {
            setDecimalsCache((prev) => ({ ...prev, [t.address!]: d }));
          }
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, provider]);

  const getDecimals = useCallback(
    (sym: SwapTokenSymbol): number => {
      if (sym === "BNB") return 18;
      const addr = SWAP_TOKENS.find((x) => x.symbol === sym)?.address;
      if (addr && decimalsCache[addr] != null) return decimalsCache[addr];
      return 18;
    },
    [decimalsCache],
  );

  const fetchDexExtraBalances = useCallback(async () => {
    if (!storedMeta?.address) {
      setDexExtraBalances({});
      return;
    }
    const owner = storedMeta.address;
    const next: Partial<Record<"USDT" | "BUSD", string>> = {};
    await Promise.all(
      (["USDT", "BUSD"] as const).map(async (sym) => {
        const token = SWAP_TOKENS.find((x) => x.symbol === sym);
        if (!token?.address) return;
        try {
          const c = new ethers.Contract(token.address, ERC20_ABI, provider);
          const [raw, dec] = await Promise.all([
            c.balanceOf(owner),
            c.decimals(),
          ]);
          next[sym] = formatBalanceDisplay(ethers.formatUnits(raw, dec));
        } catch {
          next[sym] = "—";
        }
      }),
    );
    setDexExtraBalances(next);
  }, [storedMeta?.address, provider]);

  useEffect(() => {
    if (!isOpen || mode !== "swap") return;
    void fetchDexExtraBalances();
  }, [isOpen, mode, fetchDexExtraBalances]);

  const dexBalanceLabel = (sym: SwapTokenSymbol): string => {
    if (sym === "BNB") return nativeBalance ?? "—";
    if (sym === "FDA") return fdaBalance ?? "—";
    return dexExtraBalances[sym] ?? "…";
  };

  const slippageConfig = useMemo(() => {
    if (!slippageUseCustom) {
      return {
        pct: slippagePreset,
        valid: true,
        highSlippage: false,
        error: null as string | null,
      };
    }
    const raw = slippageCustom.trim().replace(/,/g, ".");
    if (raw === "") {
      return {
        pct: slippagePreset,
        valid: false,
        highSlippage: false,
        error: "Enter slippage %",
      };
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0.01 || n > 50) {
      return {
        pct: slippagePreset,
        valid: false,
        highSlippage: false,
        error: "Use 0.01% – 50%",
      };
    }
    return {
      pct: n,
      valid: true,
      highSlippage: n > 5,
      error: null as string | null,
    };
  }, [slippageUseCustom, slippageCustom, slippagePreset]);

  const fetchQuote = useCallback(async () => {
    setQuoteError(null);
    setQuoteOut(null);
    setRouteDescription(null);
    if (!amountIn.trim() || Number(amountIn) <= 0) return;
    if (fromSym === toSym) {
      setQuoteError("Select two different tokens.");
      return;
    }
    setQuoteLoading(true);
    try {
      const tokenIn = routeAddr(fromSym);
      const tokenOut = routeAddr(toSym);
      const paths = buildCandidatePaths(tokenIn, tokenOut);
      const dec = getDecimals(fromSym);
      const amt = ethers.parseUnits(amountIn.trim(), dec);
      if (amt <= 0n) {
        setQuoteLoading(false);
        return;
      }
      const router = new ethers.Contract(
        PANCAKE_ROUTER_V2,
        ROUTER_ABI,
        provider,
      );
      const best = await findBestPathAndOut(router, amt, paths);
      if (!best) {
        setQuoteError("No liquid route on Pancake V2 for this pair.");
        return;
      }
      const outDec = getDecimals(toSym);
      setQuoteOut(ethers.formatUnits(best.amountOut, outDec));
      setRouteDescription(describeRoute(best.path));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "No quote (low liquidity or RPC).";
      setQuoteError(msg);
    } finally {
      setQuoteLoading(false);
    }
  }, [amountIn, fromSym, toSym, provider, getDecimals]);

  useEffect(() => {
    if (!isOpen || mode !== "swap") return;
    const t = setTimeout(() => {
      void fetchQuote();
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, mode, fetchQuote]);

  const flipTokens = () => {
    const a = fromSym;
    setFromSym(toSym);
    setToSym(a);
    setAmountIn("");
    setQuoteOut(null);
    setRouteDescription(null);
  };

  const ensureAllowance = async (
    tokenAddr: string,
    owner: string,
    signer: ethers.Wallet,
    need: bigint,
  ) => {
    const token = new ethers.Contract(tokenAddr, ERC20_EXT, signer);
    const cur = await token.allowance(owner, PANCAKE_ROUTER_V2);
    if (cur >= need) return;
    const tx = await token.approve(
      PANCAKE_ROUTER_V2,
      ethers.MaxUint256,
    );
    await tx.wait();
  };

  const handleDexSwap = async () => {
    if (!unlockedPrivateKeyRef.current || !storedMeta?.address) {
      showErrorModal(
        "Unlock your wallet first (Unlock tab — 13th word) to sign swaps on BNB Chain.",
      );
      return;
    }
    if (!amountIn.trim() || Number(amountIn) <= 0) {
      showErrorModal("Enter an amount to swap.");
      return;
    }
    if (fromSym === toSym) {
      showErrorModal("Choose two different tokens.");
      return;
    }
    if (slippageUseCustom && !slippageConfig.valid) {
      showErrorModal(`⚠️ ${slippageConfig.error || "Invalid slippage"}`);
      return;
    }

    setSwapping(true);
    try {
      const tokenIn = routeAddr(fromSym);
      const tokenOut = routeAddr(toSym);
      const paths = buildCandidatePaths(tokenIn, tokenOut);
      const decIn = getDecimals(fromSym);
      const decOut = getDecimals(toSym);
      const amountInWei = ethers.parseUnits(amountIn.trim(), decIn);

      const routerRead = new ethers.Contract(
        PANCAKE_ROUTER_V2,
        ROUTER_ABI,
        provider,
      );
      const best = await findBestPathAndOut(routerRead, amountInWei, paths);
      if (!best) {
        showErrorModal("⚠️ No liquid route for this pair right now.");
        return;
      }
      const path = best.path;
      const expectedOut = best.amountOut;
      const bps = Math.min(
        9999,
        Math.max(1, Math.round(slippageConfig.pct * 100)),
      );
      const amountOutMin =
        (expectedOut * BigInt(10000 - bps)) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

      const wallet = new ethers.Wallet(
        unlockedPrivateKeyRef.current,
        provider,
      );
      const router = new ethers.Contract(
        PANCAKE_ROUTER_V2,
        ROUTER_ABI,
        wallet,
      );

      if (fromSym === "BNB") {
        const tx = await router.swapExactETHForTokens(
          amountOutMin,
          path,
          wallet.address,
          deadline,
          { value: amountInWei },
        );
        await tx.wait();
      } else if (toSym === "BNB") {
        const tokenIn = routeAddr(fromSym);
        await ensureAllowance(
          tokenIn,
          wallet.address,
          wallet,
          amountInWei,
        );
        const tx = await router.swapExactTokensForETH(
          amountInWei,
          amountOutMin,
          path,
          wallet.address,
          deadline,
        );
        await tx.wait();
      } else {
        const tokenIn = routeAddr(fromSym);
        await ensureAllowance(
          tokenIn,
          wallet.address,
          wallet,
          amountInWei,
        );
        const tx = await router.swapExactTokensForTokens(
          amountInWei,
          amountOutMin,
          path,
          wallet.address,
          deadline,
        );
        await tx.wait();
      }

      showErrorModal(
        `✅ Swap confirmed. You received ~${formatBalanceDisplay(ethers.formatUnits(expectedOut, decOut))} ${toSym} (estimate; actual may vary with fees).`,
      );
      setAmountIn("");
      setQuoteOut(null);
      void fetchDexExtraBalances();
      onSwapComplete?.();
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error
          ? e.message
          : "Swap failed. Check balance, gas (BNB), and liquidity.";
      showErrorModal(`⚠️ ${msg}`);
    } finally {
      setSwapping(false);
    }
  };

  const executeTransfer = async () => {
    try {
      if (!storedMeta?.address) {
        showErrorModal("⚠️ No wallet selected.");
        return;
      }
      if (!selectedWallet) {
        showErrorModal("⚠️ Please select recipient wallet.");
        return;
      }
      if (!sendAmount || Number(sendAmount) <= 0) {
        showErrorModal("⚠️ Enter valid amount.");
        return;
      }
      const recipient = wallets.find((w: WalletMeta) => w.address === selectedWallet);
      const res = await fetch(getApiUrl("internal/transfer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          fromAddress: storedMeta.address,
          toAddress: selectedWallet,
          amount: Number(sendAmount),
          note: `Internal transfer to ${recipient?.label || "Wallet"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorModal(`⚠️ ${data.error || "Transfer failed"}`);
        return;
      }
      showErrorModal(
        `✅ Sent ${sendAmount} FDA to ${recipient?.label} (instant, zero fee).`,
      );
      setSendAmount("");
      setSelectedWallet("");
      onSwapComplete?.();
    } catch (err) {
      console.error(err);
      showErrorModal("⚠️ Transfer failed. Try again.");
    }
  };

  const handleTransfer = () => {
    if (requestFdaAuthenticator) {
      requestFdaAuthenticator(() => void executeTransfer());
      return;
    }
    void executeTransfer();
  };

  if (!isOpen) return null;

  const shell: React.CSSProperties = {
    backgroundColor: MM.surface,
    width: "95%",
    maxWidth: 400,
    borderRadius: MM.radiusLg,
    padding: 16,
    color: MM.text,
    border: `1px solid ${MM.borderLight}`,
    boxShadow: MM.shadowModal,
    maxHeight: "90vh",
    overflowY: "auto",
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: MM.overlay,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: MM.zModal,
          padding: 12,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div style={shell} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Swap / Transfer
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                border: "none",
                background: MM.pageBg,
                color: MM.textSecondary,
                width: 36,
                height: 36,
                borderRadius: 999,
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              background: MM.pageBg,
              padding: 4,
              borderRadius: MM.radius,
            }}
          >
            {(
              [
                ["swap", "Swap (DEX)"],
                ["internal", "Internal FDA"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  background: mode === k ? MM.surface : "transparent",
                  color: mode === k ? MM.accent : MM.textSecondary,
                  boxShadow:
                    mode === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "swap" && (
            <div>
              {!unlockedPrivateKeyRef.current && (
                <p
                  style={{
                    fontSize: 13,
                    color: MM.textSecondary,
                    marginTop: 0,
                    marginBottom: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Unlock your wallet in the <strong>Unlock</strong> tab to sign
                  PancakeSwap trades on BNB Chain. Quotes still load for
                  planning.
                </p>
              )}

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                From
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <select
                  value={fromSym}
                  onChange={(e) =>
                    setFromSym(e.target.value as SwapTokenSymbol)
                  }
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: MM.radius,
                    border: `1px solid ${MM.border}`,
                    background: MM.surface,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {SWAP_TOKENS.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: MM.textMuted }}>
                  Bal: {dexBalanceLabel(fromSym)}
                </span>
              </div>

              <div style={{ textAlign: "center", margin: "8px 0" }}>
                <button
                  type="button"
                  onClick={flipTokens}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: `1px solid ${MM.border}`,
                    background: MM.pageBg,
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  aria-label="Flip tokens"
                >
                  ↕
                </button>
              </div>

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                To
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                <select
                  value={toSym}
                  onChange={(e) => setToSym(e.target.value as SwapTokenSymbol)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: MM.radius,
                    border: `1px solid ${MM.border}`,
                    background: MM.surface,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {SWAP_TOKENS.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: MM.textMuted }}>
                  Bal: {dexBalanceLabel(toSym)}
                </span>
              </div>

              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                }}
              >
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  marginTop: 6,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              />

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: MM.textSecondary,
                    }}
                  >
                    Slippage tolerance
                  </span>
                  <span style={{ fontSize: 11, color: MM.textMuted }}>
                    {slippageUseCustom
                      ? slippageConfig.valid
                        ? `${slippageConfig.pct}%`
                        : "—"
                      : `${slippagePreset}%`}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {([0.5, 1, 3] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSlippageUseCustom(false);
                        setSlippagePreset(p);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border:
                          !slippageUseCustom && slippagePreset === p
                            ? `1px solid ${MM.accent}`
                            : `1px solid ${MM.border}`,
                        background:
                          !slippageUseCustom && slippagePreset === p
                            ? MM.accentMuted
                            : MM.surface,
                        color:
                          !slippageUseCustom && slippagePreset === p
                            ? MM.accent
                            : MM.text,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {p}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSlippageUseCustom(true)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border:
                        slippageUseCustom
                          ? `1px solid ${MM.accent}`
                          : `1px solid ${MM.border}`,
                      background: slippageUseCustom
                        ? MM.accentMuted
                        : MM.surface,
                      color: slippageUseCustom ? MM.accent : MM.text,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Custom
                  </button>
                </div>
                {slippageUseCustom && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={slippageCustom}
                      onChange={(e) => setSlippageCustom(e.target.value)}
                      placeholder="e.g. 2.5"
                      aria-label="Custom slippage percent"
                      style={{
                        flex: 1,
                        maxWidth: 120,
                        padding: "8px 10px",
                        borderRadius: MM.radius,
                        border: `1px solid ${
                          slippageUseCustom && !slippageConfig.valid
                            ? "#dc2626"
                            : MM.border
                        }`,
                        background: MM.surface,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: MM.textSecondary,
                      }}
                    >
                      %
                    </span>
                  </div>
                )}
                {slippageUseCustom && slippageConfig.error && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      color: "#dc2626",
                    }}
                  >
                    {slippageConfig.error}
                  </p>
                )}
                {slippageConfig.valid && slippageConfig.highSlippage && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 12,
                      color: "#ca8a04",
                      lineHeight: 1.4,
                    }}
                  >
                    High slippage: trades may execute at worse prices and are
                    easier to sandwich. Use only if you understand the risk.
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: MM.pageBg,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.borderLight}`,
                  minHeight: 52,
                }}
              >
                {quoteLoading && (
                  <span style={{ color: MM.textSecondary }}>
                    Fetching quote…
                  </span>
                )}
                {!quoteLoading && quoteOut && (
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <div>
                      ≈ <strong>{quoteOut}</strong> {toSym} (est.)
                    </div>
                    {routeDescription && (
                      <div
                        style={{
                          fontSize: 12,
                          color: MM.textSecondary,
                          marginTop: 6,
                        }}
                      >
                        Route: {routeDescription}
                      </div>
                    )}
                  </div>
                )}
                {!quoteLoading && quoteError && (
                  <span style={{ fontSize: 13, color: "#b91c1c" }}>
                    {quoteError}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: 11,
                  color: MM.textMuted,
                  marginTop: 10,
                  lineHeight: 1.4,
                }}
              >
                PancakeSwap V2 on BNB Chain. Quotes pick the best of direct,
                WBNB, BUSD, and USDT routes (up to 3 hops). You need BNB for
                gas.
              </p>

              <button
                type="button"
                onClick={() => void handleDexSwap()}
                disabled={
                  swapping ||
                  !amountIn.trim() ||
                  (slippageUseCustom && !slippageConfig.valid)
                }
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 14,
                  borderRadius: MM.radius,
                  border: "none",
                  background: MM.accent,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: swapping ? "wait" : "pointer",
                  opacity: swapping ? 0.85 : 1,
                }}
              >
                {swapping ? "Confirming…" : "Swap"}
              </button>
            </div>
          )}

          {mode === "internal" && (
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: MM.textSecondary,
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                Zero-fee FDA transfer between your MC-registered wallets
                (server balance).
              </p>

              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: MM.text,
                }}
              >
                From
              </span>
              <div
                style={{
                  ...walletBox,
                  background: MM.pageBg,
                  border: `1px solid ${MM.borderLight}`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: MM.accentMuted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    color: MM.accent,
                  }}
                >
                  MC
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {storedMeta?.label || "Current Wallet"}
                  </div>
                  <div style={subText}>
                    {storedMeta?.address
                      ? `${storedMeta.address.slice(0, 14)}...${storedMeta.address.slice(-6)}`
                      : "—"}
                  </div>
                  <span style={{ fontSize: 13 }}>
                    FDA balance: {internalFdaBalance ?? "—"}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "center", margin: 10, color: MM.textMuted }}>
                ↓
              </div>

              <span style={{ fontSize: 14, fontWeight: 600 }}>To</span>
              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: MM.radius,
                  border: "none",
                  background: "#10b981",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Scan wallet QR (internal FDA)
              </button>
              <div
                style={{
                  maxHeight: 160,
                  overflowY: "auto",
                  marginTop: 6,
                }}
              >
                {wallets.map((w: WalletMeta) => (
                  <div
                    key={w.id}
                    style={{
                      ...walletBox,
                      background: MM.pageBg,
                      border: `1px solid ${MM.borderLight}`,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: MM.chipBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {w.network?.slice(0, 2) ?? "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{w.label}</div>
                      <div style={subText}>
                        {w.address.slice(0, 10)}...{w.address.slice(-5)}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSwitchWallet(w.id)}
                        style={{
                          marginTop: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: `1px solid ${MM.border}`,
                          background: MM.surface,
                          cursor: "pointer",
                        }}
                      >
                        Use wallet
                      </button>
                    </div>
                    <input
                      checked={selectedWallet === w.address}
                      onChange={() => setSelectedWallet(w.address)}
                      type="radio"
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                ))}
              </div>

              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="FDA amount"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  marginTop: 12,
                  borderRadius: MM.radius,
                  border: `1px solid ${MM.border}`,
                  fontSize: 16,
                }}
              />

              <button
                type="button"
                onClick={handleTransfer}
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: 14,
                  borderRadius: MM.radius,
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Send FDA internal
              </button>
            </div>
          )}
        </div>
      </div>
      <MessageModal
        show={showMessageModal}
        message={message}
        onClose={closeMessageModal}
      />
      <QrAddressScannerModal
        open={showQrScanner}
        title="Scan FDA wallet QR"
        subtitle="Internal FDA transfer — select recipient by QR"
        onClose={() => setShowQrScanner(false)}
        onAddress={(address) => {
          const match = wallets.find(
            (w: WalletMeta) => w.address.toLowerCase() === address.toLowerCase(),
          );
          if (match) {
            setSelectedWallet(match.address);
          } else {
            showErrorModal(
              "⚠️ Scanned wallet is not in your saved list. Register it or pick a wallet below.",
            );
          }
          setShowQrScanner(false);
        }}
      />
    </>
  );
};

export default SwapWalletModal;

const walletBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 10,
  marginTop: 6,
  borderRadius: 12,
};

const subText: React.CSSProperties = {
  fontSize: 13,
  color: "#6a737d",
};
