"use client";

import { motion } from "framer-motion";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5"
    >
      <div className="mb-3 inline-flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">{eyebrow}</p>
        <span className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(255,154,123,0.6), transparent)" }} />
      </div>
      <h2 className="display-title text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">{description}</p>
    </motion.div>
  );
}
