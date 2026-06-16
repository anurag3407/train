"use client";

import { useRef, type ReactNode } from "react";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export default function Magnetic({
  children,
  className,
  strength = 0.35,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `translate(0, 0)`;
  }

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={"inline-block " + (className ?? "")}
    >
      <div
        ref={ref}
        className="transition-transform duration-500 ease-smooth will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
