"use client";

import type { ReactNode } from "react";
import type { VibeReport } from "@/lib/types";
import GameStatsSection from "./GameStatsSection";
import RecentPosts from "./RecentPosts";
import TestnetSection from "./TestnetSection";
import VibeCard from "./VibeCard";
import XStatsSection from "./XStatsSection";

/**
 * Report layout:
 *   1. Compact Reflective Card (hit by the lightning) — avatar, username, scores, game rank.
 *   2. Everything else BELOW the card, one glass panel per block.
 */
export default function ReportCard({ report }: { report: VibeReport }) {
  const { x, game, testnet, scores } = report;
  const isMock = x.source === "mock" || game.source === "mock";

  return (
    <div className="flex flex-col gap-5">
      <div className="group/card relative mx-auto w-full max-w-[320px]">
        <div className="pointer-events-none absolute -inset-2 animate-glow-in rounded-[30px] bg-vibe/20 opacity-60 blur-2xl transition duration-500 group-hover/card:opacity-100 group-hover/card:blur-3xl" />
        {/* Card is revealed top → bottom, continuing the bolt's downward motion */}
        <div className="animate-card-reveal">
          <VibeCard report={report} />
        </div>
        {/* Lit edge riding the reveal line */}
        <div className="pointer-events-none absolute inset-x-3 z-10 h-[2px] animate-reveal-edge rounded-full bg-vibe shadow-[0_0_16px_4px_#dff904]" />
      </div>

      {isMock && (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          X &amp; game numbers are demo data until API keys are added · testnet data is live
        </p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <Panel delay={900}>
          <XStatsSection x={x} score={scores.x} />
        </Panel>
        <Panel delay={1000}>
          <GameStatsSection game={game} />
        </Panel>
        <Panel delay={1100}>
          <TestnetSection testnet={testnet} score={scores.testnet} />
        </Panel>
        <Panel delay={1200}>
          <RecentPosts posts={x.recentPosts} username={x.username} />
        </Panel>
        <p className="flex flex-wrap items-center justify-between gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          <span>proof of vibe · @{x.username}</span>
          <span>scanned {new Date(report.scannedAt).toLocaleTimeString()}</span>
        </p>
      </div>
    </div>
  );
}

function Panel({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <div
      className="animate-rise rounded-[24px] border border-white/10 bg-[#0d0c12]/80 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition duration-300 hover:border-vibe/25 sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
