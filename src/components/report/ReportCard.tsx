"use client";

import type { ReactNode } from "react";
import type { VibeReport } from "@/lib/types";
import GameStatsSection from "./GameStatsSection";
import RecentPosts from "./RecentPosts";
import TestnetSection from "./TestnetSection";
import VibeCard from "./VibeCard";
import XStatsSection from "./XStatsSection";

/**
 * Report layout — rendered only once ALL data has loaded (the lightning keeps running down until then):
 *   1. the compact Reflective Card, revealed top → bottom right below the bolt's tip;
 *   2. every other block below it, one glass panel each.
 */
export default function ReportCard({ report }: { report: VibeReport }) {
  // Honest note about what is demo and what is live (X, game rank and testnet are independent sources)
  const demoNote = (() => {
    const parts: string[] = [];
    if (report.x.fallbackReason) parts.push(`${report.x.fallbackReason} — showing demo X data`);
    else if (report.x.source === "mock") parts.push("X data is demo until an API key is added");
    if (report.game.unavailable) parts.push("game leaderboard unavailable");
    if (report.testnet.status === "ok" || report.testnet.status === "empty") parts.push("testnet data is live");
    return parts.length ? parts.join(" · ") : null;
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* Card slot */}
      <div className="group/card relative mx-auto h-[460px] w-full max-w-[320px]">
        <div className="pointer-events-none absolute -inset-2 animate-glow-in rounded-[30px] bg-vibe/20 opacity-60 blur-2xl transition duration-500 group-hover/card:opacity-100 group-hover/card:blur-3xl" />
        <div className="relative h-full animate-card-reveal">
          <VibeCard report={report} />
        </div>
        {/* Lit edge riding the soft reveal edge */}
        <div className="pointer-events-none absolute inset-x-3 z-10 h-[2px] animate-reveal-edge rounded-full bg-vibe shadow-[0_0_18px_5px_#dff904]" />
      </div>

      {demoNote && (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{demoNote}</p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <Panel delay={1000}>
          <XStatsSection x={report.x} score={report.scores.x} parts={report.scores.xParts} />
        </Panel>
        <Panel delay={1100}>
          <GameStatsSection game={report.game} />
        </Panel>
        <Panel delay={1200}>
          <TestnetSection testnet={report.testnet} score={report.scores.testnet} />
        </Panel>
        <Panel delay={1300}>
          <RecentPosts posts={report.x.recentPosts} username={report.x.username} />
        </Panel>
        <p className="flex flex-wrap items-center justify-between gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          <span>proof of vibe · @{report.x.username}</span>
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
