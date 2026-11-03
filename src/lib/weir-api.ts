import "server-only";
import type { PostMetrics, VibePost, XStats } from "./types";

/**
 * ============================================================================
 *  WEIR — third-party X (Twitter) data API — https://weirapp.io
 * ============================================================================
 *  Used when `WEIR_API_KEY` is set. Replaces the official X API (which needs a paid Project/credits).
 *
 *    POST https://api.weirapp.io/v1/x/search        Authorization: Bearer <WEIR_API_KEY>
 *    body: { fromUsers:[handle], <filter>, sort:"latest", limit, cursor }
 *    Two precise searches are merged (Weir's `anyWords` also matches the bare word "vibe", so the
 *    phrase "vibe/vibe" must NOT go into `anyWords`):
 *      1) anyWords: ["@vibevibefun","@vibevibeeco","vibevibe"]   → mentions / handles / the word vibevibe
 *      2) phrase:   "vibe/vibe"                                   → the exact phrase
 *    cost: 1 credit per call + 1 credit per post returned (free tier: 5000 credits / month, no card).
 *
 *  Per post it returns: text, url, createdAt, likeCount, viewCount, replyCount, retweetCount,
 *  quoteCount and author.{username,name,profileImageUrl}.
 *
 *  Keep credits low:
 *   - WEIR_MAX_POSTS (default 40) caps posts PER SEARCH (two searches) → a busy account costs ≈ 85 credits,
 *     an account with no mentions only 2 (≈ 60+ free scans / month).
 *   - Results are cached in memory for 10 minutes per username.
 *
 *  Rate limit (free tier): 30 requests / minute, and an X search counts as 2. On HTTP 429 / 503 we wait for
 *  `Retry-After` (capped) and retry. If Weir still fails the scan reports an honest error — it never
 *  substitutes invented numbers.
 *
 *  ⚠️ Third-party service: no SLA, operator not named on their site.
 * ============================================================================
 */

const WEIR_URL = process.env.WEIR_API_URL ?? "https://api.weirapp.io/v1/x/search";

/** The two precise searches (see header). */
const SEARCHES: Record<string, unknown>[] = [
  { anyWords: ["@vibevibefun", "@vibevibeeco", "vibevibe"] },
  { phrase: "vibe/vibe" },
];
/** Local safety net: what counts as a "vibe mention" in the post text. */
const VIBE_RE = /@vibevibefun|@vibevibeeco|vibevibe|vibe\s*\/\s*vibe/i;

/** Posts per request. Must stay CONSTANT across pages: Weir rejects a cursor sent with different parameters (400). */
const PAGE_SIZE = 20;

/** Max posts fetched per search. */
const MAX_POSTS = Math.min(200, Math.max(20, Number(process.env.WEIR_MAX_POSTS) || 40));
const MAX_PAGES = 8;
const CACHE_TTL_MS = 10 * 60 * 1000;

export class WeirError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

interface WeirPost {
  id: string;
  text: string;
  url?: string;
  createdAt: string;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  viewCount: number | null;
  quoteCount: number | null;
  author?: { username?: string; name?: string; profileImageUrl?: string | null };
}

interface WeirResponse {
  data?: WeirPost[];
  meta?: { nextCursor?: string | null };
}

const cache = new Map<string, { at: number; value: XStats }>();

export async function fetchWeirXStats(username: string, apiKey: string): Promise<XStats> {
  const key = username.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const posts: WeirPost[] = [];
  for (const filter of SEARCHES) {
    posts.push(...(await searchAll(username, apiKey, filter)));
  }

  const stats = toXStats(username, posts);
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), value: stats });
  return stats;
}

/** One search, paged by cursor until MAX_POSTS / no more results. */
async function searchAll(username: string, apiKey: string, filter: Record<string, unknown>): Promise<WeirPost[]> {
  const posts: WeirPost[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES && posts.length < MAX_POSTS; page++) {
    const body = JSON.stringify({
      fromUsers: [username],
      ...filter,
      sort: "latest",
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    let res: Response;
    for (let attempt = 0; ; attempt++) {
      res = await fetch(WEIR_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if ((res.status !== 429 && res.status !== 503) || attempt >= 2) break;
      // Rate-limited: wait what Weir asks for (seconds), at most 12 s, then retry the same request.
      const wait = Math.min(12, Math.max(1, Number(res.headers.get("retry-after")) || 4));
      await new Promise((r) => setTimeout(r, wait * 1000));
    }

    if (!res.ok) {
      const reason =
        res.status === 401
          ? "Weir API key is invalid or revoked"
          : res.status === 402
            ? "Weir credits are exhausted"
            : res.status === 403
              ? "Weir API key lacks access to X search"
              : res.status === 429
                ? "Weir rate limit reached"
                : `Weir API error (HTTP ${res.status})`;
      throw new WeirError(reason, res.status);
    }

    const remaining = res.headers.get("x-credits-remaining");
    if (remaining !== null) console.info(`[weir] credits remaining: ${remaining}`);

    const json = (await res.json()) as WeirResponse;
    posts.push(...(json.data ?? []));
    cursor = json.meta?.nextCursor ?? undefined;
    if (!cursor || !(json.data?.length ?? 0)) break;
  }
  return posts;
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function toXStats(username: string, raw: WeirPost[]): XStats {
  // Safety net on top of the server-side filter: only real vibe mentions, no plain retweets, no dupes.
  const seen = new Set<string>();
  const vibe = raw.filter((p) => {
    if (seen.has(p.id) || /^RT @/.test(p.text) || !VIBE_RE.test(p.text)) return false;
    seen.add(p.id);
    return true;
  });

  const list: VibePost[] = vibe
    .map((p) => ({
      id: p.id,
      text: p.text,
      url: p.url ?? `https://x.com/${username}/status/${p.id}`,
      createdAt: p.createdAt,
      metrics: {
        likes: n(p.likeCount),
        views: n(p.viewCount),
        replies: n(p.replyCount),
        retweets: n(p.retweetCount),
        quotes: n(p.quoteCount),
      },
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const totals = list.reduce<PostMetrics>(
    (acc, p) => ({
      likes: acc.likes + p.metrics.likes,
      views: acc.views + p.metrics.views,
      replies: acc.replies + p.metrics.replies,
      retweets: acc.retweets + p.metrics.retweets,
      quotes: acc.quotes + p.metrics.quotes,
    }),
    { likes: 0, views: 0, replies: 0, retweets: 0, quotes: 0 },
  );

  const author = vibe.find((p) => p.author?.username)?.author;
  return {
    username: author?.username ?? username,
    displayName: author?.name ?? username,
    // No posts → no author info from Weir; fall back to a public avatar proxy so the card still has a photo.
    avatarUrl: author?.profileImageUrl?.replace("_normal", "_400x400") ?? `https://unavatar.io/x/${encodeURIComponent(username)}`,
    postCount: list.length,
    activeDays: new Set(list.map((p) => p.createdAt.slice(0, 10))).size,
    totals,
    firstMention: list.at(-1)?.createdAt ?? null,
    lastMention: list[0]?.createdAt ?? null,
    recentPosts: list.slice(0, 10),
    source: "live",
  };
}
