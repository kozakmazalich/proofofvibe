"use client";

import { useEffect, useRef, useState } from "react";
import Lightning from "./reactbits/Lightning";

interface LightningStrikeProps {
  phase: "loading" | "success" | "error";
  /** Fired once the bolt has travelled all the way down — the card appears after this. */
  onLanded: () => void;
}

/** Constant travel speed of the bolt tip AND of the scroll that follows it (px per ms). Durations are derived from
 *  real pixel distances, so every screen size/orientation gets the same feel. */
const SPEED = 0.5;

/** The bolt tip is pinned this far down the viewport (1 = bottom edge) once it gets there. */
const TIP_ANCHOR = 0.97;

/** The card ends up this far from the top of the viewport (fraction of viewport height). */
const CARD_TOP_AT = 0.12;

/**
 * React Bits <Lightning /> (https://reactbits.dev/backgrounds/lightning?color=dff904)
 * in a channel one screen tall, starting at the Electric Border's bottom edge.
 *
 * ONE continuous, constant-speed motion (no easing, never stops):
 *   1. the bolt runs straight down to the bottom edge of the screen;
 *   2. from there the page scrolls with the tip (tip pinned to the bottom edge);
 *   3. the moment it reaches the end of the channel → onLanded(): the card appears (revealed
 *      top → bottom) as the continuation of that same movement — the scroll keeps going at the
 *      same speed until the card is in place. The bolt stays visible, connected to the card.
 * One rAF loop drives the mask and the scroll from the same clock. If the user scrolls
 * themselves, auto-scroll stops.
 */
export default function LightningStrike({ phase, onLanded }: LightningStrikeProps) {
  const channelRef = useRef<HTMLDivElement>(null);
  const onLandedRef = useRef(onLanded);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    onLandedRef.current = onLanded;
  });

  useEffect(() => {
    const el = channelRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startY = window.scrollY;
    const channelTop = el.getBoundingClientRect().top + window.scrollY;

    let userTookOver = false;
    const takeOver = () => {
      userTookOver = true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) takeOver();
    };
    window.addEventListener("wheel", takeOver, { passive: true });
    window.addEventListener("touchmove", takeOver, { passive: true });
    window.addEventListener("keydown", onKey);

    // Scroll positions are recomputed every frame from live layout, so resizes / rotation / late layout are handled.
    const geometry = () => {
      const vh = window.innerHeight;
      const h = el.offsetHeight;
      const bottom = channelTop + h;
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      return {
        h,
        // scroll offset that pins the tip at the bottom edge when the bolt has fully landed
        landY: Math.min(maxY, Math.max(startY, bottom - vh * TIP_ANCHOR)),
        // final scroll offset: card in place
        cardY: Math.min(maxY, Math.max(startY, bottom - vh * CARD_TOP_AT)),
        pinned: (p: number) => Math.min(maxY, Math.max(startY, channelTop + h * p - vh * TIP_ANCHOR)),
      };
    };

    let raf = 0;
    let landedAt = 0;
    const t0 = performance.now();
    const g0 = geometry();
    const descentMs = reduced ? 0 : g0.h / SPEED;

    const tick = (now: number) => {
      const g = geometry();
      const elapsed = now - t0;
      const p = descentMs === 0 ? 1 : Math.min(1, elapsed / descentMs); // linear → constant speed
      el.style.setProperty("--p", String(p));

      if (p < 1) {
        if (!userTookOver) window.scrollTo({ top: g.pinned(p), behavior: "instant" });
        raf = requestAnimationFrame(tick);
        return;
      }

      // Landed: the card appears — and the very same scroll keeps going.
      if (!landedAt) {
        landedAt = now;
        setLanded(true);
        onLandedRef.current();
      }
      if (userTookOver) return;
      if (reduced) {
        window.scrollTo({ top: g.cardY, behavior: "instant" });
        return;
      }
      const target = Math.min(g.cardY, g.landY + (now - landedAt) * SPEED);
      window.scrollTo({ top: Math.max(window.scrollY, target), behavior: "instant" });
      // keep going until the card is in place (cap guards against layout that never gets tall enough)
      if (target < g.cardY && now - landedAt < 4000) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchmove", takeOver);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const loading = phase === "loading";
  const error = phase === "error";
  const color = error ? "#ff4d6d" : "#dff904";

  return (
    <div
      ref={channelRef}
      className="pointer-events-none relative z-[5] mx-auto -mb-3 -mt-2 h-[100dvh] min-h-[520px] w-full max-w-md"
      style={{ ["--p" as string]: 0 }}
      aria-hidden="true"
    >
      {/* Horizontal fade so the canvas edges never show */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(90deg, transparent, #000 32%, #000 68%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 32%, #000 68%, transparent)",
        }}
      >
        {/* Vertical reveal driven by --p: the bolt grows from the search bar down to the landing spot */}
        <div className="bolt-descend absolute inset-0">
          {/* One thin, clean bolt — identical during the descent and after landing */}
          <Lightning
            color={color}
            bolts={1}
            spread={0.06}
            branches={0.45}
            size={1.1}
            thickness={1}
            glow={0.8}
            intensity={error ? 0.7 : 0.95}
            speed={0.9}
            flicker={0.5}
            mouseInteraction={false}
            clickStrike={false}
            intro
          />
        </div>
      </div>

      {/* Contact glow where the bolt leaves the Electric Border */}
      <div
        className="absolute -top-2 left-1/2 h-6 w-28 -translate-x-1/2 rounded-[50%] blur-xl"
        style={{ background: `${color}88` }}
      />


      {/* Impact flare on the card's top edge, once the bolt has landed */}
      {landed && (
        <div
          key={phase}
          className={`absolute -bottom-3 left-1/2 h-10 w-56 -translate-x-1/2 rounded-[50%] blur-2xl ${
            loading ? "animate-impact-pulse" : "animate-impact"
          }`}
          style={{ background: `${color}99` }}
        />
      )}
    </div>
  );
}
