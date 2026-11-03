import "server-only";
import { mockXStats } from "./mock-data";
import { WeirError, fetchWeirXStats } from "./weir-api";
import type { PostMetrics, VibePost, XStats } from "./types";

/**
 * ============================================================================
 *  X (TWITTER) DATA LAYER
 * ============================================================================
 *
 *  Source selection (first match wins; override with X_DATA_PROVIDER=weir|x|mock):
 *    - `VIBE_DATA_MODE=mock`                → MOCK data.
 *    - `WEIR_API_KEY` set                   → Weir (third-party X data API, free credits) — see weir-api.ts.
 *    - `X_BEARER_TOKEN` set                 → REAL Twitter API v2 (needs a paid X developer Project).
 *    - nothing set                          → MOCK data.
 *  Any failure of a live source falls back to MOCK with a visible note (never breaks the page).
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
  const token = process.env.X_BEARER_TOKEN;
  const weirKey = process.env.WEIR_API_KEY;
  const forceMock = process.env.VIBE_DATA_MODE === "mock";
  const wanted = process.env.X_DATA_PROVIDER; // optional explicit choice: weir | x | mock
  const provider = forceMock || wanted === "mock" ? "mock" : wanted === "weir" || (!wanted && weirKey) ? "weir" : token ? "x" : "mock";

  if (provider === "mock" || (provider === "weir" && !weirKey) || (provider === "x" && !token)) {
    // Simulated network latency so the "Scanning the vibe..." state is visible.
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
    return mockXStats(username);
  }

  if (provider === "weir") {
    try {
      return await fetchWeirXStats(username, weirKey!);
    } catch (err) {
      console.warn("[x-api] Weir failed — falling back to demo data:", err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 800));
      return {
        ...mockXStats(username),
        fallbackReason: err instanceof WeirError ? err.message : "Weir is not responding",
      };
    }
  }
  // provider === "x" → official API below
  if (!token) return mockXStats(username);

  try {
    return await fetchLiveXStats(username, token!);
  } catch (err) {
    // The token / plan is the problem, not the user's request → keep the site usable with demo data
    // and say so, instead of failing every search. (404 "user not found" and 429 still surface as errors.)
    if (err instanceof XApiError && err.status !== undefined && [401, 402, 403].includes(err.status)) {
      console.warn(`[x-api] X rejected the token (HTTP ${err.status}) — falling back to demo data.`);
      await new Promise((r) => setTimeout(r, 800));
      return {
        ...mockXStats(username),
        fallbackReason:
          err.status === 402
            ? "X API credits are exhausted"
            : "X rejected the API token (the app must belong to a Project with API access)",
      };
    }
    throw err;
  }
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
