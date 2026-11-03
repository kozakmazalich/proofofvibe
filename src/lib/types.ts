export type DataSource = "mock" | "live";

export interface PostMetrics {
  likes: number;
  views: number;
  replies: number;
  retweets: number;
  quotes: number;
}

export interface VibePost {
  id: string;
  text: string;
  url: string;
  createdAt: string; // ISO 8601
  metrics: PostMetrics;
}

export interface XStats {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Posts that mention @vibevibefun / @vibevibeeco / "vibevibe" / "vibe/vibe". */
  postCount: number;
  totals: PostMetrics;
  firstMention: string | null; // ISO 8601
  lastMention: string | null; // ISO 8601
  recentPosts: VibePost[];
  /** Distinct calendar days (UTC) on which the user posted about vibe/vibe, within the fetched sample. */
  activeDays?: number;
  source: DataSource;
  /** Set when live data was requested but X refused (bad token / no API access) and demo data is shown instead. */
  fallbackReason?: string;
}

export interface GameStats {
  found: boolean;
  points: number | null;
  rank: number | null;
  totalPlayers: number | null;
  /** Which board the numbers come from: "Season 1" or "Preseason". */
  season: string | null;
  wins: number | null;
  played: number | null;
  source: DataSource;
  /** The game's leaderboard could not be reached right now. */
  unavailable?: boolean;
  note?: string;
}

export interface TestnetActivity {
  id: string;
  type: string; // BUY | SELL | ...
  tokenAddress: string;
  txHash: string;
  occurredAt: string;
  amountEth: number | null;
}

export type TestnetStatus = "no-wallet" | "ok" | "empty" | "unavailable";

export interface TestnetStats {
  status: TestnetStatus;
  wallet: string | null;
  buyCount: number;
  sellCount: number;
  /** Buy + sell volume, all time, in ETH. */
  volumeEth: number;
  volume30dEth: number;
  winRate: number | null; // 0..1
  /**
   * Portfolio figures come from the indexer's accounting projection. They are null — never 0 — while
   * that projection reports the wallet as not accounted yet (freshness PARTIAL, e.g.
   * ACCOUNTING_REPLAY_PENDING), so the UI can hide them instead of claiming the wallet has nothing.
   */
  realizedPnlEth: number | null;
  unrealizedPnlEth: number | null;
  pnlEth: number | null;
  equityEth: number | null;
  tokensTraded: number | null;
  openPositions: number | null;
  /** False when the indexer returned no portfolio summary for this wallet yet. */
  portfolioAvailable: boolean;
  lastActivity: string | null;
  recentActivity: TestnetActivity[];
  /** Block the indexer data is current to. */
  asOfBlock: string | null;
  error?: string;
}

/** The four building blocks of the X Score (each has its own maximum, they add up to 100). */
export interface XScoreParts {
  activity: number; // max 20
  reach: number; // max 35
  engagement: number; // max 35
  resonance: number; // max 10
}

export interface VibeScores {
  /** X activity score, 0..100. */
  x: number;
  xParts: XScoreParts;
  /** Robinhood testnet score, 0..100 — null when no wallet was entered or data is unavailable. */
  testnet: number | null;
}

export interface VibeReport {
  x: XStats;
  game: GameStats;
  testnet: TestnetStats;
  scores: VibeScores;
  scannedAt: string;
}

export type ScanResult =
  | { ok: true; report: VibeReport }
  | { ok: false; error: string };
