import "server-only";
import { mockXStats } from "./mock-data";
import { WeirError, fetchWeirXStats, getWeirApiKeys } from "./weir-api";
import type { PostMetrics, VibePost, XStats } from "./types";

/**
 * ============================================================================
 *  X (TWITTER) DATA LAYER
 * ============================================================================
 *
 *  Source order (override with X_DATA_PROVIDER=weir|x|mock):
 *    - `VIBE_DATA_MODE=mock`                → MOCK data.
 *    - Weir keys (WEIR_API_KEY, WEIR_API_KEYS) → Weir, key by key — see weir-api.ts.
 *    - `X_BEARER_TOKEN`                     → REAL Twitter API v2 (needs a paid X developer Project).
 *    - nothing set                          → MOCK data.
 *  Automatic failover: if every Weir key is out of credits / rejected / rate-limited, the SAME scan is
 *  retried against the official X API, so a spent free Weir account never takes the site down while
 *  X_BEARER_TOKEN exists. If the whole chain fails the scan reports an honest error — it never shows
 *  invented numbers.
 *
 *  👉 WHERE TO PLUG THE REAL API:
 *     1. Create an app at https://developer.x.com → copy the Bearer Token.
 *     2. Put it into `.env.local`:      X_BEARER_TOKEN=AAAAAAAA...
 *        and into Vercel:               vercel env add X_BEARER_TOKEN
 *     3. That's it — `getXStats()` below switches to `fetchLiveXStats()`.
 *
 *  Endpoints used (all v2, app-only Bearer auth):
 *     GET /2/users/by/username/:username        → id, name, avatar
 *     GET /2/tweets/counts/recent?query=…       → total number of matching posts
 *     GET /2/tweets/search/recent?query=…       → posts + public_metrics
 *
 *  ⚠️ Plan limits:
 *     - `search/recent` + `counts/recent` only cover the LAST 7 DAYS.
 *     - For all-time stats (true "first mention") you need full-archive access
 *       (Pro / Enterprise): swap to `/2/tweets/search/all` and `/2/tweets/counts/all`
 *       — same params, just set `X_SEARCH_SCOPE=all` in env.
 *     - Alternative without search access: GET /2/users/:id/tweets (user timeline,
 *       last 3200 posts) and filter by the keywords locally — see `filterLocally`.
 * ============================================================================
 */

const X_API = "https://api.x.com/2";

/** Keywords that count as a "vibe mention". */
export const VIBE_KEYWORDS = ["@vibevibefun", "@vibevibeeco", "vibevibe", '"vibe/vibe"'] as const;

/**
 * Max pages of 100 posts to pull from search. X bills per post returned, so the default is ONE page
 * (the 100 newest matching posts). Raise with X_MAX_PAGES=2..5 if you need deeper history and have credits.
 */
const MAX_PAGES = Math.min(5, Math.max(1, Number(process.env.X_MAX_PAGES) || 1));

export async function getXStats(username: string): Promise<XStats> {
  const weirKeys = getWeirApiKeys();
  const token = process.env.X_BEARER_TOKEN;
  const forceMock = process.env.VIBE_DATA_MODE === "mock";
  const wanted = process.env.X_DATA_PROVIDER; // optional explicit choice: weir | x | mock

  // Failover chain, cheapest source first.
  const chain: ("weir" | "x")[] = [];
  if (!forceMock && wanted !== "mock") {
    if (wanted !== "x" && weirKeys.length) chain.push("weir");
    if (wanted !== "weir" && token) chain.push("x");
  }

  if (!chain.length) {
    // Simulated network latency so the lightning descent is visible.
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
    return mockXStats(username);
  }

  const reasons: string[] = [];
  for (const provider of chain) {
    try {
      return provider === "weir" ? await fetchWeirXStats(username, weirKeys) : await fetchLiveXStats(username, token!);
    } catch (err) {
      console.warn(`[x-api] ${provider} failed:`, err instanceof Error ? err.message : err);
      // Single live source → surface the precise reason (same wording as before the failover chain).
      if (chain.length === 1) throw provider === "weir" ? weirErrorForUser(err) : xErrorForUser(err);
      reasons.push(provider === "weir" ? weirReason(err) : xReason(err));
      console.warn(`[x-api] falling through to the next data source`);
    }
  }

  throw new XApiError(`X data is temporarily unavailable (${reasons.join("; ")}). Please try again in a minute.`, 503);
}

/** A live source is configured but failed → say so. Never show invented numbers as if they were real. */
function weirErrorForUser(err: unknown): XApiError {
  return new XApiError(`X data is temporarily unavailable (${weirReason(err)}). Please try again in a minute.`, 503);
}

function weirReason(err: unknown): string {
  return err instanceof WeirError ? err.message : "the data provider is not responding";
}

function xReason(err: unknown): string {
  return err instanceof XApiError ? err.message : "the X API is not responding";
}

