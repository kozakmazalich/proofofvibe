import "server-only";
import { mockXStats } from "./mock-data";
import { WeirError, fetchWeirXStats, getWeirApiKeys } from "./weir-api";
import type { XStats } from "./types";

/**
 * ============================================================================
 *  X (TWITTER) DATA LAYER
 * ============================================================================
 *
 *  Live data comes from Weir (https://weirapp.io) — see weir-api.ts. The official X API was
 *  removed: it needed a paid Project and never worked reliably here.
 *
 *  Source selection:
 *    - `VIBE_DATA_MODE=mock`  → MOCK data.
 *    - Weir keys set          → Weir, trying `WEIR_API_KEY` then `WEIR_API_KEYS` one by one.
 *    - no keys                → MOCK data.
 *
 *  Every key that is out of credits (402), rejected (401/403) or rate-limited (429) is skipped
 *  for the next one. If all of them fail the scan reports an honest error — it never shows
 *  invented numbers.
 * ============================================================================
 */

export class XApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function getXStats(username: string): Promise<XStats> {
  const keys = getWeirApiKeys();

  if (process.env.VIBE_DATA_MODE === "mock" || !keys.length) {
    // Simulated network latency so the lightning descent is visible.
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 600));
    return mockXStats(username);
  }

  try {
    return await fetchWeirXStats(username, keys);
  } catch (err) {
    // A live source is configured but failed → say so. Never show invented numbers as if they were real.
    console.warn("[x-api] Weir failed:", err instanceof Error ? err.message : err);
    const why = err instanceof WeirError ? err.message : "the data provider is not responding";
    throw new XApiError(`X data is temporarily unavailable (${why}). Please try again in a minute.`, 503);
  }
}
