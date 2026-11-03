import "server-only";
import { mockXStats } from "./mock-data";
import type { PostMetrics, VibePost, XStats } from "./types";

/**
 * ============================================================================
 *  X (TWITTER) DATA LAYER
 * ============================================================================
 *
 *  Mode selection:
 *    - No `X_BEARER_TOKEN` in .env.local (or `VIBE_DATA_MODE=mock`) → MOCK data.
 *    - `X_BEARER_TOKEN` set                                        → REAL Twitter API v2.
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

/** Max pages of 100 posts to pull from search (to respect rate limits). */
const MAX_PAGES = 5;

export async function getXStats(username: string): Promise<XStats> {
  const token = process.env.X_BEARER_TOKEN;
  const forceMock = process.env.VIBE_DATA_MODE === "mock";

  if (!token || forceMock) {
    // Simulated network latency so the "Scanning the vibe..." state is visible.
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
    return mockXStats(username);
  }

  return fetchLiveXStats(username, token);
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

  // 2) Total number of matching posts (cheap counts endpoint), in parallel with
  // 3) the actual posts with public metrics (paginated).
  const countsPromise = xFetch<XCountsResponse>(
    `/tweets/counts/${scope}?query=${query}&granularity=day`,
    token,
  ).catch(() => null); // counts may not be included in every plan — fall back to fetched length

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

  const counts = await countsPromise;
  return toXStats(user.data, tweets, counts?.meta?.total_tweet_count);
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
