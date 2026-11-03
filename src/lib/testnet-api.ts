import "server-only";
import type { TestnetActivity, TestnetStats } from "./types";

/**
 * ============================================================================
 *  ROBINHOOD CHAIN TESTNET ACTIVITY — https://testnet.vibevibe.fun/
 * ============================================================================
 *  REAL DATA. Uses the public read-only indexer API that the vibe/vibe testnet
 *  app itself calls (chain id 46630 = Robinhood Chain Testnet):
 *
 *    GET /api/v1/chains/46630/wallets/:address/performance      → volume, buy/sell counts, win rate (7D/30D/90D/ALL)
 *    GET /api/v1/chains/46630/analytics/portfolios/:address     → PnL, equity, tokens traded, open positions
 *    GET /api/v1/chains/46630/wallets/:address/activity?limit=N → latest trades with tx hashes
 *
 *  ⚠️ The data is keyed by WALLET ADDRESS. There is no public X-handle → wallet
 *  lookup, so the user types their 0x… address next to their X username.
 *  If vibe/vibe later exposes the X ↔ wallet link (their app has X sign-in),
 *  resolve the wallet from the username here and drop the extra input.
 *
 *  This is an undocumented API: shapes may change. Every field is read
 *  defensively and any failure degrades to status "unavailable" instead of
 *  breaking the whole report.
 * ============================================================================
 */

const BASE = process.env.TESTNET_API_URL ?? "https://testnet.vibevibe.fun/api/v1/chains/46630";
export const TESTNET_EXPLORER = "https://explorer.testnet.chain.robinhood.com";
export const TESTNET_APP = "https://testnet.vibevibe.fun";

export const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

const EMPTY: Omit<TestnetStats, "status" | "wallet"> = {
  buyCount: 0,
  sellCount: 0,
  volumeEth: 0,
  volume30dEth: 0,
  winRate: null,
  realizedPnlEth: null,
  unrealizedPnlEth: null,
  pnlEth: null,
  equityEth: null,
  tokensTraded: null,
  openPositions: null,
  portfolioAvailable: false,
  lastActivity: null,
  recentActivity: [],
  asOfBlock: null,
};

/** Wei string → ETH number (display precision is plenty). */
const eth = (wei: unknown) => {
  if (typeof wei !== "string" && typeof wei !== "number") return 0;
  const n = Number(wei);
  return Number.isFinite(n) ? n / 1e18 : 0;
};
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

interface Envelope<T> {
  data?: T;
  meta?: { freshness?: { asOfBlock?: string } };
  error?: { code?: string; message?: string };
}

async function get<T>(path: string): Promise<Envelope<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`testnet API ${res.status} on ${path}`);
  return res.json() as Promise<Envelope<T>>;
}

interface PerfWindow {
  window: string;
  buyVolumeWei: string;
  sellVolumeWei: string;
  buyCount: number;
  sellCount: number;
  scoredCloses: number;
  winningCloses: number;
}

interface Performance {
  windows?: { items?: PerfWindow[] };
}

interface Portfolio {
  summary?: {
    realizedPnlWei?: string;
    unrealizedPnlWei?: string;
    pnlWei?: string;
    equityWei?: string;
    tokensTraded?: number;
    openPositions?: number;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  side?: string;
  tokenAddress: string;
  txHash: string;
  occurredAt: string;
  amountInBaseUnits?: string | null;
  amountOutBaseUnits?: string | null;
  quoteAmountInBaseUnits?: string | null;
  quoteAmountOutBaseUnits?: string | null;
}

export async function getTestnetStats(wallet: string | null): Promise<TestnetStats> {
  if (!wallet) return { status: "no-wallet", wallet: null, ...EMPTY };
  const address = wallet.toLowerCase();
  const enc = encodeURIComponent(address);

  const [perfRes, portRes, actRes] = await Promise.allSettled([
    get<Performance>(`/wallets/${enc}/performance`),
    get<Portfolio>(`/analytics/portfolios/${enc}`),
    get<{ items?: ActivityItem[] }>(`/wallets/${enc}/activity?limit=6`),
  ]);

  // /performance and /portfolios are both scoring inputs (trades, volume, 30d activity, tokens traded).
  // If either is missing the score would be confidently wrong, so report "unavailable" instead of zeros.
  // /activity is display-only and may fail on its own.
  if (perfRes.status === "rejected" || portRes.status === "rejected") {
    console.error("[testnet-api]", perfRes.status === "rejected" ? perfRes.reason : portRes.status === "rejected" ? portRes.reason : "");
    return { status: "unavailable", wallet: address, ...EMPTY, error: "Testnet indexer is not responding." };
  }

  const windows = perfRes.value.data?.windows?.items ?? [];
  const all = windows.find((w) => w.window === "ALL");
  const d30 = windows.find((w) => w.window === "30D");
  // The accounting projection can be incomplete for a wallet (freshness PARTIAL): it then returns
  // summary: null. Zeros would be a lie — remember that the figures are unknown.
  const summary = portRes.value.data?.summary ?? null;
  const portfolioAvailable = summary !== null;
  const items = actRes.status === "fulfilled" ? (actRes.value.data?.items ?? []) : [];

  const recentActivity: TestnetActivity[] = items.map((a) => {
    const side = (a.side ?? a.type ?? "").toUpperCase();
    // Native-ETH pairs: BUY pays ETH in, SELL receives ETH out. Quote-token pairs fill the quote* fields.
    const ethWei =
      side === "BUY"
        ? (a.quoteAmountInBaseUnits ?? a.amountInBaseUnits)
        : side === "SELL"
          ? (a.quoteAmountOutBaseUnits ?? a.amountOutBaseUnits)
          : null;
    return {
      id: a.id,
      type: side || "TX",
      tokenAddress: a.tokenAddress,
      txHash: a.txHash,
      occurredAt: a.occurredAt,
      amountEth: ethWei ? eth(ethWei) : null,
    };
  });

  const stats: TestnetStats = {
    status: "ok",
    wallet: address,
    buyCount: num(all?.buyCount),
    sellCount: num(all?.sellCount),
    volumeEth: eth(all?.buyVolumeWei) + eth(all?.sellVolumeWei),
    volume30dEth: eth(d30?.buyVolumeWei) + eth(d30?.sellVolumeWei),
    winRate: all && all.scoredCloses > 0 ? all.winningCloses / all.scoredCloses : null,
    realizedPnlEth: summary ? eth(summary.realizedPnlWei) : null,
    unrealizedPnlEth: summary ? eth(summary.unrealizedPnlWei) : null,
    pnlEth: summary ? eth(summary.pnlWei) : null,
    equityEth: summary ? eth(summary.equityWei) : null,
    tokensTraded: summary ? num(summary.tokensTraded) : null,
    openPositions: summary ? num(summary.openPositions) : null,
    portfolioAvailable,
    lastActivity: recentActivity[0]?.occurredAt ?? null,
    recentActivity,
    asOfBlock: perfRes.value.meta?.freshness?.asOfBlock || portRes.value.meta?.freshness?.asOfBlock || null,
  };

  // Both scoring sources loaded and show no activity → genuinely empty wallet.
  if (
    stats.buyCount + stats.sellCount === 0 &&
    recentActivity.length === 0 &&
    (stats.tokensTraded ?? 0) === 0
  ) {
    stats.status = "empty";
  }
  return stats;
}
