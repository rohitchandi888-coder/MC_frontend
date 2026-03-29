import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { FDA_TOKEN_ADDRESS, type AuthState } from "../types";
import type { CustomToken, WalletMeta } from "../../walletStorage";
import { MM } from "../../theme/metaMaskShell";

const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

export type SendStep = "recipient" | "asset" | "amount" | "review";

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function walletDisplayName(
  w: WalletMeta,
  index: number,
): string {
  const raw = w.label?.trim();
  if (raw && !/^new$/i.test(raw)) return raw;
  return `Wallet ${index + 1}`;
}

type AssetRow = {
  id: string;
  kind: "native" | "token";
  symbol: string;
  name: string;
  address: string | null;
  chain: "BNB";
};

interface SendTransferMobileProps {
  storedMeta: WalletMeta | null;
  allWallets: WalletMeta[];
  auth: AuthState | null;
  sendTo: string;
  setSendTo: (address: string) => void;
  sendAmount: string;
  setSendAmount: React.Dispatch<React.SetStateAction<string>>;
  assetType: "native" | "token";
  setAssetType: (type: "native" | "token") => void;
  tokenAddress: string;
  setTokenAddress: (address: string) => void;
  transferType: "internal" | "onchain";
  setTransferType: (type: "internal" | "onchain") => void;
  estimatedGas: string | null;
  estimatingGas: boolean;
  nativeBalance: string | null;
  fdaBalance: string | null;
  internalFdaBalance: number | null;
  recipientFdaWallet: Record<string, unknown> | null;
  customTokens: CustomToken[];
  customTokenBalances: Record<string, string>;
  fdaPrice: number | null;
  unlockedPrivateKeyRef: React.MutableRefObject<string | null>;
  handleSend: () => Promise<void>;
  handleMaxAmount: () => Promise<void>;
  registerRecipientWallet: (address: string, label?: string) => Promise<boolean | void>;
  onUnlock: () => void;
  onExit: () => void;
}

