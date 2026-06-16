"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SplitWordsProps {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
  italicIndex?: number[];
}

export function SplitWords({
  text,
  className,
  stagger = 0.06,
  delay = 0,
  italicIndex = [],
}: SplitWordsProps) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline"
          style={{ marginRight: i === words.length - 1 ? 0 : "0.28em" }}
        >
          <motion.span
            className={
              "inline-block " +
              (italicIndex.includes(i) ? "italic" : "")
            }
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 1.0,
              delay: delay + i * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
