"use client";

import { useState, useEffect, useRef } from "react";
import { formatINR } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  delay?: number;
}

export function AnimatedNumber({
  value,
  format,
  duration = 900,
  delay = 0,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const prev = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = started.current ? prev.current : 0;
      started.current = true;
      const end = value;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(start + (end - start) * ease));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      prev.current = value;
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, delay]);

  const fmt = format || formatINR;
  return <span className="mono">{fmt(display)}</span>;
}