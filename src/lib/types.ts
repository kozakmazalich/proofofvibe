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
  source: DataSource;
  /** Set when live data was requested but X refused (bad token / no API access) and demo data is shown instead. */
  fallbackReason?: string;
}

export interface GameStats {
  found: boolean;
  points: number | null;
  rank: number | null;
  totalPlayers: number | null;
  source: DataSource;
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
  realizedPnlEth: number;
  unrealizedPnlEth: number;
  pnlEth: number;
  equityEth: number;
  tokensTraded: number;
  openPositions: number;
  lastActivity: string | null;
  recentActivity: TestnetActivity[];
  /** Block the indexer data is current to. */
  asOfBlock: string | null;
  error?: string;
}

export interface VibeScores {
  /** X activity score, 0..100. */
  x: number;
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
