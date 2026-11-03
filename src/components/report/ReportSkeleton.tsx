const Bar = ({ className = "" }: { className?: string }) => <div className={`skeleton rounded-lg ${className}`} />;

/**
 * Loading state. The card placeholder has the exact size/position of the real
 * Reflective Card, so the lightning lands on the same spot before and after loading.
 */
export default function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="relative mx-auto h-[460px] w-full max-w-[320px] animate-card-reveal overflow-hidden rounded-[24px] border border-vibe/25 bg-[#15141b] p-5 shadow-[0_0_60px_-16px_#dff904]">
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
          <Bar className="mt-2 h-3 w-28" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Bar className="h-14 rounded-xl" />
            <Bar className="h-14 rounded-xl" />
            <Bar className="h-14 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[24px] border border-white/10 bg-[#0d0c12]/80 p-4 sm:p-6">
            <Bar className="h-3 w-32" />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: i === 2 ? 3 : 6 }).map((_, j) => (
                <Bar key={j} className="h-20 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
