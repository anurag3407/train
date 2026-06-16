import type { Severity } from "./types";

export const SEVERITY_TONE: Record<
  Severity,
  { ring: string; text: string; bg: string; dot: string }
> = {
  Low: {
    ring: "ring-accent-500/40",
    text: "text-accent-400",
    bg: "bg-accent-500/10",
    dot: "bg-accent-400",
  },
  Medium: {
    ring: "ring-warn-400/40",
    text: "text-warn-400",
    bg: "bg-warn-500/10",
    dot: "bg-warn-400",
  },
  High: {
    ring: "ring-warn-600/50",
    text: "text-warn-500",
    bg: "bg-warn-600/15",
    dot: "bg-warn-500",
  },
  Critical: {
    ring: "ring-danger-500/60",
    text: "text-danger-400",
    bg: "bg-danger-500/15",
    dot: "bg-danger-500",
  },
};

export function severityHex(sev: Severity): string {
  switch (sev) {
    case "Low": return "#22d4a4";
    case "Medium": return "#ffb347";
    case "High": return "#ff6a1f";
    case "Critical": return "#ff3d3d";
  }
}

export function prettifyCause(c: string): string {
  return c
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function humanDuration(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 60 * 24) return `${(min / 60).toFixed(1)} h`;
  return `${(min / (60 * 24)).toFixed(1)} d`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
