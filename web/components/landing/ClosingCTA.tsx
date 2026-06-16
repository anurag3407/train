"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Magnetic from "../Magnetic";
import { Reveal } from "../Reveal";

export default function ClosingCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const wordY = useTransform(scrollYProgress, [0, 1], ["10%", "-30%"]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-ink-950 py-40"
    >
      <motion.div
        style={{ y: wordY }}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 select-none whitespace-nowrap text-center font-display text-[20vw] leading-none tracking-tightest text-white/[0.04]"
      >
        astram · astram
      </motion.div>

      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <Reveal>
          <div className="eyebrow flex items-center gap-3">
            <span className="h-px w-10 bg-accent-400" />
            <span>Ready to deploy</span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display mt-8 max-w-[18ch] text-[clamp(60px,9vw,140px)] text-ink-100">
            Stop reacting. <em>Start forecasting.</em>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Magnetic strength={0.3}>
              <Link
                href="/console"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-ink-100 px-8 py-5 text-sm font-medium text-ink-950 transition hover:shadow-glow"
              >
                <span className="relative z-10">Open the console</span>
                <span className="relative z-10 transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-accent-400 via-accent-500 to-plasma-500 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            </Magnetic>
            <a
              href="https://github.com/anurag3407/train"
              target="_blank"
              rel="noreferrer"
              className="link-underline text-sm text-ink-300 hover:text-ink-100"
            >
              View the source on GitHub →
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-24 grid grid-cols-12 gap-8 border-t border-white/5 pt-10 text-[12px] text-ink-400">
            <div className="col-span-6 md:col-span-3">
              <div className="eyebrow mb-3">api</div>
              <div className="font-mono">/predict</div>
              <div className="font-mono">/predict/batch</div>
              <div className="font-mono">/hotspots</div>
              <div className="font-mono">/metadata</div>
              <div className="font-mono">/health</div>
            </div>
            <div className="col-span-6 md:col-span-3">
              <div className="eyebrow mb-3">stack</div>
              <div>FastAPI · scikit-learn</div>
              <div>Next.js 14 · Tailwind</div>
              <div>Framer Motion · Lenis</div>
              <div>Mappls + Leaflet</div>
            </div>
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">dataset</div>
              <div>Astram event ledger</div>
              <div>8,173 events · 5 months</div>
              <div>Bengaluru, anonymised</div>
            </div>
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">contact</div>
              <div className="text-ink-200">
                Built for predictive traffic operations.
              </div>
            </div>
          </div>
          <div className="mt-12 flex items-center justify-between text-[11px] text-ink-500">
            <div>&copy; {new Date().getFullYear()} Astram Ops</div>
            <div className="font-mono">v1.0 · bengaluru</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
