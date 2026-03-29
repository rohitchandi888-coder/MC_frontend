import React, { useCallback, useEffect, useState } from "react";
import { MM } from "../../theme/metaMaskShell";

export type ExploreTab = "perps" | "predictions" | "defi";

type PerpExchange = {
  name: string;
  id: string;
  trade_volume_24h_btc?: string;
  open_interest_btc?: number;
  number_of_perpetual_pairs?: number;
  image: string;
  url: string;
};

type LlamaProtocol = {
  name: string;
  url: string;
  logo: string;
  category: string;
  tvl: number | null;
  chains: string[];
};

type PolyMarket = {
  id: string;
  question: string;
  slug: string;
  volumeNum: number;
  liquidityNum?: number;
  endDateIso?: string;
  icon?: string;
  outcomePrices?: string;
};

/** Same-origin proxy (see vite.config.mts). Direct calls to gamma-api.polymarket.com are blocked by CORS in the browser. */
const POLYMARKET_MARKETS_URL =
  "/polymarket-api/markets?active=true&closed=false&limit=40";

const POLYMARKET_FALLBACK: PolyMarket[] = [
  {
    id: "polymarket-fallback",
    question: "Open Polymarket — browse active prediction markets",
    slug: "polymarket-home",
    volumeNum: 0,
  },
];

function CardShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: MM.surface,
        borderRadius: MM.radius,
        border: `1px solid ${MM.borderLight}`,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function parseOutcomeYes(priceJson: string | undefined): string | null {
  if (!priceJson) return null;
  try {
    const arr = JSON.parse(priceJson) as string[];
    const n = parseFloat(arr[0]);
    if (Number.isFinite(n)) return `${(n * 100).toFixed(1)}¢ Yes`;
  } catch {
    /* ignore */
  }
  return null;
}

