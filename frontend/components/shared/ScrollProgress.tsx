"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import type { RefObject } from "react";

interface ScrollProgressProps {
  containerRef: RefObject<HTMLElement | null>;
}

export function ScrollProgress({ containerRef }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll(
    containerRef.current
      ? {
          container: containerRef as RefObject<HTMLElement>
        }
      : undefined
  );

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    mass: 0.22
  });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, var(--accent-rose), var(--accent-gold), var(--accent-rose-deep))"
      }}
    />
  );
}
