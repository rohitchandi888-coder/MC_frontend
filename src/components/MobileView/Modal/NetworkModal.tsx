import React, { useEffect, useState } from "react";
import BNB from "/images/bnb.png";
import BTC from "/images/btc.png";
import ETH from "/images/eth.png";
import Tron from "/images/tron.png";
import type { AuthState } from "../../types";
import { MM } from "../../../theme/metaMaskShell";

interface NetworkModalProps {
  auth: AuthState | null;
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any[]> | undefined;
  loading: boolean;
  userTokens: any[];
  onAdded: () => void;
  indiAction: () => void;
}

const CHAIN_TAB_ICONS: Record<string, string> = {
  BNB,
  BTC,
  ETH,
  TRON: Tron,
};

function normalizeAddr(a: string | undefined): string {
  return (a || "").toLowerCase();
}

function networkChipStyle(active: boolean): React.CSSProperties {
  return {
    flex: "0 0 auto",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    background: active ? MM.accent : MM.surface,
    color: active ? "#fff" : MM.textSecondary,
    border: `1px solid ${active ? MM.accent : MM.borderLight}`,
  };
}


const NetworkModal: React.FC<NetworkModalProps> = ({
  auth,
  isOpen,
  onClose,
  data,
  loading,
  userTokens,
  onAdded,
  indiAction,
}) => {
  const [mainTab, setMainTab] = useState<"popular" | "custom">("popular");
  const [networkTab, setNetworkTab] = useState<"BNB" | "ETH" | "BTC" | "TRON">(
    "BNB",
  );
  const [customTokens, setCustomTokens] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<
    { address: string; symbol: string }[]
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTokens([]);
  }, [isOpen, networkTab, mainTab]);

  const isAlreadyAdded = (address: string) => {
    const a = normalizeAddr(address);
    return userTokens.some(
      (t) => normalizeAddr(t.address) === a && t.status === "ON",
    );
  };

  const toggleToken = (pair: any) => {
    const address = pair?.baseToken?.address;
    const symbol = pair?.baseToken?.symbol;
    if (!address) return;
    if (isAlreadyAdded(address)) return;

    const a = normalizeAddr(address);
    setSelectedTokens((prev) => {
      if (prev.some((t) => normalizeAddr(t.address) === a)) {
        return prev.filter((t) => normalizeAddr(t.address) !== a);
      }
      return [...prev, { address, symbol: symbol || "?" }];
    });
  };

  const handleAddTokens = async () => {
    if (!auth?.token) {
      alert("Please sign in to add tokens.");
      return;
    }
    if (!selectedTokens.length) {
      alert("Select at least one token");
      return;
    }

    if (
      !window.confirm(
        `Add ${selectedTokens.length} token(s) to your dashboard?`,
      )
    ) {
      return;
    }

    try {
      const results = await Promise.all(
        selectedTokens.map((token) =>
          fetch("https://merchantcoinwallet.com/api/customTokens", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              contract_address: token.address,
              token_symbol: token.symbol,
              status: "ON",
            }),
          }),
        ),
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        alert(`Some tokens failed to add (${failed.length}). Try again.`);
        return;
      }

      alert("Tokens added successfully");
      setSelectedTokens([]);
      onAdded();
      onClose();
    } catch {
      alert("Failed to add tokens");
    }
  };

  const fetchCustomTokens = async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(
        "https://merchantcoinwallet.com/api/customTokens",
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        },
      );

      const json = await res.json();

      if (json.success) {
        const filtered = (json.tokens || []).filter(
          (t: any) => !t.id?.startsWith("global"),
        );
        setCustomTokens(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch custom tokens", err);
    }
  };

  useEffect(() => {
    if (isOpen && mainTab === "custom") {
      fetchCustomTokens();
    }
  }, [isOpen, mainTab, auth?.token]);

  const getTokenIcon = (symbol: string) => {
    const sym = symbol?.toUpperCase() || "";
    if (sym.includes("BNB")) return BNB;
    if (sym.includes("ETH")) return ETH;
    if (sym.includes("BTC")) return BTC;
    if (sym.includes("TRX") || sym.includes("TRON")) return Tron;
    return BNB;
  };

  const pairs = data?.[networkTab] ?? [];

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={overlay} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        style={modal}
        role="dialog"
        aria-labelledby="network-modal-title"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3
            id="network-modal-title"
            style={{ color: MM.text, margin: 0, fontSize: 18, fontWeight: 700 }}
          >
            Select network & tokens
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: MM.pageBg,
              border: `1px solid ${MM.border}`,
              color: MM.text,
              width: 36,
              height: 36,
              borderRadius: 10,
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
            marginBottom: 12,
            background: MM.pageBg,
            borderRadius: 10,
            padding: 4,
            border: `1px solid ${MM.borderLight}`,
          }}
        >
          {(["popular", "custom"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 8px",
                cursor: "pointer",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                background: mainTab === tab ? MM.accent : "transparent",
                color: mainTab === tab ? "#fff" : MM.textSecondary,
              }}
            >
              {tab === "popular" ? "Popular" : "Custom"}
            </button>
          ))}
        </div>

        {mainTab === "popular" && (
          <>
            <div
              style={{
                display: "flex",
                marginBottom: 12,
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {(["BNB", "ETH", "BTC", "TRON"] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setNetworkTab(net)}
                  style={networkChipStyle(networkTab === net)}
                >
                  {net}
                </button>
              ))}
            </div>

            {loading ? (
              <p style={{ color: MM.textSecondary, textAlign: "center" }}>Loading…</p>
            ) : (
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {pairs.length === 0 ? (
                  <p style={{ color: MM.textSecondary, textAlign: "center" }}>
                    No pairs for this network. Try again later.
                  </p>
                ) : (
                  pairs.map((pair: any, rowIdx: number) => {
                    const addr = pair?.baseToken?.address || "";
                    const key = normalizeAddr(addr) || `pair-${rowIdx}`;
                    const price = parseFloat(pair.priceUsd || 0);
                    const change = Number(pair.priceChange?.h24 ?? 0);
                    const isNegative = change < 0;
                    const added = isAlreadyAdded(addr);
                    const rowSelected = selectedTokens.some(
                      (t) => normalizeAddr(t.address) === normalizeAddr(addr),
                    );
                    const logo =
                      pair.info?.imageUrl ||
                      pair.baseToken?.logoURI ||
                      CHAIN_TAB_ICONS[networkTab];

                    return (
                      <div key={key} style={row}>
                        <input
                          type="checkbox"
                          checked={added || rowSelected}
                          disabled={added}
                          onChange={() => toggleToken(pair)}
                          style={{ width: 20, height: 20, flexShrink: 0 }}
                        />

                        <img
                          data-wallet-icon
                          src={logo}
                          alt=""
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            objectFit: "cover",
                            background: "#fff",
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: MM.text,
                              fontWeight: 700,
                              fontSize: 15,
                            }}
                          >
                            {pair.baseToken?.symbol}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: MM.textSecondary,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`${pair.dexId} · ${pair.chainId}`}
                          >
                            {(pair.dexId || "DEX").replace(/-/g, " ")} ·{" "}
                            {pair.chainId}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ color: MM.text, fontWeight: 600 }}>
                            ${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: isNegative ? "#f87171" : "#4ade80",
                              fontWeight: 600,
                            }}
                          >
                            {change === 0
                              ? "—"
                              : `${isNegative ? "" : "+"}${change.toFixed(2)}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div style={{ paddingTop: 12, position: "sticky", bottom: 0, background: MM.surface, paddingBottom: 4 }}>
                  <button
                    type="button"
                    onClick={handleAddTokens}
                    disabled={!selectedTokens.length}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      fontWeight: 700,
                      padding: "14px",
                      borderRadius: 12,
                      border: "none",
                      cursor: selectedTokens.length ? "pointer" : "not-allowed",
                      background: selectedTokens.length ? MM.accent : MM.border,
                      color: "#fff",
                    }}
                  >
                    Add selected ({selectedTokens.length})
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mainTab === "custom" && (
          <>
            <div style={{ maxHeight: 445, overflowY: "auto" }}>
              {customTokens.map((token: any) => {
                const isActive = token.status === "ON";
                return (
                  <div key={token.address || token.id} style={row}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled
                      style={{ width: 20, height: 20, flexShrink: 0 }}
                    />
                    <img
                      data-wallet-icon
                      src={getTokenIcon(token.symbol)}
                      alt=""
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: MM.text, fontWeight: 600 }}>
                        {token.symbol || "UNKNOWN"}
                      </div>
                      <div style={{ fontSize: 12, color: MM.textSecondary }}>
                        {token.name || "Custom Token"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive ? "#4ade80" : "#f87171",
                      }}
                    >
                      {isActive ? "Active" : "Off"}
                    </div>
                  </div>
                );
              })}

              {customTokens.length === 0 && (
                <div
                  style={{
                    color: MM.textSecondary,
                    textAlign: "center",
                    marginTop: 24,
                    fontSize: 14,
                  }}
                >
                  No custom tokens yet. Use Popular or the + button on home.
                </div>
              )}
            </div>
            <div style={{ paddingTop: 12 }}>
              <button
                type="button"
                onClick={indiAction}
                style={{
                  width: "100%",
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: MM.accent,
                  color: "#fff",
                }}
              >
                Manage tokens
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkModal;

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 12000,
  padding: 16,
};

const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  maxHeight: "90vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
  border: "1px solid #e5e7eb",
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  marginBottom: 8,
  borderRadius: 12,
  background: "#f2f4f6",
  border: "1px solid #e5e7eb",
};
