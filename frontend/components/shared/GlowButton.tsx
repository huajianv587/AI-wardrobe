"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface GlowButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "outline" | "filled" | "ghost";
  glowColor?: string;
}

export function GlowButton({
  children,
  className,
  glowColor = "var(--glow-rose)",
  type,
  variant = "outline",
  ...props
}: GlowButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      data-cursor="hover"
      data-variant={variant}
      type={type ?? "button"}
      whileHover={prefersReducedMotion ? {} : { y: -3, scale: 1.01 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
      className={["glow-button", className].filter(Boolean).join(" ")}
      style={{ "--button-glow": glowColor } as CSSProperties}
      {...props}
    >
      <span aria-hidden className="glow-button__fill" />
      <span aria-hidden className="glow-button__sheen" />
      <span className="glow-button__label">{children}</span>
    </motion.button>
  );
}
