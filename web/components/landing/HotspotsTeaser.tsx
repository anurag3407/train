"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "../Reveal";
import { api } from "@/lib/api";
import { prettifyCause } from "@/lib/ui";
import type { Hotspot } from "@/lib/types";

export default function HotspotsTeaser() {
  const [hour, setHour] = useState<number>(20);
  const [items, setItems] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUp, setApiUp] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .hotspots({ hour, top: 6, min_events: 3 })
      .then((d) => !cancelled && setItems(d))
      .catch(() => {
        if (!cancelled) {
          setApiUp(false);
          setItems([]);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hour]);

  return (
    <section
      id="hotspots"
      className="relative overflow-hidden bg-ink-950 py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-30" />
      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <div className="grid grid-cols-12 items-end gap-8">
          <div className="col-span-12 lg:col-span-7">
            <Reveal>
              <div className="eyebrow flex items-center gap-3">
                <span className="h-px w-10 bg-warn-400" />
                <span>Historical hotspots</span>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display mt-6 max-w-[20ch] text-[clamp(40px,5.5vw,72px)] text-ink-100">
                The city tells you <em>where it breaks.</em>
              </h2>
            </Reveal>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-white/5 bg-ink-900/40 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
                    hour of day
                  </div>
                  <div className="font-display text-2xl text-accent-400">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="mt-4 w-full accent-accent-500"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-500">
                  {[0, 6, 12, 18, 23].map((h) => (
                    <span key={h}>{String(h).padStart(2, "0")}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {!apiUp ? (
          <div className="mt-10 rounded-2xl border border-danger-500/30 bg-danger-500/10 p-6 text-sm text-danger-400">
            FastAPI service offline. Start it with{" "}
            <code className="font-mono text-danger-400">
              uvicorn src.api:app --port 8000
            </code>{" "}
            from the project root to see live hotspots.
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(loading ? Array.from({ length: 6 }) : items).map((it: any, i) => (
              <motion.div
                key={loading ? i : `${it.corridor}-${it.junction}-${i}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-2xl p-5 transition hover:-translate-y-1"
              >
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-ink-700/60" />
                    <div className="h-6 w-2/3 animate-pulse rounded bg-ink-700/40" />
                    <div className="h-12 animate-pulse rounded bg-ink-700/30" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[10px] uppercase tracking-widest text-ink-400">
                          {it.corridor}
                        </div>
                        <div className="mt-1 truncate font-display text-xl text-ink-100">
                          {it.junction === "unknown"
                            ? "Corridor segment"
                            : it.junction}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl text-accent-400">
                          {it.event_count}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-ink-400">
                          events
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-1 text-center">
                      {[
                        { l: "avg", v: `${Math.round(it.avg_duration_min)}m` },
                        { l: "closure", v: `${Math.round(it.closure_rate * 100)}%` },
                        { l: "hi-prio", v: `${Math.round(it.high_priority_rate * 100)}%` },
                      ].map((cell) => (
                        <div key={cell.l} className="rounded-md border border-white/5 bg-ink-900/40 py-2">
                          <div className="text-[9px] uppercase tracking-widest text-ink-400">
                            {cell.l}
                          </div>
                          <div className="font-mono text-[12px] text-ink-100">
                            {cell.v}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-[11px] text-ink-400">
                      top cause:{" "}
                      <span className="text-accent-400">
                        {prettifyCause(it.top_cause)}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
