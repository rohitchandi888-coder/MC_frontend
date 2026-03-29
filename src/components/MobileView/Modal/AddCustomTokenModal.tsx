import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { fetchPopularPairsForTab } from "../../../utils/dexPopularTokens";
import { MM } from "../../../theme/metaMaskShell";
import { getApiUrl } from "../../../config";
import { DEFAULT_RPC_URL } from "../../types";

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

const READ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const SYMBOL_BYTES32_ABI = [
  "function symbol() view returns (bytes32)",
];

function BscChainIcon() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "#F3BA2F",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 13,
        color: "#0f172a",
        flexShrink: 0,
      }}
    >
      B
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
}

const AddCustomTokenModal: React.FC<AddCustomTokenModalProps> = ({
  isOpen,
  onClose,
  auth,
  userTokens,
  onAdded,
}) => {
  const [mainTab, setMainTab] = useState<TabKey>("search");
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

  const provider = useMemo(
    () => new ethers.JsonRpcProvider(DEFAULT_RPC_URL),
    [],
  );

  const norm = (a: string) => (a || "").toLowerCase();

  const isAlreadyAdded = (addr: string) =>
    userTokens.some(
      (t) => norm(t.address) === norm(addr) && t.status === "ON",
    );

  const fetchBscTokens = async () => {
    try {
      setLoading(true);
      const pairs = await fetchPopularPairsForTab("BNB");
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

      setTokens(deduped.length > 0 ? deduped : BNB_TOKEN_LIST_FALLBACK);
    } catch (err) {
      console.error(err);
      setTokens(BNB_TOKEN_LIST_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

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
    void fetchBscTokens();
  }, [isOpen]);

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
    let addr = raw;
    if (!addr.startsWith("0x")) {
      addr = `0x${addr}`;
    }
    if (!ethers.isAddress(addr)) {
      setCustomError("Enter a valid BSC contract address");
      return;
    }
    const checksummed = ethers.getAddress(addr);
    const alreadyIn = userTokens.some(
      (t) => norm(t.address) === norm(checksummed) && t.status === "ON",
    );
    if (alreadyIn) {
      setCustomError("This token is already in your wallet");
      return;
    }
    setMetaLoading(true);
    try {
      const code = await provider.getCode(checksummed);
      if (!code || code === "0x") {
        setCustomError("No contract at this address on BNB Chain");
        setCustomSymbol("");
        setCustomName("");
        setCustomDecimals("");
        return;
      }
      const meta = await fetchErc20Meta(checksummed, provider);
      setCustomAddress(checksummed);
      setCustomSymbol(meta.symbol);
      setCustomName(meta.name);
      setCustomDecimals(String(meta.decimals));
    } catch (e) {
      console.error(e);
      setCustomError(
        "Could not read token. Check the address is an ERC-20 on BNB Chain.",
      );
      setCustomSymbol("");
      setCustomName("");
      setCustomDecimals("");
    } finally {
      setMetaLoading(false);
    }
  }, [customAddress, provider, userTokens]);

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
    const addr = customAddress.trim();
    if (!addr || !ethers.isAddress(addr)) {
      setCustomError("Enter a valid contract address");
      return;
    }
    const checksummed = ethers.getAddress(addr);
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
        {/* Network first (matches “network on top” expectation) */}
        <div
          style={{
            padding: "16px 16px 12px",
            flexShrink: 0,
            borderBottom: `1px solid ${MM.borderLight}`,
            background: MM.pageBg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: MM.radius,
              border: `1px solid ${MM.border}`,
              background: MM.surface,
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            <BscChainIcon />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: MM.text,
                  letterSpacing: "-0.02em",
                }}
              >
                BNB Chain
              </div>
              <div style={{ fontSize: 12, color: MM.textSecondary, marginTop: 4 }}>
                BNB Smart Chain · Search & custom import use this network
              </div>
            </div>
            <span
              style={{
                color: MM.textSecondary,
                fontSize: 18,
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-hidden
            >
              ▾
            </span>
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
                Popular BNB Chain tokens from DEX pairs. Already-enabled tokens
                show &quot;In wallet&quot;. Only new selections are added.
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
                    href="https://bscscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", fontWeight: 600 }}
                  >
                    BscScan
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
                placeholder="0x…"
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
