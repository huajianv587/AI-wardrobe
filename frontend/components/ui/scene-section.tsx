"use client";

import { motion } from "framer-motion";

type SceneAccent = "peach" | "mint" | "sky" | "lilac" | "butter";

interface SceneSectionProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  index?: number;
  sticker?: string;
  accent?: SceneAccent;
}

const accentClassMap: Record<SceneAccent, { sticker: string; orbit: string }> = {
  peach: { sticker: "scene-sticker-peach", orbit: "scene-orbit-peach" },
  mint: { sticker: "scene-sticker-mint", orbit: "scene-orbit-mint" },
  sky: { sticker: "scene-sticker-sky", orbit: "scene-orbit-sky" },
  lilac: { sticker: "scene-sticker-lilac", orbit: "scene-orbit-lilac" },
  butter: { sticker: "scene-sticker-butter", orbit: "scene-orbit-butter" }
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SceneSection({
  children,
  className,
  contentClassName,
  index = 0,
  sticker,
  accent = "peach"
}: SceneSectionProps) {
  const accentClass = accentClassMap[accent];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.985, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.62, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={joinClasses("scene-shell", className)}
    >
      <motion.span
        animate={{ y: [0, -6, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
        className={joinClasses("scene-orbit scene-orbit-left", accentClass.orbit)}
      />
      <motion.span
        animate={{ y: [0, 8, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 + index * 0.12 }}
        className={joinClasses("scene-orbit scene-orbit-right", accentClass.orbit)}
      />

      {sticker ? (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.92 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.52, delay: 0.12 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className={joinClasses("scene-sticker", accentClass.sticker)}
        >
          {sticker}
        </motion.div>
      ) : null}

      <div className={joinClasses("scene-shell-inner", contentClassName)}>{children}</div>
    </motion.section>
  );
}
