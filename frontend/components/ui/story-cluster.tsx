"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type StoryTone = "peach" | "mint" | "sky" | "lilac";

interface StoryClusterProps {
  emoji?: string;
  title?: string;
  chips?: string[];
  tone?: StoryTone;
  compact?: boolean;
}

const toneClassMap: Record<StoryTone, string> = {
  peach: "story-cluster-peach",
  mint: "story-cluster-mint",
  sky: "story-cluster-sky",
  lilac: "story-cluster-lilac"
};

export function StoryCluster({
  emoji = "✨",
  title = "soft mode",
  chips = ["gentle", "thoughtful", "ready"],
  tone = "peach",
  compact = false
}: StoryClusterProps) {
  return (
    <div className={`story-cluster ${toneClassMap[tone]} ${compact ? "story-cluster-compact" : ""}`.trim()}>
      <motion.span
        animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        className="story-cluster-halo"
      />
      <motion.span
        animate={{ rotate: [0, 10, 0], y: [0, 4, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.16 }}
        className="story-cluster-spark"
      >
        <Sparkles className="size-4" />
      </motion.span>

      <div className="story-cluster-core">
        <span className="story-cluster-emoji" aria-hidden="true">
          {emoji}
        </span>
        <span className="story-cluster-title">{title}</span>
      </div>

      <div className="story-cluster-chip-row">
        {chips.slice(0, compact ? 2 : 3).map((chip, index) => (
          <motion.span
            key={`${chip}-${index}`}
            animate={{ y: [0, index % 2 === 0 ? -4 : -2, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
            className="story-cluster-chip"
          >
            {chip}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
