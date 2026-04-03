"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Bubble = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  shape: "circle" | "rounded" | "diamond";
};

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

const bubblePalette = [
  "rgba(255, 182, 170, 0.74)",
  "rgba(255, 223, 173, 0.72)",
  "rgba(214, 238, 226, 0.72)",
  "rgba(221, 230, 255, 0.7)"
];

export function CuteInteractionLayer({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const spawnBubbleBurst = (x: number, y: number) => {
    const timestamp = Date.now();
    const next: Bubble[] = Array.from({ length: 10 }, (_, index) => ({
      id: timestamp + index,
      x,
      y,
      dx: (Math.random() - 0.5) * 160,
      dy: -28 - Math.random() * 96,
      size: 6 + Math.random() * 13,
      color: bubblePalette[index % bubblePalette.length],
      shape: index % 4 === 0 ? "diamond" : index % 3 === 0 ? "rounded" : "circle"
    }));
    const ripple: Ripple = { id: timestamp + 100, x, y, size: 26 + Math.random() * 18 };

    setBubbles((current) => [...current, ...next]);
    setRipples((current) => [...current, ripple]);

    window.setTimeout(() => {
      setBubbles((current) => current.filter((bubble) => !next.some((item) => item.id === bubble.id)));
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 900);
  };

  return (
    <div
      className="relative"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        spawnBubbleBurst(event.clientX, event.clientY);
      }}
    >
      {children}

      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.38, scale: 0.35, x: ripple.x, y: ripple.y }}
            animate={{ opacity: 0, scale: 2.9, x: ripple.x, y: ripple.y }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed left-0 top-0 z-[89] rounded-full border border-white/80"
            style={{
              width: ripple.size,
              height: ripple.size,
              background: "radial-gradient(circle, rgba(255,255,255,0.26), rgba(255,255,255,0))",
              boxShadow: "0 0 0 1px rgba(255,226,214,0.14)"
            }}
          />
        ))}

        {bubbles.map((bubble) => (
          <motion.span
            key={bubble.id}
            initial={{ opacity: 0.85, scale: 0.5, x: bubble.x, y: bubble.y }}
            animate={{ opacity: 0, scale: bubble.shape === "diamond" ? 1.22 : 1.5, rotate: bubble.shape === "diamond" ? 45 : 0, x: bubble.x + bubble.dx, y: bubble.y + bubble.dy }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className={`pointer-events-none fixed left-0 top-0 z-[90] border border-white/70 backdrop-blur-sm ${
              bubble.shape === "circle" ? "rounded-full" : bubble.shape === "rounded" ? "rounded-[38%]" : "rounded-[28%]"
            }`}
            style={{
              width: bubble.size,
              height: bubble.size,
              background: bubble.color,
              boxShadow: "0 10px 24px rgba(148,113,95,0.12)"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
