import type { PostMetrics, VibePost, XStats } from "./types";

/**
 * MOCK DATA
 * ---------------------------------------------------------------------------
 * Deterministic fake data: the same username always produces the same report,
 * so the UI looks alive and stable while no real API is connected.
 * Delete / bypass this once the real Twitter API v2 + leaderboard are wired
 * (see src/lib/x-api.ts and src/lib/game-api.ts).
 */

/** Small seeded PRNG (mulberry32) so numbers are stable per username. */
function seeded(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POST_TEMPLATES = [
  "gm vibers ☀️ another day another vibe check with @vibevibefun — the energy here is unmatched ⚡",
  "Just climbed the Battlegrounds leaderboard on @vibevibefun. Who's next? 🏆 bg.vibevibe.fun",
  "The @vibevibeeco ecosystem is quietly shipping while everyone else is tweeting roadmaps. vibe/vibe 🟢",
  "If you're not vibing with vibevibe yet, you're early. Still. ngmi otherwise 😤",
  "Proof of Vibe > Proof of Work. Change my mind. @vibevibefun",
  "Spent all weekend in Vibe Vibers Battlegrounds. My sleep schedule is gone, my rank is not 🔋",
  "Thread 🧵 on why @vibevibeeco is the most underrated community in the space right now 👇",
  "vibe/vibe community call was 🔥 — big things loading. stay charged ⚡",
  "Lime green is a lifestyle. @vibevibefun #vibevibe",
  "Every vibe counts. Every viber matters. Let's run it up 📈 @vibevibeeco",
];

const DISPLAY_SUFFIXES = ["⚡", "🟢", ".vibe", " | viber", " 🔋", ""];

function metricsFor(rand: () => number, weight: number): PostMetrics {
  const views = Math.round((800 + rand() * 24000) * weight);
  const likes = Math.round(views * (0.02 + rand() * 0.06));
  return {
    views,
    likes,
    replies: Math.round(likes * (0.05 + rand() * 0.2)),
    retweets: Math.round(likes * (0.08 + rand() * 0.25)),
    quotes: Math.round(likes * (0.01 + rand() * 0.05)),
  };
}

export function mockXStats(username: string): XStats {
  const rand = seeded(username.toLowerCase());
  const postCount = 12 + Math.floor(rand() * 180);
  const weight = 0.6 + rand() * 2.2; // "influence" of the account

  const now = Date.now();
  const DAY = 86_400_000;
  const firstMention = now - (60 + Math.floor(rand() * 420)) * DAY;
  const lastMention = now - Math.floor(rand() * 3) * DAY - Math.floor(rand() * 20) * 3_600_000;

  // 7 recent posts, newest first, spread between lastMention and ~45 days back.
  const recentCount = 7;
  const recentPosts: VibePost[] = [];
  let cursor = lastMention;
  const used = new Set<number>();
  for (let i = 0; i < recentCount; i++) {
    let idx = Math.floor(rand() * POST_TEMPLATES.length);
    while (used.has(idx)) idx = (idx + 1) % POST_TEMPLATES.length;
    used.add(idx);
    const id = `18${String(Math.floor(rand() * 1e9)).padStart(9, "0")}${String(Math.floor(rand() * 1e8)).padStart(8, "0")}`;
    recentPosts.push({
      id,
      text: POST_TEMPLATES[idx],
      url: `https://x.com/${username}/status/${id}`,
      createdAt: new Date(cursor).toISOString(),
      metrics: metricsFor(rand, weight),
    });
    cursor -= Math.floor((0.5 + rand() * 6) * DAY);
  }

  // Totals: the recent posts + an estimate for the older posts.
  const totals = recentPosts.reduce<PostMetrics>(
    (acc, p) => ({
      likes: acc.likes + p.metrics.likes,
      views: acc.views + p.metrics.views,
      replies: acc.replies + p.metrics.replies,
      retweets: acc.retweets + p.metrics.retweets,
      quotes: acc.quotes + p.metrics.quotes,
    }),
    { likes: 0, views: 0, replies: 0, retweets: 0, quotes: 0 },
  );
  const older = metricsFor(rand, weight * Math.max(1, postCount - recentCount) * 0.7);
  (Object.keys(totals) as (keyof PostMetrics)[]).forEach((k) => {
    totals[k] += older[k];
  });

  return {
    username,
    displayName: `${username}${DISPLAY_SUFFIXES[Math.floor(rand() * DISPLAY_SUFFIXES.length)]}`,
    avatarUrl: `https://unavatar.io/x/${encodeURIComponent(username)}`,
    postCount,
    activeDays: Math.min(postCount, 5 + Math.floor(rand() * 22)),
    totals,
    firstMention: new Date(firstMention).toISOString(),
    lastMention: new Date(lastMention).toISOString(),
    recentPosts,
    source: "mock",
  };
}
