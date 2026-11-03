import Link from "next/link";

export default function Header() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="group flex items-center gap-3" aria-label="Vibe Scanner home">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-vibe/40 bg-vibe/10 shadow-[0_0_24px_-4px_rgba(223,249,4,0.6)] transition-shadow group-hover:shadow-[0_0_32px_0_rgba(223,249,4,0.8)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-vibe" aria-hidden="true">
            <path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8L13.5 2Z" />
          </svg>
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Vibe<span className="text-vibe">Scanner</span>
          </span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">vibe/vibe analytics</span>
        </span>
      </Link>

      <nav className="flex items-center gap-2 text-sm">
        <a
          href="https://bg.vibevibe.fun/"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/60 transition hover:border-vibe/50 hover:text-vibe sm:inline-flex"
        >
          Battlegrounds ↗
        </a>
        <a
          href="https://x.com/vibevibefun"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-vibe/30 bg-vibe/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-vibe transition hover:bg-vibe hover:text-black"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          @vibevibefun
        </a>
      </nav>
    </header>
  );
}
