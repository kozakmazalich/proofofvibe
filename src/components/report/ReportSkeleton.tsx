const Bar = ({ className = "" }: { className?: string }) => <div className={`skeleton rounded-lg ${className}`} />;

/**
 * Loading placeholders. They render INSIDE the same persistent slots as the real content
 * (see ReportCard), so the top → bottom reveal never restarts when the data arrives.
 */

/** Same size as the real Reflective Card (320 × 460) so the swap is pixel-aligned. */
export function SkeletonCardBody() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[24px] border border-vibe/25 bg-[#15141b] p-5 shadow-[0_0_60px_-16px_#dff904]"
      role="status"
      aria-label="Scanning the vibe"
    >
      <div className="scanline pointer-events-none absolute inset-x-0 h-24" />
      <div className="mt-2 flex justify-center">
        <Bar className="h-56 w-56 rounded-[40px]" />
      </div>
      <p className="mt-4 text-center font-mono text-xs uppercase tracking-[0.3em] text-vibe">
        <span className="animate-text-flicker">Scanning the vibe</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-dot" style={{ animationDelay: `${i * 0.2}s` }}>
            .
          </span>
        ))}
      </p>
      <div className="absolute inset-x-5 bottom-5">
        <Bar className="h-7 w-44" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Bar className="h-14 rounded-xl" />
          <Bar className="h-14 rounded-xl" />
          <Bar className="h-14 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Placeholder for one block below the card. */
export function SkeletonPanelBody({ tiles = 6 }: { tiles?: number }) {
  return (
    <div aria-hidden="true">
      <Bar className="h-3 w-32" />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: tiles }).map((_, j) => (
          <Bar key={j} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
