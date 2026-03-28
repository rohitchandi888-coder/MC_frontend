import React, { useEffect, useState } from "react";
import BNB from "/images/bnb.png";
import BTC from "/images/btc.png";
import ETH from "/images/eth.png";
import Tron from "/images/tron.png";
import { AuthState } from "../../types";

interface NetworkModalProps {
  auth: AuthState;
  isOpen: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
  userTokens: any[];
  onAdded: () => void;
  indiAction : () => void;
}

const ICONS: any = {
  BNB: BNB,
  BTC: BTC,
  ETH: ETH,
  TRON: Tron,
};

const NetworkModal: React.FC<NetworkModalProps> = ({
  auth,
  isOpen,
  onClose,
  data,
  loading,
  userTokens,
  onAdded,
  indiAction
}) => {
  const [mainTab, setMainTab] = useState<"popular" | "custom">("popular");
  const [networkTab, setNetworkTab] = useState<"BNB" | "BTC" | "ETH" | "TRON">(
    "BNB",
  );
  const [customTokens, setCustomTokens] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<any[]>([]);

  const isAlreadyAdded = (address: string) => {
    return userTokens.some(
      (t) =>
        t.address?.toLowerCase() === address?.toLowerCase() &&
        t.status === "ON",
    );
  };
  const toggleToken = (pair: any) => {
    const address = pair?.baseToken?.address;
    const symbol = pair?.baseToken?.symbol;

    if (!address) return;

    setSelectedTokens((prev) => {
      if (prev.find((t) => t.address === address)) {
        return prev.filter((t) => t.address !== address);
      }
      return [...prev, { address, symbol }];
    });
  };

  const handleAddTokens = async () => {
    if (!selectedTokens.length) {
      alert("Select at least one token");
      return;
    }

    const confirm = window.confirm(
      `Add ${selectedTokens.length} token(s) to dashboard?`,
    );

    if (!confirm) return;

    try {
      await Promise.all(
        selectedTokens.map((token) =>
          fetch("https://merchantcoinwallet.com/api/customTokens", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth?.token}`,
            },
            body: JSON.stringify({
              contract_address: token.address,
              token_symbol: token.symbol,
              status: "ON",
            }),
          }),
        ),
      );

      alert("✅ Tokens added successfully");

      setSelectedTokens([]);
      onAdded();
      onClose();
    } catch (err) {
      alert("❌ Failed to add tokens");
    }
  };

  const fetchCustomTokens = async () => {
    try {
      const res = await fetch(
        "https://merchantcoinwallet.com/api/customTokens",
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        const filtered = data.tokens.filter(
          (t: any) => !t.id?.startsWith("global")
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
  }, [isOpen, mainTab]);

  const getTokenIcon = (symbol: string) => {
    const sym = symbol?.toUpperCase();

    if (sym.includes("BNB")) return ICONS["BNB"];
    if (sym.includes("ETH")) return ICONS["ETH"];
    if (sym.includes("BTC")) return ICONS["BTC"];
    if (sym.includes("TRX") || sym.includes("TRON")) return ICONS["TRON"];

    return ICONS["BNB"]; // fallback
  };
  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <h3 style={{ color: "#fff", marginBottom: 10 }}>Select Network</h3>

        {/* MAIN TABS */}
        <div style={{ display: "flex", marginBottom: 10 }}>
          {["popular", "custom"].map((tab) => (
            <div
              key={tab}
              onClick={() => setMainTab(tab as any)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: 10,
                cursor: "pointer",
                color: mainTab === tab ? "#fff" : "#64748b",
                borderBottom: mainTab === tab ? "2px solid #22c55e" : "none",
              }}
            >
              {tab.toUpperCase()}
            </div>
          ))}
        </div>

        {mainTab === "popular" && (
          <>
            {/* NETWORK TABS */}
            <div style={{ display: "flex", marginBottom: 10 }}>
              {["BNB", "BTC", "ETH", "TRON"].map((net) => (
                <div
                  key={net}
                  onClick={() => setNetworkTab(net as any)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    color: networkTab === net ? "#fff" : "#64748b",
                    borderBottom:
                      networkTab === net ? "2px solid #22c55e" : "none",
                  }}
                >
                  {net}
                </div>
              ))}
            </div>

            {/* TOKENS */}
            {loading ? (
              <p style={{ color: "#fff" }}>Loading...</p>
            ) : (
              <>
                <div style={{ maxHeight: 445, overflowY: "auto" }}>
                  {data?.[networkTab]
                    ?.slice(0, 20)
                    .map((pair: any, i: number) => {
                      const price = parseFloat(pair.priceUsd || 0);
                      const change = pair.priceChange?.h24 || 0;
                      const isNegative = change < 0;

                      return (
                        <div>
                          <div key={i} style={row}>
                            <div>
                              <input
                                type="checkbox"
                                checked={
                                  isAlreadyAdded(
                                    pair?.baseToken?.address || "",
                                  ) ||
                                  selectedTokens.some(
                                    (t) =>
                                      t.address === pair?.baseToken?.address,
                                  )
                                }
                                disabled={isAlreadyAdded(
                                  pair?.baseToken?.address || "",
                                )}
                                onChange={() => toggleToken(pair)}
                                style={{ width: 20, height: 20 }}
                              />
                            </div>
                            <div
                              style={{
                                width: 70,
                                display: "flex",
                                position: "relative",
                              }}
                            >
                              <div style={{}}>
                                <img
                                  src={ICONS[networkTab]}
                                  alt=""
                                  style={{
                                    width: 30,
                                    height: 30,
                                    objectFit: "contain",
                                    position: "absolute",
                                    top: 25,
                                    right: 0,
                                    zIndex: 9999,
                                  }}
                                />
                              </div>
                              <div>
                                <img
                                  src={ICONS[networkTab]}
                                  style={{
                                    width: "100%",
                                    objectFit: "contain",
                                    position: "relative",
                                    zIndex: 1,
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ color: "#fff", fontWeight: 500 }}>
                                {pair.baseToken?.symbol}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                {pair.dexId}
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: "#fff" }}>
                                ${price.toFixed(2)}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isNegative ? "#ef4444" : "#22c55e",
                                }}
                              >
                                {isNegative ? "" : "+"}
                                {change.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  <div
                    style={{
                      paddingBlock: 10,
                      width: "100%",
                      position: "sticky",
                      bottom: 0,
                      zIndex: 9999,
                    }}
                  >
                    <button
                      onClick={handleAddTokens}
                      style={{ width: "100%", fontSize: 18, fontWeight: 700 }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mainTab === "custom" && (
          <>
            <div style={{ maxHeight: 445, overflowY: "auto" }}>
              {customTokens.map((token: any, i: number) => {
                const isActive = token.status === "ON";

                return (
                  <>
                    <div key={i} style={row}>
                      {/* CHECKBOX */}
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled
                        style={{ width: 20, height: 20 }}
                      />

                      {/* DYNAMIC ICON */}
                      <img
                        src={getTokenIcon(token.symbol)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          objectFit: "contain",
                        }}
                      />

                      {/* TOKEN INFO */}
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 500 }}>
                          {token.symbol || "UNKNOWN"}
                        </div>

                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {token.name || "Custom Token"}
                        </div>
                      </div>

                      {/* STATUS */}
                      <div
                        style={{
                          fontSize: 12,
                          color: isActive ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {isActive ? "Active" : "Disabled"}
                      </div>
                    </div>

                  </>
                );

              })}

              {/* EMPTY */}
              {customTokens.length === 0 && (
                <div
                  style={{
                    color: "#64748b",
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No custom tokens added
                </div>
              )}
            </div>
            <div
              style={{
                paddingBlock: 10,
                width: "100%",
                position: "sticky",
                bottom: 0,
                zIndex: 9999,
              }}
            >
              <button
                onClick={indiAction}
                style={{ width: "100%", fontSize: 18, fontWeight: 700 }}
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkModal;

/* styles */
const overlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const modal = {
  width: "90%",
  maxWidth: 400,
  background: "#1e293b",
  borderRadius: 10,
  padding: 15,
  height: 600,
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  marginTop: 6,
  borderRadius: 8,
  background: "#020617",
};

const icon = {
  width: "100%",
  //   height: 28,
  objectFit: "contain",
};
