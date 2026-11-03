"use server";

import { getGameStats } from "@/lib/game-api";
import { computeScores } from "@/lib/score";
import { WALLET_RE, getTestnetStats } from "@/lib/testnet-api";
import { XApiError, getXStats } from "@/lib/x-api";
import type { ScanResult } from "@/lib/types";

/** X handles: 1–15 chars, letters / digits / underscore. */
const USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;

export async function scanVibe(rawUsername: string, rawWallet?: string): Promise<ScanResult> {
  const username = String(rawUsername ?? "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .split(/[/?#]/)[0];
  const wallet = String(rawWallet ?? "").trim();

  if (!username) return { ok: false, error: "Enter an X username to scan." };
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "That doesn't look like a valid X username (letters, numbers, _ — max 15)." };
  }
  if (wallet && !WALLET_RE.test(wallet)) {
    return { ok: false, error: "Wallet must be a 0x… address (42 characters)." };
  }

  try {
    const [x, game, testnet] = await Promise.all([
      getXStats(username),
      getGameStats(username),
      getTestnetStats(wallet || null),
    ]);
    return {
      ok: true,
      report: { x, game, testnet, scores: computeScores(x, testnet), scannedAt: new Date().toISOString() },
    };
  } catch (err) {
    console.error("[scanVibe]", err);
    if (err instanceof XApiError) return { ok: false, error: err.message };
    return { ok: false, error: "The vibe signal got lost. Please try again." };
  }
}
