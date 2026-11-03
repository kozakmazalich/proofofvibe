import "server-only";
import { mockGameStats } from "./mock-data";
import type { GameStats } from "./types";

/**
 * ============================================================================
 *  VIBE VIBERS BATTLEGROUNDS (https://bg.vibevibe.fun/) — leaderboard lookup
 * ============================================================================
 *
 *  Right now: MOCK. Only handles from `MOCK_LEADERBOARD` (src/lib/mock-data.ts)
 *  are "found"; everyone else shows "—" in the UI.
 *
 *  👉 HOW TO CONNECT THE REAL LEADERBOARD LATER:
 *
 *  Option A — official API (preferred, once it exists):
 *     Set `BG_LEADERBOARD_API_URL` in .env.local, e.g.
 *         BG_LEADERBOARD_API_URL=https://bg.vibevibe.fun/api/leaderboard
 *     and (optionally) `BG_API_KEY`. `fetchLiveGameStats()` expects either
 *         GET {url}?username=<handle>  → { username, points, rank, totalPlayers }
 *     or a full list
 *         GET {url}                   → [{ username, points, rank? }, ...]
 *     Adjust `normalize()` to the real response shape.
 *
 *  Option B — no public API: the game frontend almost certainly loads the
 *     leaderboard from some JSON endpoint. Open bg.vibevibe.fun → DevTools →
 *     Network → filter "Fetch/XHR" → open the leaderboard → copy that request URL
 *     into BG_LEADERBOARD_API_URL. (Ask the team for permission / a stable endpoint.)
 *
 *  Option C — scraping HTML: only if the leaderboard is server-rendered.
 *     Fetch the page and parse it with `cheerio`. Fragile — prefer A or B.
 *
 *  Results are cached for 5 minutes via `next: { revalidate: 300 }`.
 * ============================================================================
 */

export async function getGameStats(username: string): Promise<GameStats> {
  const url = process.env.BG_LEADERBOARD_API_URL;
  if (!url || process.env.VIBE_DATA_MODE === "mock") {
    return mockGameStats(username);
  }
  try {
    return await fetchLiveGameStats(url, username);
  } catch (err) {
    // The game block must never break the whole report — degrade to "—".
    console.error("[game-api] leaderboard lookup failed:", err);
    return { found: false, points: null, rank: null, totalPlayers: null, source: "live" };
  }
}

interface LeaderboardEntry {
  username?: string;
  twitter?: string;
  handle?: string;
  points?: number;
  score?: number;
  rank?: number;
}

async function fetchLiveGameStats(baseUrl: string, username: string): Promise<GameStats> {
  const url = new URL(baseUrl);
  url.searchParams.set("username", username);

  const res = await fetch(url, {
    headers: process.env.BG_API_KEY ? { Authorization: `Bearer ${process.env.BG_API_KEY}` } : undefined,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Leaderboard responded ${res.status}`);
  const json: unknown = await res.json();
  return normalize(json, username);
}

/** Map whatever the leaderboard returns into GameStats. Tweak to the real schema. */
function normalize(json: unknown, username: string): GameStats {
  const handleOf = (e: LeaderboardEntry) => (e.username ?? e.twitter ?? e.handle ?? "").replace(/^@/, "");
  const pointsOf = (e: LeaderboardEntry) => e.points ?? e.score ?? 0;

  const list: LeaderboardEntry[] | null = Array.isArray(json)
    ? json
    : Array.isArray((json as { data?: unknown })?.data)
      ? (json as { data: LeaderboardEntry[] }).data
      : null;

  if (list) {
    const sorted = [...list].sort((a, b) => pointsOf(b) - pointsOf(a));
    const idx = sorted.findIndex((e) => handleOf(e).toLowerCase() === username.toLowerCase());
    if (idx === -1) return { found: false, points: null, rank: null, totalPlayers: list.length, source: "live" };
    return {
      found: true,
      points: pointsOf(sorted[idx]),
      rank: sorted[idx].rank ?? idx + 1,
      totalPlayers: list.length,
      source: "live",
    };
  }

  const single = json as LeaderboardEntry & { totalPlayers?: number };
  if (single && handleOf(single)) {
    return {
      found: true,
      points: pointsOf(single),
      rank: single.rank ?? null,
      totalPlayers: single.totalPlayers ?? null,
      source: "live",
    };
  }
  return { found: false, points: null, rank: null, totalPlayers: null, source: "live" };
}
