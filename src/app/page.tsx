import Header from "@/components/Header";
import VibeScanner from "@/components/VibeScanner";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <BackgroundFX />
      <Header />

      <main className="relative z-10 flex-1 px-5 pb-24 sm:px-8">
        <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-16">
          <p className="mx-auto inline-flex animate-rise items-center gap-2 rounded-full border border-vibe/25 bg-vibe/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-vibe/90 sm:text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vibe" /> vibe/vibe on-chain energy scanner
          </p>
          <h1
            className="mt-6 animate-rise font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl"
            style={{ animationDelay: "80ms" }}
          >
            Proof of <span className="text-vibe text-glow-strong">Vibe</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl animate-rise text-base text-white/55 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Drop your X handle. We scan every post about{" "}
            <span className="text-white">@vibevibefun</span> &amp; <span className="text-white">@vibevibeeco</span>,
            your Battlegrounds rank and your Robinhood testnet activity — and mint it into your Vibe card.
          </p>
        </section>

        <section className="mt-10 animate-rise sm:mt-14" style={{ animationDelay: "240ms" }}>
          <VibeScanner />
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 py-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 sm:px-8">
        Proof of Vibe · not affiliated with X Corp · stay charged ⚡
      </footer>
    </div>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(223,249,4,0.13),transparent_60%)]" />
      <div className="absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-[#6d28d9]/20 blur-[120px]" />
      <div className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-[#14532d]/30 blur-[120px]" />
      <div className="bg-grid absolute inset-0 opacity-[0.35]" />
      <div className="bg-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
