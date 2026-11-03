import "server-only";
import type { GameStats } from "./types";

/**
 * ============================================================================
 *  VIBE VIBERS BATTLEGROUNDS — https://bg.vibevibe.fun — REAL public leaderboard
 * ============================================================================
 *  The game exposes its standings as public JSON (the same call its own UI makes):
 *
 *    GET /api/cup/board              → current season ("Season 1")
 *    GET /api/cup/board?season=0     → "Preseason"
 *    { season, name, of, at, rows: [{ rank, handle, name, avatar, total, wins, seconds, thirds, played, eligible }] }
 *
 *  `handle` is the player's X username, `total` their points, `of` the number of players on that board.
 *
 *  Lookup order: current season first (once it has started and the player has points), then the preseason.
 *  Nothing here is invented: a handle that is not on a board is "not found" and the UI shows "—".
 *
 *  Season 1 starts 2026-11-04 15:00 UTC; until then its board is empty and the preseason board is used.
 *  Both calls are cached for a minute.
 * ============================================================================
 */

const BOARD_URL = process.env.BG_BOARD_URL ?? "https://bg.vibevibe.fun/api/cup/board";

interface BoardRow {
  rank: number;
  handle: string;
  name?: string;
  total: number;
  wins?: number;
  played?: number;
}

interface Board {
  season: number;
  name: string;
  of: number;
  rows: BoardRow[];
}

async function fetchBoard(season?: number): Promise<Board> {
  const url = season === undefined ? BOARD_URL : `${BOARD_URL}?season=${season}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Battlegrounds board responded ${res.status}`);
  const json = (await res.json()) as Partial<Board>;
  if (!json || !Array.isArray(json.rows)) throw new Error("Unexpected Battlegrounds board shape");
  return { season: json.season ?? 0, name: json.name ?? "Season", of: json.of ?? json.rows.length, rows: json.rows };
}

const norm = (h: string) => h.replace(/^@/, "").toLowerCase();

export async function getGameStats(username: string): Promise<GameStats> {
  try {
    const [current, pre] = await Promise.all([fetchBoard(), fetchBoard(0)]);
    const me = norm(username);

    for (const board of [current, pre]) {
      const row = board.rows.find((r) => norm(r.handle) === me);
      if (row) {
        return {
          found: true,
          points: row.total,
          rank: row.rank,
          totalPlayers: board.of,
          season: board.name,
          wins: row.wins ?? null,
          played: row.played ?? null,
          source: "live",
        };
      }
    }

    // Not on any board we can see. Say which one is the relevant reference.
    const ref = current.of > 0 ? current : pre;
    const truncated = ref.rows.length < ref.of;
    return {
      found: false,
      points: null,
      rank: null,
      totalPlayers: ref.of,
      season: ref.name,
      wins: null,
      played: null,
      source: "live",
      note: truncated ? `Not in the public top ${ref.rows.length} of ${ref.of}` : undefined,
    };
  } catch (err) {
    // Never break the whole report because the game site is down.
    console.error("[game-api] leaderboard lookup failed:", err);
    return {
      found: false,
      points: null,
      rank: null,
      totalPlayers: null,
      season: null,
      wins: null,
      played: null,
      source: "live",
      unavailable: true,
    };
  }
}
