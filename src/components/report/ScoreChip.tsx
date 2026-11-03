export default function ScoreChip({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-vibe/40 bg-vibe/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-vibe ${className}`}
    >
      {label}
      <span className="font-bold text-white">
        {value}
        <span className="text-white/40">/100</span>
      </span>
    </span>
  );
}
