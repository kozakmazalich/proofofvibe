"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { scanVibe } from "@/app/actions";
import type { VibeReport } from "@/lib/types";
import LightningStrike from "./LightningStrike";
import SearchBar from "./SearchBar";
import ErrorState from "./report/ErrorState";
import ReportCard from "./report/ReportCard";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

type State =
  | { phase: "idle" }
  | { phase: "loading"; username: string }
  | { phase: "success"; report: VibeReport }
  | { phase: "error"; message: string; username: string; wallet: string };

export default function VibeScanner() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [query, setQuery] = useState("");
  const [wallet, setWallet] = useState("");
  const [strikeId, setStrikeId] = useState(0);
  /** The card only appears after the bolt has travelled all the way down. */
  const [landed, setLanded] = useState(false);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  const search = useCallback((raw: string, rawWallet = "") => {
    const username = raw.trim().replace(/^@+/, "");
    const w = rawWallet.trim();
    if (!username) return;
    setQuery(username);
    setWallet(w);
    const id = ++requestId.current;
    setState({ phase: "loading", username });
    setStrikeId(id);
    setLanded(false);

    // Shareable URL: /?u=username&w=0x…
    const url = new URL(window.location.href);
    url.searchParams.set("u", username);
    if (w) url.searchParams.set("w", w);
    else url.searchParams.delete("w");
    window.history.replaceState(null, "", url);

    startTransition(async () => {
      const result = await scanVibe(username, w).catch(() => ({ ok: false as const, error: "Network error. Please try again." }));
      if (id !== requestId.current) return; // a newer search started
      setState(
        result.ok
          ? { phase: "success", report: result.report }
          : { phase: "error", message: result.error, username, wallet: w },
      );
    });
  }, []);

  // Auto-scan when opened with ?u=username(&w=0x…)
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const u = params.get("u");
    if (u) {
      // Ignore a malformed ?w= instead of starting a scan that can only fail.
      const w = params.get("w") ?? "";
      const t = setTimeout(() => search(u, WALLET_RE.test(w) ? w : ""), 0);
      return () => clearTimeout(t);
    }
  }, [search]);

  const loading = state.phase === "loading";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative z-10 mx-auto max-w-2xl">
        <SearchBar
          value={query}
          onChange={setQuery}
          wallet={wallet}
          onWalletChange={setWallet}
          onSearch={search}
          loading={loading}
        />
      </div>

      <div>
        {state.phase !== "idle" && (
          // New key per search → the bolt restarts its descent from the search bar.
          <LightningStrike key={strikeId} phase={state.phase} onLanded={() => setLanded(true)} />
        )}

        {/* One concise screen-reader announcement instead of a live region around animating numbers */}
        <p className="sr-only" role="status" aria-live="polite">
          {state.phase === "loading"
            ? `Scanning @${state.username}…`
            : state.phase === "error"
              ? `Scan failed: ${state.message}`
              : state.phase === "success"
                ? `@${state.report.x.username}: X score ${state.report.scores.x} of 100, game rank ${
                    state.report.game.rank ? `#${state.report.game.rank}` : "not ranked"
                  }${state.report.scores.testnet !== null ? `, testnet score ${state.report.scores.testnet} of 100` : ""}.`
                : ""}
        </p>

        {/* min-height reserves the landing spot so the page can scroll down with the bolt */}
        <div className={`relative ${state.phase !== "idle" ? "min-h-[max(520px,100dvh)]" : ""}`} aria-busy={loading}>
          {/* Nothing is shown while loading — the lightning keeps running down until all data is in */}
          {landed && state.phase === "success" && <ReportCard key={strikeId} report={state.report} />}
          {landed && state.phase === "error" && (
            <div className="mx-auto max-w-md">
              <ErrorState message={state.message} onRetry={() => search(state.username, state.wallet)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
