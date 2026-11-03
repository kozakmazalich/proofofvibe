"use client";

import { useState, type ReactNode } from "react";
import type { VibeReport } from "@/lib/types";
import GameStatsSection from "./GameStatsSection";
import RecentPosts from "./RecentPosts";
import { SkeletonCardBody, SkeletonPanelBody } from "./ReportSkeleton";
import TestnetSection from "./TestnetSection";
import VibeCard from "./VibeCard";
import XStatsSection from "./XStatsSection";

/**
 * Report layout — ONE persistent structure for both states:
 *   report === null  → loading skeleton inside the card slot / panels
 *   report !== null  → real card / blocks
 * The card slot and panels stay mounted when the data arrives, so the top → bottom reveal
 * (a soft-edged wipe with a lit edge) plays exactly once and is never interrupted or replayed.
 * If the data arrives after the reveal started, the content just fades in inside the slot.
 */
export default function ReportCard({ report }: { report: VibeReport | null }) {
  // true when this component was first shown as a skeleton → content must fade in when data arrives
  const [startedAsSkeleton] = useState(report === null);
  const swap = startedAsSkeleton ? "animate-card-swap" : "";

  // Honest note about what is demo and what is live (X, game rank and testnet are independent sources)
  const demoNote = (() => {
    if (!report) return null;
    const parts: string[] = [];
    if (report.x.fallbackReason) parts.push(`${report.x.fallbackReason} — showing demo X data`);
    else if (report.x.source === "mock") parts.push("X data is demo until an API key is added");
    if (report.game.source === "mock") parts.push("game rank is demo");
    if (report.testnet.status === "ok" || report.testnet.status === "empty") parts.push("testnet data is live");
    return parts.length ? parts.join(" · ") : null;
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* Card slot */}
      <div className="group/card relative mx-auto h-[460px] w-full max-w-[320px]">
        <div className="pointer-events-none absolute -inset-2 animate-glow-in rounded-[30px] bg-vibe/20 opacity-60 blur-2xl transition duration-500 group-hover/card:opacity-100 group-hover/card:blur-3xl" />
        <div className="relative h-full animate-card-reveal">
          {report ? (
            <div className={`h-full ${swap}`}>
              <VibeCard report={report} />
            </div>
          ) : (
            <SkeletonCardBody />
          )}
        </div>
        {/* Lit edge riding the soft reveal edge */}
        <div className="pointer-events-none absolute inset-x-3 z-10 h-[2px] animate-reveal-edge rounded-full bg-vibe shadow-[0_0_18px_5px_#dff904]" />
      </div>

      {demoNote && (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{demoNote}</p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        <Panel delay={1000}>
          {report ? (
            <div className={swap}>
              <XStatsSection x={report.x} score={report.scores.x} />
            </div>
          ) : (
            <SkeletonPanelBody />
          )}
        </Panel>
        <Panel delay={1100}>
          {report ? (
            <div className={swap}>
              <GameStatsSection game={report.game} />
            </div>
          ) : (
            <SkeletonPanelBody tiles={2} />
          )}
        </Panel>
        <Panel delay={1200}>
          {report ? (
            <div className={swap}>
              <TestnetSection testnet={report.testnet} score={report.scores.testnet} />
            </div>
          ) : (
            <SkeletonPanelBody />
          )}
        </Panel>
        <Panel delay={1300}>
          {report ? (
            <div className={swap}>
              <RecentPosts posts={report.x.recentPosts} username={report.x.username} />
            </div>
          ) : (
            <SkeletonPanelBody tiles={3} />
          )}
        </Panel>
        {report && (
          <p className="flex flex-wrap items-center justify-between gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            <span>proof of vibe · @{report.x.username}</span>
            <span>scanned {new Date(report.scannedAt).toLocaleTimeString()}</span>
          </p>
        )}
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
