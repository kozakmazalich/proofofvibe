import type { TestnetStats, VibeScores, XStats } from "./types";

/**
 * SCORES — each on a 0..100 scale.
 *
 *  X Score (0–100)
 *    posts about vibe/vibe   up to 40   (150 posts = full)
 *    views                   up to 30   (1M views = full)
 *    engagement rate         up to 20   (5% ER = full)
 *    recency                 up to 10   (last mention ≤7d = 10, ≤30d = 5)
 *
 *  Testnet Score (0–100, null when no wallet was entered)
 *    trades                  up to 40   (200 trades = full)
 *    volume                  up to 35   (5 ETH = full)
 *    tokens traded           up to 15   (30 tokens = full)
 *    active in last 30 days  10
 *
 * Log scales so a little activity already counts and whales don't max everything.
 * Tweak the caps above to rebalance.
 */

/** log-scaled 0..max, reaching max at `full`. */
const logPart = (value: number, full: number, max: number) =>
  value <= 0 ? 0 : Math.min(max, (max * Math.log10(1 + value)) / Math.log10(1 + full));

const DAY = 86_400_000;
const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeXScore(x: XStats): number {
  const interactions = x.totals.likes + x.totals.replies + x.totals.retweets + x.totals.quotes;
  const er = x.totals.views > 0 ? interactions / x.totals.views : 0;
  const sinceLast = x.lastMention ? Date.now() - new Date(x.lastMention).getTime() : Infinity;
  return clamp100(
    logPart(x.postCount, 150, 40) +
      logPart(x.totals.views, 1_000_000, 30) +
      Math.min(20, (er / 0.05) * 20) +
      (sinceLast <= 7 * DAY ? 10 : sinceLast <= 30 * DAY ? 5 : 0),
  );
}

export function computeTestnetScore(t: TestnetStats): number | null {
  if (t.status === "no-wallet" || t.status === "unavailable") return null;
  if (t.status === "empty") return 0;
  return clamp100(
    logPart(t.buyCount + t.sellCount, 200, 40) +
      logPart(t.volumeEth * 100, 500, 35) + // 5 ETH volume = full
      logPart(t.tokensTraded, 30, 15) +
      (t.volume30dEth > 0 ? 10 : 0),
  );
}

export function computeScores(x: XStats, testnet: TestnetStats): VibeScores {
  return { x: computeXScore(x), testnet: computeTestnetScore(testnet) };
}
