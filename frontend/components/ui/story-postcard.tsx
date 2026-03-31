"use client";

import { motion } from "framer-motion";

type PostcardTone = "peach" | "mint" | "sky" | "lilac" | "butter";

interface StoryPostcardProps {
  emoji?: string;
  eyebrow?: string;
  title: string;
  description: string;
  chips?: string[];
  tone?: PostcardTone;
  compact?: boolean;
}

const toneClassMap: Record<PostcardTone, string> = {
  peach: "story-postcard-peach",
  mint: "story-postcard-mint",
  sky: "story-postcard-sky",
  lilac: "story-postcard-lilac",
  butter: "story-postcard-butter"
};

export function StoryPostcard({
  emoji = "💌",
  eyebrow = "soft story",
  title,
  description,
  chips = [],
  tone = "peach",
  compact = false
}: StoryPostcardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14, rotate: -1.4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -1.4 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
      className={`story-postcard ${toneClassMap[tone]} ${compact ? "story-postcard-compact" : ""}`.trim()}
    >
      <motion.span
        animate={{ rotate: [-1.4, 1.4, -1.4], y: [0, -5, 0] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
        className="story-postcard-stamp"
      >
        {emoji}
      </motion.span>
      <span className="story-postcard-pin" />
      <div className="story-postcard-paper">
        <p className="story-postcard-eyebrow">{eyebrow}</p>
        <h3 className="story-postcard-title">{title}</h3>
        <p className="story-postcard-description">{description}</p>

        {chips.length > 0 ? (
          <div className="story-postcard-chips">
            {chips.slice(0, compact ? 2 : 3).map((chip, index) => (
              <motion.span
                key={`${chip}-${index}`}
                animate={{ y: [0, index % 2 === 0 ? -3 : -1, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: index * 0.18, ease: "easeInOut" }}
                className="story-postcard-chip"
              >
                {chip}
              </motion.span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
