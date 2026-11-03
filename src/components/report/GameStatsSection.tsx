import { formatFull } from "@/lib/format";
import type { GameStats } from "@/lib/types";
import CountUp from "../CountUp";
import SectionTitle from "./SectionTitle";
import { BoltIcon, ExternalIcon, TrophyIcon } from "./icons";

export default function GameStatsSection({ game }: { game: GameStats }) {
  const percentile =
    game.found && game.rank && game.totalPlayers ? Math.max(0.01, (game.rank / game.totalPlayers) * 100) : null;

  return (
    <section aria-label="Game stats" className="animate-rise" style={{ animationDelay: "220ms" }}>
      <SectionTitle
        index="02"
        title="Game Stats"
        aside={
          <a
            href="https://bg.vibevibe.fun/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/40 transition hover:text-vibe"
          >
            bg.vibevibe.fun <ExternalIcon className="h-3 w-3" />
          </a>
        }
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md sm:p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-vibe/10 blur-3xl" />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold text-white">Vibe Vibers Battlegrounds</span>
          {game.season && (
            <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
              {game.season}
            </span>
          )}
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
              game.found ? "bg-vibe/15 text-vibe" : "bg-white/5 text-white/40"
            }`}
          >
            {game.unavailable ? "leaderboard unavailable" : game.found ? "player found" : "not on leaderboard"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-vibe/30 bg-vibe/[0.07] p-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              Points <BoltIcon className="h-4 w-4 text-vibe/70" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-vibe text-glow sm:text-4xl">
              {game.points === null ? <span className="text-white/40">—</span> : <CountUp value={game.points} compact={false} />}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              Rank <TrophyIcon className="h-4 w-4 text-white/40" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
              {game.rank === null ? <span className="text-white/40">—</span> : <CountUp value={game.rank} prefix="#" compact={false} />}
            </div>
            {game.totalPlayers !== null && game.totalPlayers > 0 && (
              <div className="mt-1 font-mono text-[10px] text-white/35">of {formatFull(game.totalPlayers)} players</div>
            )}
          </div>
        </div>

        {game.found && game.wins !== null && game.played !== null && (
          <p className="mt-3 font-mono text-[11px] text-white/45">
            <span className="text-white">{formatFull(game.wins)}</span> wins in{" "}
            <span className="text-white">{formatFull(game.played)}</span> matches
          </p>
        )}

        {percentile !== null ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] text-white/45">
              <span>Top {percentile < 1 ? percentile.toFixed(2) : percentile.toFixed(1)}%</span>
              <span>{game.season ?? "Leaderboard"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left animate-bar rounded-full bg-gradient-to-r from-vibe/60 to-vibe shadow-[0_0_12px_#dff904]"
                style={{ width: `${Math.max(4, 100 - percentile)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 font-mono text-[11px] text-white/40">
            {game.unavailable
              ? "The Battlegrounds leaderboard could not be reached right now."
              : game.note ?? "This handle is not on the Battlegrounds leaderboard yet."}{" "}
            <a href="https://bg.vibevibe.fun/" target="_blank" rel="noreferrer" className="text-vibe hover:underline">
              Enter the arena →
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
