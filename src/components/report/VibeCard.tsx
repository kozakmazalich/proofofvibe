"use client";

/* eslint-disable @next/next/no-img-element -- avatars come from arbitrary remote hosts */
import { useState, type CSSProperties, type ReactNode } from "react";
import type { VibeReport } from "@/lib/types";
import CountUp from "../CountUp";
import ReflectiveCard from "../reactbits/ReflectiveCard";

/** Same tile look as the React Bits demo card (uses the card's own CSS variables). */
const TILE: CSSProperties = {
  background: "var(--rc-tile)",
  boxShadow: "var(--rc-tile-shadow), inset 0 0 0 1px var(--rc-tile-edge), inset 0 1px 0 var(--rc-tile-highlight)",
};

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 460;

/**
 * Compact ID-style card — React Bits <ReflectiveCard tint="#dff904" />
 * (https://reactbits.dev/components/reflective-card?tint=dff904), same proportions as the demo.
 * Shows ONLY: X avatar, username, X Score, Battlegrounds rank, Testnet Score (if a wallet was entered).
 * Nothing else — all other details render below the card.
 */
export default function VibeCard({ report }: { report: VibeReport }) {
  const { x, game, testnet, scores } = report;
  const [avatarOk, setAvatarOk] = useState(Boolean(x.avatarUrl));
  const showTestnet = testnet.wallet !== null;

  return (
    <ReflectiveCard
      tint="#dff904"
      theme="dark"
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      radius={24}
      intro={false} // the card is revealed top → bottom by the parent instead of the built-in rise-up intro
      className="mx-auto"
    >
      {/* X avatar */}
      <div className="mt-2 flex justify-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-[44px] bg-vibe/30 blur-xl" />
          {avatarOk && x.avatarUrl ? (
            <img
              src={x.avatarUrl}
              alt={`@${x.username}`}
              width={224}
              height={224}
              onError={() => setAvatarOk(false)}
              className="relative h-56 w-56 rounded-[40px] border-2 border-vibe/70 object-cover"
            />
          ) : (
            <div className="relative grid h-56 w-56 place-items-center rounded-[40px] border-2 border-vibe/70 bg-black font-display text-8xl font-bold text-vibe">
              {x.username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Username */}
      <div className="mt-auto">
        <h2 className="m-0 truncate font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] [color:var(--rc-ink)]">
          @{x.username}
        </h2>
      </div>

      {/* Scores */}
      <div className={`mt-5 grid gap-2 ${showTestnet ? "grid-cols-3" : "grid-cols-2"}`}>
        <ScoreTile label="X Score" accent compact={showTestnet}>
          <CountUp value={scores.x} compact={false} />
          <Small>/100</Small>
        </ScoreTile>
        <ScoreTile label="Game rank" compact={showTestnet}>
          {game.rank ? <CountUp value={game.rank} compact={game.rank >= 1000} prefix="#" /> : <span className="opacity-50">—</span>}
        </ScoreTile>
        {showTestnet && (
          <ScoreTile label="Testnet" accent compact>
            {scores.testnet === null ? (
              <span className="opacity-50">—</span>
            ) : (
              <>
                <CountUp value={scores.testnet} compact={false} />
                <Small>/100</Small>
              </>
            )}
          </ScoreTile>
        )}
      </div>
    </ReflectiveCard>
  );
}

function ScoreTile({
  label,
  accent,
  compact,
  children,
}: {
  label: string;
  accent?: boolean;
  /** 3-column mode: smaller value so "#1.2K" / "100/100" fit in ~85px tiles */
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[12px] px-2.5 py-2.5" style={TILE}>
      <div className="truncate text-[10px] uppercase leading-4 tracking-[0.08em] [color:var(--rc-muted)]">{label}</div>
      <div
        className={`mt-0.5 flex min-w-0 items-baseline whitespace-nowrap font-display font-bold leading-7 tabular-nums ${
          compact ? "text-[18px]" : "text-[22px]"
        } ${
          accent ? "text-vibe text-glow" : "[color:var(--rc-ink)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const Small = ({ children }: { children: ReactNode }) => (
  <span className="ml-0.5 text-[11px] font-medium [color:var(--rc-muted)] [text-shadow:none]">{children}</span>
);
