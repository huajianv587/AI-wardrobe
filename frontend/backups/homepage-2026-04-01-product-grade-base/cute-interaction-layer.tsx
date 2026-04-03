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
};

const bubblePalette = [
  "rgba(255, 182, 170, 0.74)",
  "rgba(255, 223, 173, 0.72)",
  "rgba(214, 238, 226, 0.72)",
  "rgba(221, 230, 255, 0.7)"
];

export function CuteInteractionLayer({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const spawnBubbleBurst = (x: number, y: number) => {
    const timestamp = Date.now();
    const next = Array.from({ length: 8 }, (_, index) => ({
      id: timestamp + index,
      x,
      y,
      dx: (Math.random() - 0.5) * 130,
      dy: -32 - Math.random() * 90,
      size: 7 + Math.random() * 14,
      color: bubblePalette[index % bubblePalette.length]
    }));

    setBubbles((current) => [...current, ...next]);

    window.setTimeout(() => {
      setBubbles((current) => current.filter((bubble) => !next.some((item) => item.id === bubble.id)));
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
        {bubbles.map((bubble) => (
          <motion.span
            key={bubble.id}
            initial={{ opacity: 0.85, scale: 0.5, x: bubble.x, y: bubble.y }}
            animate={{ opacity: 0, scale: 1.45, x: bubble.x + bubble.dx, y: bubble.y + bubble.dy }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-none fixed left-0 top-0 z-[90] rounded-full border border-white/70 backdrop-blur-sm"
            style={{
              width: bubble.size,
              height: bubble.size,
              background: bubble.color,
              boxShadow: "0 8px 20px rgba(148,113,95,0.12)"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
