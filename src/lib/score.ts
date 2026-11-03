import type { TestnetStats, VibeScores, XScoreParts, XStats } from "./types";

/**
 * ============================================================================
 *  SCORES — each 0..100
 * ============================================================================
 *
 *  X SCORE — how much a person has put into the vibe/vibe conversation. Four parts that add up to 100.
 *  Everything is measured on the person's posts that mention vibe/vibe (@vibevibefun, @vibevibeeco,
 *  "vibevibe", "vibe/vibe") in the sample we fetch (the latest ~80 matching posts).
 *
 *  Each part uses a SQUARE-ROOT curve:  part = max × min(1, √(value / target))
 *  → the first posts / views count a lot, and it reaches the full mark exactly at the target.
 *  Targets are set at the level of core community members (calibrated on real accounts: an active ambassador
 *  with ~70 posts / ~220K views / ~6K interactions, and the official account, both land on 100).
 *
 *    Part         max   what it measures                       full marks at
 *    Activity      20   posts (10) + active days (7) + recency (3)   25 posts · 14 active days · posted ≤3 days ago
 *    Reach         35   total views of those posts               200 000 views
 *    Engagement    35   likes + replies + reposts + quotes       3 000 interactions
 *    Resonance     10   interactions ÷ views (how well it lands)  1 % (counts fully only with ≥ 5 000 views)
 *
 *  Why not engagement RATE as the main metric: a big account always has a low rate (1–3 %) but huge absolute
 *  engagement, so a rate-based score punishes exactly the people who do the most. Absolute reach + engagement
 *  carry the score; the rate is only a small quality bonus, and is ignored while there is too little data.
 *
 *  TESTNET SCORE — Robinhood testnet activity (only with a wallet): trades 40 · volume 35 · tokens traded 15 ·
 *  active in the last 30 days 10.
 * ============================================================================
 */

/** Tunables — change these to rebalance. */
export const X_SCORE_RULES = [
  { key: "activity", label: "Activity", max: 20, how: "posts · active days · recency", target: "25 posts · 14 active days · posted within 3 days" },
  { key: "reach", label: "Reach", max: 35, how: "total views", target: "200K views" },
  { key: "engagement", label: "Engagement", max: 35, how: "likes + replies + reposts + quotes", target: "3K interactions" },
  { key: "resonance", label: "Resonance", max: 10, how: "interactions ÷ views", target: "1% (needs 5K+ views to count fully)" },
] as const;

const T = {
  posts: 25,
  activeDays: 14,
  views: 200_000,
  interactions: 3_000,
  engagementRate: 0.01,
  minViewsForRate: 5_000,
};

const DAY = 86_400_000;

/** √ curve: 0 → 0, target → 1, never above 1. */
const curve = (value: number, target: number) => (value <= 0 ? 0 : Math.min(1, Math.sqrt(value / target)));

/** Distinct UTC days with at least one post, from whatever post dates we have. */
function activeDaysOf(x: XStats): number {
  if (typeof x.activeDays === "number") return x.activeDays;
  return new Set(x.recentPosts.map((p) => p.createdAt.slice(0, 10))).size;
}

export function computeXScoreParts(x: XStats): XScoreParts {
  const views = x.totals.views;
  const interactions = x.totals.likes + x.totals.replies + x.totals.retweets + x.totals.quotes;

  // Activity (20) = posts 10 + active days 7 + recency 3
  const daysSince = x.lastMention ? (Date.now() - new Date(x.lastMention).getTime()) / DAY : Infinity;
  const recency = daysSince <= 3 ? 1 : daysSince <= 7 ? 0.8 : daysSince <= 14 ? 0.5 : daysSince <= 30 ? 0.2 : 0;
  const activity = 10 * curve(x.postCount, T.posts) + 7 * curve(activeDaysOf(x), T.activeDays) + 3 * recency;

  const reach = 35 * curve(views, T.views);
  const engagement = 35 * curve(interactions, T.interactions);

  // Resonance (10): quality bonus, discounted while the sample is too small to trust the rate
  const rate = views > 0 ? interactions / views : 0;
  const reliability = Math.min(1, views / T.minViewsForRate);
  const resonance = 10 * Math.min(1, rate / T.engagementRate) * reliability;

  return { activity, reach, engagement, resonance };
}

export function computeXScore(x: XStats): { total: number; parts: XScoreParts } {
  const raw = computeXScoreParts(x);
  const total = Math.max(0, Math.min(100, Math.round(raw.activity + raw.reach + raw.engagement + raw.resonance)));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    total,
    parts: { activity: r1(raw.activity), reach: r1(raw.reach), engagement: r1(raw.engagement), resonance: r1(raw.resonance) },
  };
}

/** log-scaled 0..max, reaching max at `full` (used by the testnet score). */
const logPart = (value: number, full: number, max: number) =>
  value <= 0 ? 0 : Math.min(max, (max * Math.log10(1 + value)) / Math.log10(1 + full));

export function computeTestnetScore(t: TestnetStats): number | null {
  if (t.status === "no-wallet" || t.status === "unavailable") return null;
  if (t.status === "empty") return 0;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        logPart(t.buyCount + t.sellCount, 200, 40) +
          logPart(t.volumeEth * 100, 500, 35) + // 5 ETH volume = full
          logPart(t.tokensTraded, 30, 15) +
          (t.volume30dEth > 0 ? 10 : 0),
      ),
    ),
  );
}

export function computeScores(x: XStats, testnet: TestnetStats): VibeScores {
  const xs = computeXScore(x);
  return { x: xs.total, xParts: xs.parts, testnet: computeTestnetScore(testnet) };
}
