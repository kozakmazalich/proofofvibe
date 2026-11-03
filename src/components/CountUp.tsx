"use client";

import { useEffect, useRef, useState } from "react";
import { formatCompact, formatFull } from "@/lib/format";

interface CountUpProps {
  value: number;
  duration?: number;
  delay?: number;
  compact?: boolean;
  prefix?: string;
}

/** Animated number that counts up from 0 once mounted (respects reduced motion). */
export default function CountUp({ value, duration = 1400, delay = 0, compact = true, prefix = "" }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf.current = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf.current);
    }
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, delay]);

  const text = compact && value >= 10_000 ? formatCompact(display) : formatFull(display);
  return (
    <span className="tabular-nums" title={formatFull(value)}>
      {prefix}
      {text}
    </span>
  );
}
