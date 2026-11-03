import type { ReactNode } from "react";
import CountUp from "../CountUp";

interface StatTileProps {
  label: string;
  value: number | null;
  icon?: ReactNode;
  accent?: boolean;
  delay?: number;
  hint?: string;
  prefix?: string;
}

export default function StatTile({ label, value, icon, accent, delay = 0, hint, prefix }: StatTileProps) {
  return (
    <div
      className={`group/tile relative overflow-hidden rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 ${
        accent
          ? "border-vibe/40 bg-vibe/[0.08] hover:border-vibe/70 hover:shadow-[0_0_30px_-10px_#dff904]"
          : "border-white/10 bg-black/40 hover:border-vibe/40 hover:bg-black/55"
      } backdrop-blur-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</span>
        {icon && <span className="text-white/30 transition group-hover/tile:text-vibe">{icon}</span>}
      </div>
      <div
        className={`mt-2 font-display text-2xl font-bold leading-none sm:text-3xl ${accent ? "text-vibe text-glow" : "text-white"}`}
      >
        {value === null ? <span className="text-white/40">—</span> : <CountUp value={value} delay={delay} prefix={prefix} />}
      </div>
      {hint && <p className="mt-1.5 font-mono text-[10px] text-white/35">{hint}</p>}
    </div>
  );
}
