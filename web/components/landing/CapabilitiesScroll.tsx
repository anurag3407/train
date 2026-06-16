"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "../Reveal";

const STEPS = [
  {
    eyebrow: "01 · Ingest",
    title: "Eight thousand incidents, indexed.",
    body: "Every closure, breakdown, procession, and pothole — geo-tagged, time-stamped, severity-rated. Astram digests the entire Bengaluru event ledger and treats each row as a learning sample.",
    chip: "8,173 events · 5 months · 22 corridors",
  },
  {
    eyebrow: "02 · Predict",
    title: "Three models, one verdict.",
    body: "A duration regressor estimates how long the disruption will last. A closure classifier flags whether traffic must be diverted. A four-class severity model decides priority. Together they answer the operator's question before it's asked.",
    chip: "Severity 71% · Closure AUC 0.80 · Duration ±53m",
  },
  {
    eyebrow: "03 · Deploy",
    title: "A plan, not a probability.",
    body: "Numbers don't move barricades — plans do. Astram converts forecasts into specific manpower counts, barricade quantities, and a diversion strategy tuned to the cause and corridor.",
    chip: "Auditable rules · Tunable thresholds",
  },
];

export default function CapabilitiesScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // 3 segments mapped to scroll progress.
  const activeFloat = useTransform(scrollYProgress, [0, 1], [0, STEPS.length]);
  const activeIndex = useTransform(activeFloat, (v) =>
    Math.min(STEPS.length - 1, Math.floor(v)),
  );

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="relative bg-ink-950"
      style={{ minHeight: `${STEPS.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-12 gap-8 px-6 lg:px-10">
          {/* Left: copy column */}
          <div className="col-span-12 lg:col-span-6">
            <div className="eyebrow mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-accent-400" />
              <span>How it works</span>
            </div>

            <div className="relative h-[420px]">
              {STEPS.map((s, i) => (
                <StepCopy key={s.title} step={s} activeIndex={activeIndex} i={i} />
              ))}
            </div>

            {/* Progress rail */}
            <div className="mt-12 flex items-center gap-3">
              {STEPS.map((_, i) => (
                <ProgressTick key={i} i={i} activeIndex={activeIndex} />
              ))}
            </div>
          </div>

          {/* Right: visual column */}
          <div className="col-span-12 lg:col-span-6">
            <div className="relative aspect-[5/4] w-full">
              {STEPS.map((s, i) => (
                <StepVisual key={i} i={i} activeIndex={activeIndex} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- step copy ---------------- */

function StepCopy({
  step,
  i,
  activeIndex,
}: {
  step: (typeof STEPS)[number];
  i: number;
  activeIndex: any;
}) {
  const opacity = useTransform(activeIndex, (v: number) =>
    v === i ? 1 : 0,
  );
  const y = useTransform(activeIndex, (v: number) =>
    v === i ? 0 : v < i ? 30 : -30,
  );
  return (
    <motion.div
      style={{ opacity, y }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0"
    >
      <div className="text-[11px] uppercase tracking-[0.35em] text-accent-400">
        {step.eyebrow}
      </div>
      <h3 className="display mt-6 max-w-[18ch] text-[clamp(40px,5.5vw,76px)] text-ink-100">
        {step.title}
      </h3>
      <p className="mt-6 max-w-[44ch] text-balance text-[17px] leading-[1.55] text-ink-300">
        {step.body}
      </p>
      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-300">
        {step.chip}
      </div>
    </motion.div>
  );
}

function ProgressTick({ i, activeIndex }: { i: number; activeIndex: any }) {
  const width = useTransform(activeIndex, (v: number) =>
    v >= i ? 56 : 16,
  );
  const opacity = useTransform(activeIndex, (v: number) => (v >= i ? 1 : 0.4));
  return (
    <motion.div
      style={{ width, opacity }}
      className="h-px bg-accent-400 transition-all"
    />
  );
}

/* ---------------- step visuals ---------------- */

function StepVisual({ i, activeIndex }: { i: number; activeIndex: any }) {
  const opacity = useTransform(activeIndex, (v: number) =>
    v === i ? 1 : 0,
  );
  const scale = useTransform(activeIndex, (v: number) =>
    v === i ? 1 : 0.94,
  );
  return (
    <motion.div
      style={{ opacity, scale }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0"
    >
      {i === 0 && <IngestVisual />}
      {i === 1 && <PredictVisual />}
      {i === 2 && <DeployVisual />}
    </motion.div>
  );
}

/* visual 1: dot grid + clustered points */
function IngestVisual() {
  const dots = Array.from({ length: 320 });
  return (
    <div className="glass relative h-full w-full overflow-hidden rounded-[32px] p-8">
      <div
        className="absolute inset-6 grid gap-3 opacity-60"
        style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}
      >
        {dots.map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.4, 0.05] }}
            transition={{
              duration: 4 + (i % 6),
              delay: (i % 30) * 0.04,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-1 w-1 rounded-full bg-ink-200"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,212,164,0.18),transparent_60%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
          /data/events.csv
        </div>
        <div>
          <div className="font-display text-[64px] leading-none text-ink-100">
            8,173
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-ink-400">
            rows ingested
          </div>
        </div>
      </div>
    </div>
  );
}

/* visual 2: three pulsing model nodes converging */
function PredictVisual() {
  return (
    <div className="glass relative h-full w-full overflow-hidden rounded-[32px] p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(124,92,255,0.20),transparent_55%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
          model graph
        </div>
        <div className="flex-1">
          <svg viewBox="0 0 400 320" className="h-full w-full">
            <defs>
              <linearGradient id="edge" x1="0" x2="1">
                <stop offset="0%" stopColor="#22d4a4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* edges */}
            {[
              ["M60,80 C160,80 240,160 320,160"],
              ["M60,160 C160,160 240,160 320,160"],
              ["M60,240 C160,240 240,160 320,160"],
            ].map((d, k) => (
              <motion.path
                key={k}
                d={d[0]}
                fill="none"
                stroke="url(#edge)"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.2 + k * 0.2, ease: "easeOut" }}
              />
            ))}
            {/* model nodes */}
            {[
              { x: 60, y: 80, label: "duration" },
              { x: 60, y: 160, label: "closure" },
              { x: 60, y: 240, label: "severity" },
            ].map((n, k) => (
              <g key={k}>
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r="10"
                  fill="#0d111c"
                  stroke="#5cf2c2"
                  strokeWidth="1.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + k * 0.2, type: "spring" }}
                />
                <text
                  x={n.x + 20}
                  y={n.y + 4}
                  className="fill-ink-200"
                  style={{ font: "500 12px Inter" }}
                >
                  {n.label}
                </text>
              </g>
            ))}
            {/* output */}
            <motion.circle
              cx="320"
              cy="160"
              r="18"
              fill="#22d4a4"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 1.2, duration: 0.7 }}
            />
            <text
              x="320"
              y="200"
              textAnchor="middle"
              className="fill-ink-100"
              style={{ font: "500 12px Inter" }}
            >
              verdict
            </text>
          </svg>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-[44px] leading-none text-accent-400">
              0.80
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-400">
              closure auc
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[44px] leading-none text-plasma-400">
              71%
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-400">
              severity acc
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* visual 3: deployment card mock */
function DeployVisual() {
  return (
    <div className="glass relative h-full w-full overflow-hidden rounded-[32px] p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,138,60,0.16),transparent_55%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
          deployment plan
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { k: "14", v: "constables", tone: "ink-100" },
            { k: "8", v: "barricades", tone: "ink-100" },
            { k: "1", v: "tow truck", tone: "ink-100" },
            { k: "1", v: "pump unit", tone: "ink-100" },
          ].map((d, i) => (
            <motion.div
              key={d.v}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-xl border border-white/5 bg-ink-900/50 px-4 py-3"
            >
              <div className="font-display text-[36px] leading-none text-ink-100">
                {d.k}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-ink-400">
                {d.v}
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-5 rounded-xl border border-warn-500/30 bg-warn-500/10 p-4"
        >
          <div className="text-[10px] uppercase tracking-widest text-warn-400">
            diversion
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-100">
            Soft-divert ORR East 1 traffic via Bellary Road parallel. Hold
            cross-flow 500 m upstream during peak window.
          </p>
        </motion.div>
        <div className="mt-auto flex items-center justify-between text-[11px] text-ink-400">
          <span>generated 2.1s ago</span>
          <span className="text-accent-400">auto-tuned</span>
        </div>
      </div>
    </div>
  );
}
