"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Magnetic from "../Magnetic";
import { Reveal, SplitWords } from "../Reveal";

const CORRIDORS = [
  "ORR East 1",
  "Mysore Road",
  "Hosur Road",
  "Tumkur Road",
  "Bellary Road",
  "Old Madras Road",
  "Magadi Road",
  "Bannerghata Road",
  "Hennur Main Road",
  "Old Airport Road",
  "ORR North 2",
  "Sankey Road",
];

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const subY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const blobY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-ink-950 pt-32"
    >
      {/* Ambient gradients */}
      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[820px] w-[1100px] -translate-x-1/2 rounded-full"
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,212,164,0.20),transparent_60%)] blur-3xl" />
        <div className="absolute inset-12 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,92,255,0.16),transparent_55%)] blur-3xl" />
      </motion.div>

      {/* Grid backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid [background-size:48px_48px] opacity-[0.07]" />

      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        {/* Eyebrow */}
        <Reveal>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-ink-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent-400 opacity-70" />
              <span className="absolute inset-0 rounded-full bg-accent-400" />
            </span>
            <span>Bengaluru · Predictive Traffic Operations Stack</span>
          </div>
        </Reveal>

        {/* Headline */}
        <motion.h1
          style={{ y: titleY, opacity: titleOpacity }}
          className="display mt-8 max-w-[18ch] text-[clamp(56px,10vw,168px)] text-ink-100"
        >
          <SplitWords text="Forecast the" stagger={0.04} />
          <br />
          <SplitWords
            text="city's chaos."
            stagger={0.06}
            delay={0.15}
            italicIndex={[0, 1]}
          />
        </motion.h1>

        {/* Subtitle + actions */}
        <motion.div
          style={{ y: subY }}
          className="mt-10 grid grid-cols-12 gap-y-10"
        >
          <Reveal delay={0.4} className="col-span-12 lg:col-span-7">
            <p className="max-w-[44ch] text-balance text-[18px] leading-[1.5] text-ink-300">
              Astram turns every political rally, festival, accident, and downed
              tree into a quantified impact forecast — and a deployable plan.
              Manpower, barricading, and diversion routes, prepared{" "}
              <em className="font-display italic text-accent-400">
                before
              </em>{" "}
              the gridlock starts.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Magnetic strength={0.3}>
                <Link
                  href="/console"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-ink-100 px-7 py-4 text-sm font-medium text-ink-950 transition hover:shadow-glow"
                >
                  <span className="relative z-10">Open the live console</span>
                  <span className="relative z-10 transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-accent-400 via-accent-500 to-plasma-500 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </Magnetic>
              <a
                href="#capabilities"
                className="group inline-flex items-center gap-2 text-sm text-ink-300 link-underline hover:text-ink-100"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-400" />
                See the science
              </a>
            </div>
          </Reveal>

          {/* Right metrics card */}
          <Reveal delay={0.55} className="col-span-12 lg:col-span-5">
            <HeroLiveCard />
          </Reveal>
        </motion.div>

        {/* Stat band */}
        <div className="mt-24 grid grid-cols-2 gap-y-10 border-y border-white/5 py-10 lg:grid-cols-4">
          {[
            { k: "8,173", v: "events analysed" },
            { k: "22", v: "city corridors covered" },
            { k: "294", v: "junctions indexed" },
            { k: "~53m", v: "median forecast error" },
          ].map((s, i) => (
            <Reveal key={s.v} delay={0.05 * i}>
              <div className="px-2">
                <div className="font-display text-[clamp(36px,5vw,60px)] leading-none tracking-tightest text-ink-100">
                  {s.k}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.25em] text-ink-400">
                  {s.v}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Corridor marquee */}
      <div className="relative mt-24 overflow-hidden">
        <div className="marquee py-6">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {[...CORRIDORS, ...CORRIDORS].map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-4 font-display text-[clamp(48px,7vw,96px)] italic text-ink-100/15 transition hover:text-ink-100"
              >
                <span>{c}</span>
                <span className="text-accent-400/40">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="flex justify-center pb-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-ink-400"
        >
          <span>scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-px bg-gradient-to-b from-ink-400 to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}

function HeroLiveCard() {
  return (
    <div className="relative">
      <div className="glass relative overflow-hidden rounded-[28px] p-6 shadow-soft">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-ink-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400" />
            Live forecast · ORR East 1
          </div>
          <div>17:42 ist</div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400">
              predicted severity
            </div>
            <div className="font-display text-[72px] leading-none text-warn-400">
              High
            </div>
          </div>
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 64 64" className="absolute inset-0">
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#ff8a3c"
                strokeWidth="6"
                strokeDasharray={163}
                initial={{ strokeDashoffset: 163 }}
                animate={{ strokeDashoffset: 40 }}
                transition={{ duration: 1.6, ease: "easeOut", delay: 0.6 }}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center font-mono text-[11px] text-ink-200">
              76%
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCell label="Duration" value="3.1h" />
          <StatCell label="Closure" value="71%" tone="warn" />
          <StatCell label="Manpower" value="14" />
        </div>

        <div className="mt-6 rounded-xl border border-white/5 bg-ink-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">
            recommended action
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-200">
            Soft-divert through-traffic to Bellary Road parallel. Pre-position
            tow truck at Tin Factory junction. Pump unit on standby.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 text-[11px] text-ink-400">
          <span>Updated 1.4s ago</span>
          <span>·</span>
          <span className="text-accent-400">model v1.0</span>
        </div>

        {/* Decorative grid corner */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-warn-500/10 blur-3xl" />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  const v =
    tone === "warn" ? "text-warn-400" : "text-ink-100";
  return (
    <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-widest text-ink-400">
        {label}
      </div>
      <div className={"mt-1 font-mono text-lg " + v}>{value}</div>
    </div>
  );
}