/** Friendly, user-facing error for a failed official X API call. */
function xErrorForUser(err: unknown): Error {
  if (err instanceof XApiError && err.status !== undefined && [401, 402, 403].includes(err.status)) {
    return new XApiError(
      err.status === 402
        ? "X API credits are exhausted. Please try again later."
        : "X data is temporarily unavailable (the X API rejected the token). Please try again later.",
      err.status,
    );
  }
  return err instanceof Error ? err : new XApiError("X data is temporarily unavailable. Please try again in a minute.", 503);
}

/* -------------------------------------------------------------------------- */
/*                               LIVE IMPLEMENTATION                          */
/* -------------------------------------------------------------------------- */

interface XUserResponse {
  data?: { id: string; name: string; username: string; profile_image_url?: string };
  errors?: { detail?: string; title?: string }[];
}

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    reply_count: number;
    retweet_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

interface XSearchResponse {
  data?: XTweet[];
  meta?: { next_token?: string; result_count: number };
}

interface XCountsResponse {
  meta?: { total_tweet_count: number };
}

export class XApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function xFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${X_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Cache identical lookups for 5 minutes — saves rate limit on repeated searches.
    next: { revalidate: 300 },
  });
  if (res.status === 429) throw new XApiError("X API rate limit reached. Try again in a few minutes.", 429);
  if (res.status === 401 || res.status === 403)
    throw new XApiError("X API rejected the Bearer Token (check X_BEARER_TOKEN / plan access).", res.status);
  if (!res.ok) throw new XApiError(`X API error (${res.status}).`, res.status);
  return res.json() as Promise<T>;
}

function buildQuery(username: string) {
  // Original posts + replies + quotes by the user that mention the project. Retweets excluded.
  return `from:${username} (${VIBE_KEYWORDS.join(" OR ")}) -is:retweet`;
}

async function fetchLiveXStats(username: string, token: string): Promise<XStats> {
  const scope = process.env.X_SEARCH_SCOPE === "all" ? "all" : "recent";

  // 1) Resolve the user profile.
  const user = await xFetch<XUserResponse>(
    `/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url,name`,
    token,
  );
  if (!user.data) throw new XApiError(`@${username} was not found on X.`, 404);

  const query = encodeURIComponent(buildQuery(user.data.username));

  // 2) The posts with public metrics (paginated, capped by MAX_PAGES to keep API cost low).
  const tweets: XTweet[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      query: buildQuery(user.data.username),
      max_results: "100",
      "tweet.fields": "created_at,public_metrics",
    });
    if (nextToken) params.set("next_token", nextToken);
    const res = await xFetch<XSearchResponse>(`/tweets/search/${scope}?${params}`, token);
    tweets.push(...(res.data ?? []));
    nextToken = res.meta?.next_token;
    if (!nextToken) break;
  }

  // 3) The separate counts call costs extra, so it is only made when search was cut off by MAX_PAGES
  //    (i.e. there are more matching posts than we fetched). Otherwise the fetched length IS the total.
  let total: number | undefined;
  if (nextToken) {
    const counts = await xFetch<XCountsResponse>(
      `/tweets/counts/${scope}?query=${query}&granularity=day`,
      token,
    ).catch(() => null);
    total = counts?.meta?.total_tweet_count;
  }
  return toXStats(user.data, tweets, total);
}

function toXStats(
  user: NonNullable<XUserResponse["data"]>,
  tweets: XTweet[],
  totalCount?: number,
): XStats {
  const posts: VibePost[] = tweets
    .map((t) => ({
      id: t.id,
      text: t.text,
      url: `https://x.com/${user.username}/status/${t.id}`,
      createdAt: t.created_at,
      metrics: {
        likes: t.public_metrics.like_count,
        views: t.public_metrics.impression_count ?? 0,
        replies: t.public_metrics.reply_count,
        retweets: t.public_metrics.retweet_count,
        quotes: t.public_metrics.quote_count,
      },
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const totals = posts.reduce<PostMetrics>(
    (acc, p) => ({
      likes: acc.likes + p.metrics.likes,
      views: acc.views + p.metrics.views,
      replies: acc.replies + p.metrics.replies,
      retweets: acc.retweets + p.metrics.retweets,
      quotes: acc.quotes + p.metrics.quotes,
    }),
    { likes: 0, views: 0, replies: 0, retweets: 0, quotes: 0 },
  );

  return {
    username: user.username,
    displayName: user.name,
    avatarUrl: user.profile_image_url?.replace("_normal", "_400x400") ?? null,
    postCount: Math.max(totalCount ?? 0, posts.length),
    activeDays: new Set(posts.map((p) => p.createdAt.slice(0, 10))).size,
    totals,
    firstMention: posts.at(-1)?.createdAt ?? null,
    lastMention: posts[0]?.createdAt ?? null,
    recentPosts: posts.slice(0, 10),
    source: "live",
  };
}

/**
 * Helper for the timeline-based alternative (GET /2/users/:id/tweets):
 * pull the user's timeline and keep only posts that mention the project.
 */
export function filterLocally(tweets: XTweet[]) {
  const re = /@vibevibefun|@vibevibeeco|vibevibe|vibe\/vibe/i;
  return tweets.filter((t) => re.test(t.text));
}
