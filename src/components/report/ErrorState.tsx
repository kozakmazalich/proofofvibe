export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="animate-card-in rounded-[28px] border border-[#ff4d6d]/40 bg-[#1a0d12]/90 p-6 text-center shadow-[0_0_60px_-20px_#ff4d6d] sm:p-8"
    >
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#ff4d6d]/15 text-2xl">⚠️</div>
      <h2 className="font-display text-xl font-bold text-white">Vibe check failed</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full border border-white/15 px-5 py-2 font-mono text-xs uppercase tracking-wider text-white/70 transition hover:border-vibe/60 hover:text-vibe"
        >
          Try again
        </button>
      )}
    </div>
  );
}