export const MobileExplorePanels: React.FC<{
  tab: ExploreTab;
  onOpenCharts?: () => void;
}> = ({ tab, onOpenCharts }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [perps, setPerps] = useState<PerpExchange[]>([]);
  const [protocols, setProtocols] = useState<LlamaProtocol[]>([]);
  const [markets, setMarkets] = useState<PolyMarket[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (tab === "perps") {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/derivatives/exchanges?per_page=15&page=1",
        );
        if (!res.ok) throw new Error("Perp venues unavailable");
        const data = (await res.json()) as PerpExchange[];
        setPerps(Array.isArray(data) ? data : []);
      } else if (tab === "defi") {
        const res = await fetch("https://api.llama.fi/protocols");
        if (!res.ok) throw new Error("DeFi data unavailable");
        const all = (await res.json()) as LlamaProtocol[];
        const noCex = (all || []).filter(
          (p) =>
            p &&
            p.category !== "CEX" &&
            p.category !== "Chain" &&
            typeof p.tvl === "number" &&
            p.tvl > 0,
        );
        noCex.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
        setProtocols(noCex.slice(0, 18));
      } else {
        try {
          const res = await fetch(POLYMARKET_MARKETS_URL);
          if (!res.ok) throw new Error("bad status");
          const raw = (await res.json()) as PolyMarket[];
          const list = Array.isArray(raw) ? [...raw] : [];
          list.sort(
            (a, b) => (b.volumeNum || 0) - (a.volumeNum || 0),
          );
          setMarkets(list.slice(0, 15));
        } catch {
          setMarkets(POLYMARKET_FALLBACK);
        }
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <CardShell style={{ padding: 28, textAlign: "center" }}>
        <p style={{ margin: 0, color: MM.textSecondary, fontSize: 14 }}>
          Loading…
        </p>
      </CardShell>
    );
  }

  if (err) {
    return (
      <CardShell style={{ padding: 20 }}>
        <p style={{ margin: 0, color: "#b91c1c", fontSize: 14 }}>{err}</p>
        <button
          type="button"
          onClick={load}
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: MM.radius,
            border: "none",
            background: MM.accent,
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Retry
        </button>
      </CardShell>
    );
  }

  if (tab === "perps") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 12,
            color: MM.textSecondary,
            lineHeight: 1.4,
          }}
        >
          Top perpetual futures venues by reported volume (CoinGecko). Tap a row
          to open the exchange.
        </p>
        {onOpenCharts && (
          <button
            type="button"
            onClick={onOpenCharts}
            style={{
              padding: "10px 14px",
              borderRadius: MM.radius,
              border: `1px solid ${MM.borderLight}`,
              background: MM.accentMuted,
              color: MM.accent,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 4,
            }}
          >
            Open price charts in app →
          </button>
        )}
        {perps.map((ex) => (
          <a
            key={ex.id}
            href={ex.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <CardShell
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <img
                data-wallet-icon
                src={ex.image}
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  objectFit: "cover",
                  background: MM.pageBg,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: MM.text,
                  }}
                >
                  {ex.name}
                </div>
                <div style={{ fontSize: 12, color: MM.textSecondary }}>
                  {ex.number_of_perpetual_pairs ?? "—"} perp pairs · Vol{" "}
                  {ex.trade_volume_24h_btc
                    ? `${Number(ex.trade_volume_24h_btc).toLocaleString()} BTC`
                    : "—"}
                </div>
              </div>
              <span style={{ color: MM.textMuted, fontSize: 18 }}>↗</span>
            </CardShell>
          </a>
        ))}
        {perps.length === 0 && (
          <p style={{ color: MM.textSecondary, fontSize: 14 }}>
            No data returned.
          </p>
        )}
      </div>
    );
  }

  if (tab === "defi") {
    const fmtTvl = (n: number | null) => {
      if (n == null || !Number.isFinite(n)) return "—";
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
      return `$${n.toFixed(0)}`;
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 12,
            color: MM.textSecondary,
            lineHeight: 1.4,
          }}
        >
          Largest non-custodial protocols by TVL (DefiLlama). Excludes centralized
          exchanges.
        </p>
        {protocols.map((p) => {
          const chains = p.chains || [];
          const inner = (
            <CardShell
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {p.logo ? (
                <img
                  data-wallet-icon
                  src={p.logo}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    objectFit: "cover",
                    background: MM.pageBg,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: MM.borderLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: MM.textSecondary,
                    fontSize: 14,
                  }}
                >
                  {p.name.slice(0, 1)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: MM.text,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: MM.textSecondary }}>
                  {p.category} · {chains.slice(0, 3).join(", ")}
                  {chains.length > 3 ? "…" : ""}
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  color: "#059669",
                  fontSize: 14,
                }}
              >
                {fmtTvl(p.tvl)}
              </div>
            </CardShell>
          );
          return p.url ? (
            <a
              key={p.name + p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {inner}
            </a>
          ) : (
            <div key={p.name}>{inner}</div>
          );
        })}
        {protocols.length === 0 && (
          <p style={{ color: MM.textSecondary, fontSize: 14 }}>
            No protocols loaded.
          </p>
        )}
      </div>
    );
  }

  /* predictions */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p
        style={{
          margin: "0 0 4px",
          fontSize: 12,
          color: MM.textSecondary,
          lineHeight: 1.4,
        }}
      >
        Active Polymarket questions sorted by volume. Opens polymarket.com in your
        browser.
      </p>
      {markets.map((m) => {
        const href =
          m.slug === "polymarket-home"
            ? "https://polymarket.com"
            : `https://polymarket.com/market/${m.slug}`;
        const hint = parseOutcomeYes(m.outcomePrices);
        return (
          <a
            key={m.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <CardShell style={{ padding: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {m.icon && (
                  <img
                    data-wallet-icon
                    src={m.icon}
                    alt=""
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: MM.text,
                      lineHeight: 1.35,
                    }}
                  >
                    {m.question}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: MM.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    Vol ${(m.volumeNum || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    {hint && ` · ${hint}`}
                    {m.endDateIso && ` · Ends ${m.endDateIso}`}
                  </div>
                </div>
              </div>
            </CardShell>
          </a>
        );
      })}
      {markets.length === 0 && (
        <p style={{ color: MM.textSecondary, fontSize: 14 }}>
          No open markets returned.
        </p>
      )}
    </div>
  );
};
