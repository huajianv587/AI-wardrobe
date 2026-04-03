"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

interface PetalParticle {
  id: number;
  left: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  swayDuration: number;
  drift: number;
  spin: number;
  svg: string;
}

const PETAL_COLORS = ["#FFD0DC", "#F5C0D0", "#FFB5C8"] as const;

const PETAL_SHAPES = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 64"><path fill="{{COLOR}}" d="M21 2C31 8 39 21 37 35c-2 14-12 25-16 27C15 60 6 48 5 35 3 22 11 8 21 2Z"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 70"><path fill="{{COLOR}}" d="M24 4c10 6 18 18 18 33 0 16-8 28-19 30C12 64 4 51 4 36 4 20 13 8 24 4Z"/><path fill="rgba(255,255,255,0.4)" d="M23 12c5 5 9 12 8 23-1 8-4 15-8 20 2-11 2-26 0-43Z"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 68"><path fill="{{COLOR}}" d="M22 2c12 8 19 20 17 36-1 14-8 25-17 28C13 62 6 51 5 37 3 21 10 9 22 2Z"/><ellipse cx="22" cy="32" rx="8" ry="20" fill="rgba(255,255,255,0.18)"/></svg>'
] as const;

export function FloatingPetals() {
  const [petals, setPetals] = useState<PetalParticle[]>([]);

  useEffect(() => {
    const createPetals = () => {
      const count = window.innerWidth < 768 ? 5 : 8;

      const nextPetals = Array.from({ length: count }, (_, index) => {
        const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
        const shape = PETAL_SHAPES[Math.floor(Math.random() * PETAL_SHAPES.length)].replace("{{COLOR}}", color);

        return {
          id: index,
          left: 10 + Math.random() * 80,
          size: 8 + Math.random() * 10,
          opacity: 0.2 + Math.random() * 0.25,
          duration: 10 + Math.random() * 8,
          delay: Math.random() * 8,
          swayDuration: 3.8 + Math.random() * 2,
          drift: -20 + Math.random() * 40,
          spin: -45 + Math.random() * 90,
          svg: `url("data:image/svg+xml;utf8,${encodeURIComponent(shape)}")`
        };
      });

      setPetals(nextPetals);
    };

    createPetals();
    window.addEventListener("resize", createPetals);

    return () => {
      window.removeEventListener("resize", createPetals);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.3 }}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="petal-shell"
          style={
            {
              left: `${petal.left}%`,
              animationDuration: `${petal.duration}s`,
              animationDelay: `-${petal.delay}s`,
              "--drift": `${petal.drift}px`,
              "--spin": `${petal.spin}deg`
            } as CSSProperties
          }
        >
          <span className="petal-inner" style={{ animationDuration: `${petal.swayDuration}s` }}>
            <span
              className="petal-blade"
              style={{
                width: `${petal.size}px`,
                height: `${petal.size * 1.5}px`,
                opacity: petal.opacity,
                backgroundImage: petal.svg
              }}
            />
          </span>
        </span>
      ))}
    </motion.div>
  );
}
