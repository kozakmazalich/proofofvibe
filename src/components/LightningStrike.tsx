"use client";

import { useEffect, useRef, useState } from "react";
import Lightning from "./reactbits/Lightning";

interface LightningStrikeProps {
  /** "loading" keeps the bolt running down; "success" / "error" let it land. */
  phase: "loading" | "success" | "error";
  /** Fired once the bolt has landed — the card (or the error) appears right below its tip. */
  onLanded: () => void;
}

/** Constant travel speed of the bolt tip AND of the scroll that follows it (px per ms). Durations are derived from
 *  real pixel distances, so every screen size/orientation gets the same feel. */
const SPEED = 0.5;

/** The bolt tip is pinned this far down the viewport (1 = bottom edge) once it gets there. */
const TIP_ANCHOR = 0.97;

/** The card ends up this far from the top of the viewport (fraction of viewport height). */
const CARD_TOP_AT = 0.12;

/** Safety cap so a hung request can't scroll the page forever (12 000 px ≈ 24 s of travel). */
const MAX_TRAVEL = 12_000;

/** The canvas starts exactly at the channel top (the bottom edge of the username block) — nothing sits behind the bar. */
const TOP_OVERLAP = 0;

/** Soft fade at the tip while the bolt is still on its way down (px). */
const TIP_FEATHER = 70;

/**
 * React Bits <Lightning /> (https://reactbits.dev/backgrounds/lightning?color=dff904) leading the page down.
 *
 * The bolt keeps running down — and the page keeps scrolling after it — UNTIL ALL DATA HAS LOADED:
 *   1. the bolt runs straight down from the Electric Border to the bottom edge of the screen;
 *   2. from there the page scrolls with the tip (tip pinned to the bottom edge) for as long as loading lasts;
 *   3. once the data is in (and the bolt has covered at least one screen) → onLanded(): the card appears
 *      below the tip, revealed top → bottom, and the same scroll carries it into place. No placeholder card.
 *   4. At that moment the channel COLLAPSES to exactly one screen (scroll position compensated, so nothing
 *      moves on screen) and the canvas covers all of it: the bolt then runs unbroken from the username
 *      block to the card, no matter how long the loading took.
 *
 * Implementation notes
 *   - The Lightning canvas is ONE SCREEN tall (its shader normalises sizes by height, so stretching it would
 *     distort the bolt). The visible bolt is the canvas clipped to a container that grows with the travel
 *     distance; the canvas slides down with the tip (smoothly) so it always covers the viewport.
 *   - One rAF loop drives growth, canvas offset and scroll from the same clock (constant speed, no easing).
 *   - If the user scrolls themselves, auto-scroll stops (the bolt still lands normally).
 */
