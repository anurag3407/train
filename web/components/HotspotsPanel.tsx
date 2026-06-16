"use client";

import { useMemo } from "react";
import type { Hotspot, Metadata } from "@/lib/types";
import { prettifyCause } from "@/lib/ui";

interface HotspotsPanelProps {
  metadata: Metadata | null;
  hour: number;
  setHour: (h: number) => void;
  corridor: string;
  setCorridor: (c: string) => void;
  hotspots: Hotspot[];
  loading: boolean;
  highlight: string | null;
  setHighlight: (id: string | null) => void;
  onPickHotspot: (h: Hotspot) => void;
}

export default function HotspotsPanel(props: HotspotsPanelProps) {
  const {
    metadata,
    hour,
    setHour,
    corridor,
    setCorridor,
    hotspots,
    loading,
    highlight,
    setHighlight,
    onPickHotspot,
  } = props;

  const corridorOptions = useMemo(
    () => ["", ...(metadata?.corridors ?? [])],
    [metadata],
  );

  const maxCount = useMemo(
    () => Math.max(1, ...hotspots.map((h) => h.event_count)),
    [hotspots],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-ink-400">
            Historical Hotspots
          </div>
          <div className="font-mono text-sm text-ink-200">
            hour {String(hour).padStart(2, "0")}:00 · {hotspots.length} sites
          </div>
        </div>
        <select
          value={corridor}
          onChange={(e) => setCorridor(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-200 outline-none focus:border-accent-500/60"
        >
          {corridorOptions.map((c) => (
            <option key={c || "__all__"} value={c}>
              {c || "All corridors"}
            </option>
          ))}
        </select>
      </div>

      {/* Hour scrubber */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="hour-slider w-full accent-accent-500"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-500">
          {[0, 4, 8, 12, 16, 20, 23].map((h) => (
            <span key={h} className={h === hour ? "text-accent-400" : ""}>
              {String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="mt-4 flex-1 overflow-y-auto scroll-thin pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-ink-700 bg-ink-800/50"
              />
            ))}
          </div>
        ) : hotspots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-700 bg-ink-900/40 p-6 text-center text-xs text-ink-400">
            No hotspots match this filter.
          </div>
        ) : (
          <ul className="space-y-2">
            {hotspots.map((h) => {
              const id = `${h.corridor}|${h.junction}|${h.hour}`;
              const active = highlight === `${h.corridor}|${h.junction}`;
              const ratio = h.event_count / maxCount;
              const risk =
                h.closure_rate > 0.2
                  ? "danger"
                  : h.avg_duration_min > 240
                    ? "warn"
                    : "ok";
              const riskBar = {
                ok: "bg-accent-500",
                warn: "bg-warn-500",
                danger: "bg-danger-500",
              }[risk];
              return (
                <li
                  key={id}
                  onMouseEnter={() =>
                    setHighlight(`${h.corridor}|${h.junction}`)
                  }
                  onMouseLeave={() => setHighlight(null)}
                  onClick={() => onPickHotspot(h)}
                  className={
                    "group relative cursor-pointer rounded-lg border bg-ink-900/50 p-3 transition " +
                    (active
                      ? "border-accent-500/60 shadow-glow"
                      : "border-ink-700 hover:border-ink-500")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] uppercase tracking-wider text-ink-400">
                        {h.corridor}
                      </div>
                      <div className="truncate text-sm font-medium text-ink-200">
                        {h.junction === "unknown" ? "Corridor segment" : h.junction}
                      </div>
                      <div className="mt-1 text-[11px] text-ink-400">
                        top cause:{" "}
                        <span className="text-accent-400">
                          {prettifyCause(h.top_cause)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-ink-100">
                        {h.event_count}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">
                        events
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-ink-400">
                    <Stat label="avg" value={`${Math.round(h.avg_duration_min)}m`} />
                    <Stat
                      label="closure"
                      value={`${Math.round(h.closure_rate * 100)}%`}
                    />
                    <Stat
                      label="hi-prio"
                      value={`${Math.round(h.high_priority_rate * 100)}%`}
                    />
                  </div>

                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-800">
                    <div
                      className={"h-full " + riskBar}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900/40 px-1.5 py-1 text-center">
      <div className="text-[9px] uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="font-mono text-[11px] text-ink-200">{value}</div>
    </div>
  );
}
