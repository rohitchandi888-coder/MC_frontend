/**
 * Curated popular token addresses per UI network tab + expected DexScreener chainId.
 * Replaces /dex/search?q=… which returns cross-chain junk (e.g. Solana Raydium under "BNB").
 *
 * Docs: https://api.dexscreener.com/latest/dex/tokens/{addresses} (comma-separated, max 30)
 */

export type NetworkTabKey = "BNB" | "ETH" | "BTC" | "TRON";

type ChainConfig = {
  /** DexScreener `pair.chainId` */
  chainId: string;
  /** Token contract addresses on that chain */
  addresses: string[];
};

export const POPULAR_BY_NETWORK: Record<NetworkTabKey, ChainConfig> = {
  BNB: {
    chainId: "bsc",
    addresses: [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
      "0x55d398326f99059fF775485246999027B3197955", // USDT
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // ETH (BSC)
      "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
    ],
  },
  ETH: {
    chainId: "ethereum",
    addresses: [
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
    ],
  },
  BTC: {
    chainId: "ethereum",
    addresses: [
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    ],
  },
  TRON: {
    chainId: "tron",
    addresses: [
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT TRC20
    ],
  },
};

/** Keep one best-liquidity pair per base token on the expected chain */
export function pickBestPairsPerToken(
  pairs: any[],
  chainId: string,
): any[] {
  const want = String(chainId || "").toLowerCase();
  const filtered = (pairs || []).filter(
    (p) => String(p?.chainId || "").toLowerCase() === want,
  );
  const byBase = new Map<string, any>();

  for (const p of filtered) {
    const addr = p.baseToken?.address;
    if (!addr) continue;
    const key = addr.toLowerCase();
    const liq = p.liquidity?.usd ?? 0;
    const prev = byBase.get(key);
    if (!prev || (prev.liquidity?.usd ?? 0) < liq) {
      byBase.set(key, p);
    }
  }

  return Array.from(byBase.values()).sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  );
}

export async function fetchPopularPairsForTab(
  tab: NetworkTabKey,
): Promise<any[]> {
  const cfg = POPULAR_BY_NETWORK[tab];
  if (!cfg.addresses.length) return [];

  const url = `https://api.dexscreener.com/latest/dex/tokens/${cfg.addresses.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return pickBestPairsPerToken(data.pairs || [], cfg.chainId);
}

/** Load all four tabs (parallel) for modals / mobile dashboard */
export async function fetchAllPopularNetworkPairs(): Promise<
  Record<NetworkTabKey, any[]>
> {
  const keys: NetworkTabKey[] = ["BNB", "ETH", "BTC", "TRON"];
  const lists = await Promise.all(keys.map((k) => fetchPopularPairsForTab(k)));
  return {
    BNB: lists[0],
    ETH: lists[1],
    BTC: lists[2],
    TRON: lists[3],
  };
}
