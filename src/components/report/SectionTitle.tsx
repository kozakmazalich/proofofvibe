import type { ReactNode } from "react";

export default function SectionTitle({ index, title, aside }: { index: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="font-mono text-[10px] text-vibe/70">{index}</span>
      <h3 className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-white">{title}</h3>
      <span className="h-px flex-1 bg-gradient-to-r from-vibe/40 via-white/10 to-transparent" />
      {aside}
    </div>
  );
}
