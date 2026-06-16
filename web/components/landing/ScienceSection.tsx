"use client";

import { Reveal } from "../Reveal";

const MODELS = [
  {
    name: "Duration",
    family: "HistGradientBoostingRegressor",
    target: "log1p(minutes)",
    metric: "± 53 m median",
    metricSub: "R² 0.42 · MAE(log) 1.26",
    color: "from-accent-400 to-accent-600",
  },
  {
    name: "Closure",
    family: "HistGradientBoostingClassifier",
    target: "binary",
    metric: "AUC 0.80",
    metricSub: "F1 0.45 · Acc 0.89",
    color: "from-plasma-400 to-plasma-600",
  },
  {
    name: "Severity",
    family: "HistGradientBoostingClassifier",
    target: "Low / Medium / High / Critical",
    metric: "71% accuracy",
    metricSub: "F1w 0.71 · 4 classes",
    color: "from-warn-400 to-warn-600",
  },
];

const FEATURES = [
  "event_type",
  "event_cause",
  "priority",
  "corridor",
  "zone",
  "gba_identifier",
  "police_station",
  "veh_type",
  "hour · dow · month",
  "is_morning_peak",
  "is_evening_peak",
  "is_night",
  "lat · lon",
  "dist_from_center_km",
  "hour_sin · hour_cos",
  "dow_sin · dow_cos",
  "corridor_event_rate",
  "junction_event_rate",
  "cause_avg_duration",
];

export default function ScienceSection() {
  return (
    <section
      id="science"
      className="relative overflow-hidden bg-ink-950 py-32"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px glow-line opacity-40" />
      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <Reveal>
              <div className="eyebrow flex items-center gap-3">
                <span className="h-px w-10 bg-plasma-400" />
                <span>The science underneath</span>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display mt-8 max-w-[18ch] text-[clamp(44px,6vw,84px)] text-ink-100">
                Three models <em>trained</em> on the city itself.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-[42ch] text-[16px] leading-relaxed text-ink-300">
                We don't pretend a single regressor can do everything. Astram
                splits the question — how bad, how long, how likely to block —
                into three honest sub-problems, each tuned on five months of
                Bengaluru's own incident ledger.
              </p>
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MODELS.map((m, i) => (
                <Reveal key={m.name} delay={0.08 * i}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/5 bg-ink-900/50 p-6 transition hover:-translate-y-1 hover:border-white/10">
                    <div
                      className={
                        "absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r " +
                        m.color
                      }
                    />
                    <div className="text-[10px] uppercase tracking-[0.3em] text-ink-400">
                      Model
                    </div>
                    <div className="mt-1 font-display text-[36px] leading-tight text-ink-100">
                      {m.name}
                    </div>
                    <div className="mt-3 font-mono text-[11px] text-ink-400">
                      {m.family}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-ink-500">
                      → {m.target}
                    </div>
                    <div className="mt-6 border-t border-white/5 pt-4">
                      <div className="font-display text-[28px] text-accent-400">
                        {m.metric}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-400">
                        {m.metricSub}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* Feature panel */}
        <Reveal delay={0.1}>
          <div className="glass mt-20 rounded-[28px] p-8 lg:p-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow">Feature stack</div>
                <h3 className="display mt-3 text-[clamp(28px,3.5vw,46px)] text-ink-100">
                  {FEATURES.length} engineered features per event
                </h3>
              </div>
              <div className="font-mono text-[11px] text-ink-400">
                src/features.py · NUMERIC + CATEGORICAL
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-white/5 bg-ink-900/60 px-3 py-1.5 font-mono text-[11px] text-ink-200 transition hover:border-accent-500/40 hover:text-accent-400"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
