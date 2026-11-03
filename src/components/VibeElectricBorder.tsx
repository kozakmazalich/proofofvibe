"use client";

import ElectricBorder, { type ElectricBorderProps } from "./reactbits/ElectricBorder";

/**
 * Presets from the React Bits Electric Border demo
 * (https://reactbits.dev/animations/electric-border). The component itself has
 * no `preset` prop — the demo applies these overrides on top of the defaults.
 * An explicit `color` always wins over the preset color.
 */
export const ELECTRIC_PRESETS = {
  voltage: {},
  plasma: { color: "#c084fc" },
  ember: { color: "#fb923c", chaos: 0.7, flicker: 0.7 },
  emerald: { color: "#34d399", strands: 4, spread: 0.8 },
  storm: { color: "#93c5fd", strands: 5, chaos: 0.9, spread: 1.1, arcs: 2.5, flicker: 0.8, glow: 0.8 },
  silver: { color: "#e4e4e7", strands: 2, chaos: 0.25, spread: 0.3, arcs: 0, flicker: 0.15, glow: 0.4 },
} satisfies Record<string, Partial<ElectricBorderProps>>;

export type ElectricPreset = keyof typeof ELECTRIC_PRESETS;

export default function VibeElectricBorder({
  preset = "voltage",
  ...props
}: ElectricBorderProps & { preset?: ElectricPreset }) {
  const presetProps: Partial<ElectricBorderProps> = ELECTRIC_PRESETS[preset];
  const merged: ElectricBorderProps = { ...presetProps };
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return <ElectricBorder {...merged} />;
}