export const SendTransferMobile: React.FC<SendTransferMobileProps> = ({
  storedMeta,
  allWallets,
  auth,
  sendTo,
  setSendTo,
  sendAmount,
  setSendAmount,
  assetType,
  setAssetType,
  tokenAddress,
  setTokenAddress,
  transferType,
  setTransferType,
  estimatedGas,
  estimatingGas,
  nativeBalance,
  fdaBalance,
  internalFdaBalance,
  recipientFdaWallet,
  customTokens,
  customTokenBalances,
  fdaPrice,
  unlockedPrivateKeyRef,
  handleSend,
  handleMaxAmount,
  registerRecipientWallet,
  onUnlock,
  onExit,
}) => {
  const [step, setStep] = useState<SendStep>("recipient");
  const [assetSearch, setAssetSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<"all" | "bnb">("all");
  const [showFiat, setShowFiat] = useState(false);
  const [sending, setSending] = useState(false);

  const otherWallets = useMemo(
    () => allWallets.filter((w) => w.id !== storedMeta?.id),
    [allWallets, storedMeta?.id],
  );

  const baseAssets: AssetRow[] = useMemo(
    () => [
      {
        id: "native",
        kind: "native",
        symbol: "BNB",
        name: "BNB",
        address: null,
        chain: "BNB",
      },
      {
        id: "usdt",
        kind: "token",
        symbol: "USDT",
        name: "Tether USD",
        address: USDT_BSC,
        chain: "BNB",
      },
      {
        id: "fda",
        kind: "token",
        symbol: "FDA",
        name: "FutureDigiAssets",
        address: FDA_TOKEN_ADDRESS,
        chain: "BNB",
      },
    ],
    [],
  );

  const customRows: AssetRow[] = useMemo(() => {
    return (customTokens || [])
      .filter((t) => (t.status || "").toUpperCase() === "ON")
      .map((t) => ({
        id: `c-${t.address}`,
        kind: "token" as const,
        symbol: t.symbol || "?",
        name: t.name || t.symbol || "Token",
        address: t.address,
        chain: "BNB" as const,
      }));
  }, [customTokens]);

  const allAssetRows = useMemo(
    () => [...baseAssets, ...customRows],
    [baseAssets, customRows],
  );

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    let list = allAssetRows;
    if (networkFilter === "bnb") {
      list = list.filter((a) => a.chain === "BNB");
    }
    if (!q) return list;
    return list.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    );
  }, [allAssetRows, assetSearch, networkFilter]);

  const applyAsset = useCallback(
    (row: AssetRow) => {
      if (row.kind === "native") {
        setAssetType("native");
        setTokenAddress(FDA_TOKEN_ADDRESS);
        setTransferType("onchain");
      } else {
        setAssetType("token");
        setTokenAddress(row.address || "");
        const isFda =
          (row.address || "").toLowerCase() ===
          FDA_TOKEN_ADDRESS.toLowerCase();
        if (isFda && auth) {
          const to = sendTo.trim();
          const valid = to && ethers.isAddress(to);
          const isMc =
            valid && recipientFdaWallet && Object.keys(recipientFdaWallet).length;
          setTransferType(isMc ? "internal" : "onchain");
        } else {
          setTransferType("onchain");
        }
      }
    },
    [auth, recipientFdaWallet, sendTo, setAssetType, setTokenAddress, setTransferType],
  );

  useEffect(() => {
    if (step !== "asset" && step !== "amount" && step !== "review") return;
    if (assetType !== "token") return;
    if (tokenAddress.toLowerCase() !== FDA_TOKEN_ADDRESS.toLowerCase()) return;
    if (!auth) return;
    const to = sendTo.trim();
    if (!to || !ethers.isAddress(to)) return;
    const isMc = recipientFdaWallet && Object.keys(recipientFdaWallet).length;
    setTransferType(isMc ? "internal" : "onchain");
  }, [
    step,
    assetType,
    tokenAddress,
    auth,
    sendTo,
    recipientFdaWallet,
    setTransferType,
  ]);

  const selectedSymbol = useMemo(() => {
    if (assetType === "native") return "BNB";
    const t = tokenAddress.toLowerCase();
    if (t === FDA_TOKEN_ADDRESS.toLowerCase()) return "FDA";
    if (t === USDT_BSC.toLowerCase()) return "USDT";
    const c = customTokens.find(
      (x) => x.address.toLowerCase() === t,
    );
    return c?.symbol || "TOKEN";
  }, [assetType, tokenAddress, customTokens]);

  const availableAmountNum = useMemo(() => {
    if (assetType === "native") {
      return nativeBalance ? parseFloat(nativeBalance) : 0;
    }
    if (tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()) {
      if (transferType === "internal" && internalFdaBalance != null) {
        return internalFdaBalance;
      }
      return fdaBalance ? parseFloat(fdaBalance) : 0;
    }
    const bal = customTokenBalances[tokenAddress.toLowerCase()];
    return bal ? parseFloat(bal) : 0;
  }, [
    assetType,
    tokenAddress,
    transferType,
    internalFdaBalance,
    nativeBalance,
    fdaBalance,
    customTokenBalances,
  ]);

  const amountNum = parseFloat(sendAmount || "0") || 0;
  const fiatEstimate =
    selectedSymbol === "FDA" && fdaPrice != null && Number.isFinite(fdaPrice as number)
      ? amountNum * (fdaPrice as number)
      : null;

  const appendDigit = (d: string) => {
    if (d === "." && sendAmount.includes(".")) return;
    if (d === "." && sendAmount === "") {
      setSendAmount("0.");
      return;
    }
    const next = sendAmount + d;
    if (next.startsWith("0") && !next.startsWith("0.") && next.length > 1 && next[1] !== ".")
      return;
    setSendAmount(next);
  };

  const backspace = () => setSendAmount((s) => s.slice(0, -1));

  const pct = (p: number) => {
    const v = availableAmountNum * (p / 100);
    if (!Number.isFinite(v)) return;
    setSendAmount(v.toFixed(assetType === "native" ? 6 : 4).replace(/\.?0+$/, "") || "0");
  };

  const goBack = () => {
    if (step === "asset") setStep("recipient");
    else if (step === "amount") setStep("asset");
    else if (step === "review") setStep("amount");
    else onExit();
  };

  const shell: React.CSSProperties = {
    minHeight: "min(100dvh, 100vh)",
    background: MM.surface,
    color: MM.text,
    display: "flex",
    flexDirection: "column",
    marginInline: -12,
    marginTop: -12,
    paddingBottom: "env(safe-area-inset-bottom, 12px)",
  };

  const header = (
    title: string,
    showExit: boolean,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 8px",
        borderBottom: `1px solid ${MM.borderLight}`,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        style={{
          width: 40,
          height: 40,
          border: "none",
          background: "transparent",
          fontSize: 22,
          cursor: "pointer",
          color: MM.text,
        }}
      >
        ‹
      </button>
      <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
      {showExit ? (
        <button
          type="button"
          onClick={onExit}
          aria-label="Close"
          style={{
            width: 40,
            height: 40,
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
            color: MM.textSecondary,
          }}
        >
          ×
        </button>
      ) : (
        <span style={{ width: 40 }} />
      )}
    </div>
  );

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      const v = t.trim();
      if (v) setSendTo(v);
    } catch {
      /* ignore */
    }
  };

  if (!unlockedPrivateKeyRef.current) {
    return (
      <div style={{ ...shell, padding: 16 }}>
        {header("Send", true)}
        <div
          style={{
            padding: 20,
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: MM.radius,
            margin: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#92400e" }}>
            Wallet locked
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "#78350f" }}>
            Unlock with your 13th word to sign sends on BNB Chain.
          </p>
        </div>
        <button
          type="button"
          onClick={onUnlock}
          style={{
            margin: "0 16px",
            padding: 14,
            borderRadius: MM.radius,
            border: "none",
            background: MM.accent,
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Unlock wallet
        </button>
      </div>
    );
  }

  return (
    <div style={shell}>
      {step === "recipient" && (
        <>
          {header("Send", true)}
          <div style={{ padding: "12px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: MM.pageBg,
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${MM.borderLight}`,
              }}
            >
              <span style={{ fontSize: 14, color: MM.textSecondary, flexShrink: 0 }}>
                To
              </span>
              <input
                type="text"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value.trim())}
                placeholder="Enter address to send"
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 15,
                  outline: "none",
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={() => void paste()}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: MM.chipBg,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Paste
              </button>
            </div>
          </div>

          {otherWallets.length > 0 && (
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MM.textSecondary,
                  margin: "16px 0 8px",
                }}
              >
                Your wallets
              </p>
              {otherWallets.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSendTo(w.address);
                    setStep("asset");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 4px",
                    border: "none",
                    borderBottom: `1px solid ${MM.borderLight}`,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: i % 2 ? "#0f766e" : "#F3BA2F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {walletDisplayName(w, i).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {walletDisplayName(w, i)}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: MM.textSecondary,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {shortAddr(w.address)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: 16, marginTop: "auto" }}>
            <button
              type="button"
              disabled={!sendTo.trim() || !ethers.isAddress(sendTo.trim())}
              onClick={() => setStep("asset")}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: MM.radius,
                border: "none",
                background:
                  sendTo.trim() && ethers.isAddress(sendTo.trim())
                    ? MM.text
                    : MM.border,
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor:
                  sendTo.trim() && ethers.isAddress(sendTo.trim())
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === "asset" && (
        <>
          {header("Send", false)}
          <div style={{ padding: "12px 16px 8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: MM.pageBg,
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${MM.borderLight}`,
              }}
            >
              <span style={{ opacity: 0.5 }}>🔍</span>
              <input
                type="search"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search tokens"
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {(["all", "bnb"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setNetworkFilter(k === "all" ? "all" : "bnb")
                  }
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `1px solid ${
                      (k === "all" && networkFilter === "all") ||
                      (k === "bnb" && networkFilter === "bnb")
                        ? MM.accent
                        : MM.borderLight
                    }`,
                    background:
                      (k === "all" && networkFilter === "all") ||
                      (k === "bnb" && networkFilter === "bnb")
                        ? MM.accentMuted
                        : MM.surface,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {k === "all" ? (
                    "All"
                  ) : (
                    <>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#F3BA2F",
                          display: "inline-block",
                        }}
                      />
                      BNB Chain
                    </>
                  )}
                </button>
              ))}
            </div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: MM.textSecondary,
                margin: "12px 0 8px",
              }}
            >
              Tokens
            </p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            {filteredAssets.map((row) => {
              let bal: string;
              if (row.kind === "native") {
                bal = nativeBalance ?? "0";
              } else if (
                row.address?.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase()
              ) {
                const useInternal =
                  auth &&
                  internalFdaBalance != null &&
                  recipientFdaWallet &&
                  Object.keys(recipientFdaWallet).length > 0;
                bal = useInternal
                  ? String(internalFdaBalance)
                  : fdaBalance ?? "0";
              } else if (row.address) {
                bal = customTokenBalances[row.address.toLowerCase()] ?? "0";
              } else {
                bal = "0";
              }
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    applyAsset(row);
                    setSendAmount("");
                    setStep("amount");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 8px",
                    border: "none",
                    borderBottom: `1px solid ${MM.borderLight}`,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 44, height: 44 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: MM.chipBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 16,
                          color: MM.text,
                        }}
                      >
                        {row.symbol.slice(0, 2)}
                      </div>
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#F3BA2F",
                          border: "2px solid #fff",
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        {row.name}
                      </div>
                      <div style={{ fontSize: 13, color: MM.textSecondary }}>
                        {row.symbol}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {parseFloat(String(bal || 0)).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {row.symbol}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "amount" && (
        <>
          {header("Send", false)}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "16px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: amountNum > 0 ? MM.text : MM.textMuted,
                  letterSpacing: "-0.02em",
                }}
              >
                {sendAmount || "0"} {selectedSymbol}
              </div>
              <button
                type="button"
                onClick={() => setShowFiat(!showFiat)}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${MM.border}`,
                  background: MM.pageBg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showFiat && fiatEstimate != null
                  ? `≈ $${fiatEstimate.toFixed(2)}`
                  : `${amountNum.toFixed(4)} ${selectedSymbol}`}{" "}
                <span aria-hidden>⇅</span>
              </button>
              <p style={{ fontSize: 13, color: MM.textSecondary, marginTop: 10 }}>
                {availableAmountNum.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}{" "}
                {selectedSymbol} available
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    if (p !== 100) {
                      pct(p);
                      return;
                    }
                    if (assetType === "native") {
                      pct(100);
                      return;
                    }
                    if (transferType === "onchain") {
                      void handleMaxAmount();
                    } else {
                      pct(100);
                    }
                  }}
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `1px solid ${MM.borderLight}`,
                    background: MM.pageBg,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {p === 100 ? "Max" : `${p}%`}
                </button>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginTop: "auto",
              }}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === "⌫") backspace();
                      else appendDigit(k);
                    }}
                    style={{
                      padding: "16px 0",
                      borderRadius: 12,
                      border: `1px solid ${MM.borderLight}`,
                      background: MM.pageBg,
                      fontSize: 22,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {k}
                  </button>
                ),
              )}
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <button
              type="button"
              disabled={!sendAmount || Number(sendAmount) <= 0}
              onClick={() => setStep("review")}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: MM.radius,
                border: "none",
                background:
                  sendAmount && Number(sendAmount) > 0 ? MM.text : MM.border,
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor:
                  sendAmount && Number(sendAmount) > 0 ? "pointer" : "not-allowed",
              }}
            >
              Review
            </button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          {header("Sending", false)}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ margin: 0, color: MM.textSecondary, fontSize: 14 }}>
                Sending
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700 }}>
                {sendAmount} {selectedSymbol}
              </p>
              {fiatEstimate != null && selectedSymbol === "FDA" && (
                <p style={{ margin: 4, color: MM.textSecondary, fontSize: 15 }}>
                  ≈ US${fiatEstimate.toFixed(2)}
                </p>
              )}
            </div>
            <div
              style={{
                background: MM.pageBg,
                borderRadius: MM.radius,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: MM.textSecondary }}>From</div>
                  <div style={{ fontWeight: 700 }}>
                    {storedMeta?.label?.trim() && !/^new$/i.test(storedMeta.label.trim())
                      ? storedMeta.label
                      : "Your wallet"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: MM.textSecondary }}>To</div>
                  <div style={{ fontWeight: 700 }}>
                    {recipientFdaWallet &&
                    (recipientFdaWallet.fullName ||
                      recipientFdaWallet.email ||
                      recipientFdaWallet.walletLabel)
                      ? String(
                          recipientFdaWallet.fullName ||
                            recipientFdaWallet.email ||
                            recipientFdaWallet.walletLabel,
                        )
                      : shortAddr(sendTo)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: MM.textSecondary,
                      fontFamily: "ui-monospace, monospace",
                      marginTop: 4,
                    }}
                  >
                    {shortAddr(sendTo)}
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                background: MM.pageBg,
                borderRadius: MM.radius,
                padding: 14,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: MM.textSecondary }}>Network</span>
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "#F3BA2F",
                    display: "inline-block",
                  }}
                />
                BNB Chain
              </span>
            </div>
            {transferType === "onchain" && (
              <div
                style={{
                  background: MM.pageBg,
                  borderRadius: MM.radius,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MM.textSecondary }}>Network fee (est.)</span>
                  <span style={{ fontWeight: 600 }}>
                    {estimatingGas ? "…" : estimatedGas ? `~${estimatedGas} BNB` : "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <span style={{ color: MM.textSecondary }}>Speed</span>
                  <span style={{ fontWeight: 500 }}>Market</span>
                </div>
              </div>
            )}
            {transferType === "internal" && (
              <div
                style={{
                  background: "#ecfdf5",
                  borderRadius: MM.radius,
                  padding: 12,
                  fontSize: 13,
                  color: "#065f46",
                }}
              >
                Internal MC transfer — no gas, instant.
              </div>
            )}
            {assetType === "token" &&
              tokenAddress.toLowerCase() === FDA_TOKEN_ADDRESS.toLowerCase() &&
              sendTo &&
              ethers.isAddress(sendTo) &&
              !recipientFdaWallet &&
              auth && (
                <button
                  type="button"
                  onClick={() => registerRecipientWallet(sendTo.trim())}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: 12,
                    borderRadius: MM.radius,
                    border: `1px solid ${MM.border}`,
                    background: MM.surface,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Register recipient for internal transfers
                </button>
              )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setStep("amount")}
              style={{
                padding: 14,
                borderRadius: MM.radius,
                border: `1px solid ${MM.border}`,
                background: MM.surface,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                sending ||
                (transferType === "onchain" && !unlockedPrivateKeyRef.current) ||
                (transferType === "internal" && !auth)
              }
              onClick={async () => {
                setSending(true);
                try {
                  await handleSend();
                } finally {
                  setSending(false);
                }
              }}
              style={{
                padding: 14,
                borderRadius: MM.radius,
                border: "none",
                background: MM.text,
                color: "#fff",
                fontWeight: 700,
                cursor: sending ? "wait" : "pointer",
                opacity:
                  (transferType === "onchain" && !unlockedPrivateKeyRef.current) ||
                  (transferType === "internal" && !auth)
                    ? 0.5
                    : 1,
              }}
            >
              {sending ? "Sending…" : "Confirm"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