export default function LightningStrike({ phase, onLanded }: LightningStrikeProps) {
  const channelRef = useRef<HTMLDivElement>(null);
  const boltRef = useRef<HTMLDivElement>(null);
  /**
   * Shift of the bolt PATTERN inside the canvas (px). It always equals the canvas offset, so while the canvas
   * slides down to follow the tip, the drawn bolt stays glued to the page and scrolls with it — the bolt keeps
   * visibly moving however long loading takes. Frozen at landing so the picture does not change.
   */
  const patternShift = useRef(0);
  const phaseRef = useRef(phase);
  const onLandedRef = useRef(onLanded);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
    onLandedRef.current = onLanded;
  });

  useEffect(() => {
    const el = channelRef.current;
    const bolt = boltRef.current;
    if (!el || !bolt) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startY = window.scrollY;
    const channelTop = el.getBoundingClientRect().top + window.scrollY;

    // Auto-scroll stops only when the user DELIBERATELY scrolls. Not on:
    //  - trackpad / mouse-wheel inertia still coming from the scroll that brought them up to the search bar
    //    (macOS keeps sending decaying wheel events for ~1–2 s after the fingers leave the trackpad);
    //  - keys typed into an input (e.g. a space in the username field).
    let userTookOver = false;
    const startedAt = performance.now();
    const IGNORE_MS = 1200; // inertia window right after "Search"
    let wheelWindow = 0;
    let wheelSum = 0;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now - startedAt < IGNORE_MS) return;
      if (now - wheelWindow > 350) {
        wheelWindow = now;
        wheelSum = 0;
      }
      wheelSum += Math.abs(e.deltaY);
      if (wheelSum > 260) userTookOver = true; // a real, intentional scroll gesture
    };
    const onTouchMove = () => {
      if (performance.now() - startedAt > 400) userTookOver = true;
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) userTookOver = true;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let landedAt = 0;
    let landScrollY = 0; // scroll position right after the collapse; the final scroll continues from here
    let travel = 0; // px the bolt tip has travelled below the channel top
    const t0 = performance.now();

    /** Scroll offset that pins the tip at TIP_ANCHOR of the viewport; clamped to the document. */
    const pinnedY = (t: number, vh: number) => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      return Math.min(maxY, Math.max(startY, channelTop + t - vh * TIP_ANCHOR));
    };

    /**
     * Canvas offset inside the growing container. Page-anchored (0) while the tip is within the first screen,
     * then it follows the tip (travel − vh). Blended with a quadratic ease so there is no sudden stop.
     */
    const canvasOffset = (t: number, vh: number) => {
      const x = t - vh; // canvas spans [-TOP_OVERLAP, vh] + offset, so it still covers the tip at offset = travel − vh
      const w = vh * 0.25;
      if (x <= -w) return 0;
      if (x >= w) return x;
      return ((x + w) * (x + w)) / (4 * w);
    };

    const tick = (now: number) => {
      const vh = window.innerHeight;
      const minTravel = vh; // like before: at least one screen, even if the data is instant

      if (!landedAt) {
        travel = reduced ? minTravel : Math.min(MAX_TRAVEL, (now - t0) * SPEED);
        if (phaseRef.current !== "loading" && travel >= minTravel) {
          // Collapse the channel to one screen so the bolt is continuous from the username block to the card.
          // The scroll is compensated by exactly what the canvas offset / removed length shifted, so on screen
          // the bolt and the tip do not move at this instant.
          const y0 = window.scrollY; // read BEFORE shrinking: the browser clamps scrollY as soon as the page gets shorter
          const fOld = canvasOffset(travel, vh);
          patternShift.current = fOld; // keep exactly the same picture through the collapse
          const excess = travel - minTravel;
          travel = minTravel;
          el.style.height = `${travel}px`;
          bolt.style.transform = "translate3d(0, 0, 0)";
          if (!reduced) {
            window.scrollTo({ top: Math.max(0, userTookOver ? y0 - excess : y0 - fOld), behavior: "instant" });
          }
          landScrollY = window.scrollY;
          landedAt = now;
          setLanded(true);
          onLandedRef.current();
        }
      }

      el.style.height = `${travel}px`;
      const offset = landedAt ? 0 : canvasOffset(travel, vh);
      bolt.style.transform = `translate3d(0, ${offset}px, 0)`;
      if (!landedAt) patternShift.current = offset;

      if (!landedAt) {
        // still loading → keep running down; the page scrolls with the tip
        if (!userTookOver && !reduced) window.scrollTo({ top: pinnedY(travel, vh), behavior: "instant" });
        raf = requestAnimationFrame(tick);
        return;
      }

      // Landed: the card appears — and the very same constant-speed scroll carries it into place.
      if (userTookOver) return;
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      const cardY = Math.min(maxY, Math.max(startY, channelTop + travel - vh * CARD_TOP_AT));
      if (reduced) {
        window.scrollTo({ top: cardY, behavior: "instant" });
        return;
      }
      const target = Math.min(cardY, landScrollY + (now - landedAt) * SPEED);
      window.scrollTo({ top: Math.max(window.scrollY, target), behavior: "instant" });
      // keep going until the card is in place (cap guards against layout that never gets tall enough)
      if (target < cardY && now - landedAt < 4000) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const loading = phase === "loading";
  const error = phase === "error";
  const color = error ? "#ff4d6d" : "#dff904";
  const feather = `linear-gradient(to bottom, #000 calc(100% - ${TIP_FEATHER}px), transparent)`;

  return (
    <div
      ref={channelRef}
      className="pointer-events-none relative z-[5] mx-auto -mb-3 -mt-2 w-full max-w-md"
      style={{ height: 0 }}
      aria-hidden="true"
    >
      {/* Clip: shows exactly the part of the bolt that has "travelled" so far. Soft tip while it is still running. */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{
          top: -TOP_OVERLAP,
          ...(landed ? {} : { maskImage: feather, WebkitMaskImage: feather }),
        }}
      >
        {/* One screen tall canvas (+ the overlap above the channel) that slides down with the tip */}
        <div
          ref={boltRef}
          className="absolute inset-x-0 top-0 will-change-transform"
          style={{ height: `calc(max(100dvh, 520px) + ${TOP_OVERLAP}px)` }}
        >
          {/* Horizontal fade so the canvas edges never show */}
          <div
            className="h-full w-full"
            style={{
              maskImage: "linear-gradient(90deg, transparent, #000 32%, #000 68%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 32%, #000 68%, transparent)",
            }}
          >
            {/* One thin, clean bolt — identical while running and after landing */}
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
              // The shader's own top→bottom "intro" reveal would stack on top of our growing container and keep the
              // start of the bolt dim for the first ~second. The container already reveals it, so it is off.
              intro={false}
              scrollRef={patternShift}
            />
          </div>
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
