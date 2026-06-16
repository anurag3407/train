"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePathname } from "next/navigation";
import Magnetic from "./Magnetic";

const NAV = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#science", label: "Science" },
  { href: "/#hotspots", label: "Hotspots" },
  { href: "/console", label: "Console" },
];

export default function SiteHeader() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 200], [0, 14]);
  const bg = useTransform(
    scrollY,
    [0, 200],
    ["rgba(7,9,18,0)", "rgba(7,9,18,0.65)"],
  );
  const border = useTransform(
    scrollY,
    [0, 200],
    ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"],
  );
  const pathname = usePathname();

  return (
    <motion.header
      style={{
        backdropFilter: useTransform(blur, (b) => `blur(${b}px)`),
        WebkitBackdropFilter: useTransform(blur, (b) => `blur(${b}px)`),
        backgroundColor: bg,
        borderBottom: useTransform(border, (b) => `1px solid ${b}`),
      }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
        >
          <div className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-md">
            <span className="absolute inset-0 bg-gradient-to-br from-accent-500 via-accent-400 to-plasma-500" />
            <span className="relative z-10 font-display text-base italic text-ink-950">a</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink-400">
              Astram
            </span>
            <span className="font-display text-[15px] text-ink-100">
              Traffic Ops
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "rounded-full px-4 py-1.5 text-[12px] uppercase tracking-[0.2em] transition " +
                  (active
                    ? "text-accent-400"
                    : "text-ink-300 hover:text-ink-100")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <Magnetic strength={0.25}>
          <Link
            href="/console"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-accent-500/40 bg-accent-500/10 px-5 py-2 text-[11px] uppercase tracking-[0.25em] text-accent-400 transition hover:bg-accent-500/20 hover:shadow-glow"
          >
            <span>Launch console</span>
            <span className="text-accent-400 transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
          </Link>
        </Magnetic>
      </div>
    </motion.header>
  );
}
