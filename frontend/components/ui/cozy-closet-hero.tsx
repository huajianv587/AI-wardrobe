"use client";

import { motion } from "framer-motion";
import { Heart, Shirt, Sparkles, Star } from "lucide-react";

const floatingNotes = [
  { label: "今日想穿得软一点", icon: Heart, className: "cozy-note cozy-note-top" },
  { label: "先选上衣，再挑鞋子", icon: Shirt, className: "cozy-note cozy-note-right" },
  { label: "慢慢整理，也会越来越懂你", icon: Sparkles, className: "cozy-note cozy-note-bottom" }
];

export function CozyClosetHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="cozy-hero-shell"
      aria-hidden="true"
    >
      <div className="cozy-hero-glow cozy-hero-glow-peach" />
      <div className="cozy-hero-glow cozy-hero-glow-mint" />
      <div className="cozy-hero-glow cozy-hero-glow-sky" />

      <div className="cozy-room-stage">
        <div className="cozy-room-wall" />
        <div className="cozy-room-floor" />

        <motion.div
          animate={{ y: [0, -6, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          className="cozy-room-window"
        >
          <span className="cozy-sun" />
        </motion.div>

        <div className="cozy-room-wardrobe">
          <div className="cozy-rail" />
          <span className="cozy-hanger cozy-hanger-rose" />
          <span className="cozy-hanger cozy-hanger-cream" />
          <span className="cozy-hanger cozy-hanger-mint" />
          <div className="cozy-drawer-band" />
        </div>

        <motion.div
          animate={{ rotate: [-2.5, -1.2, -2.5], y: [0, -3, 0] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
          className="cozy-room-mirror"
        >
          <span className="cozy-mirror-glow" />
        </motion.div>

        <div className="cozy-room-rug" />

        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          className="cozy-room-girl"
        >
          <span className="cozy-girl-head" />
          <span className="cozy-girl-hair" />
          <span className="cozy-girl-body" />
          <span className="cozy-girl-arm" />
          <span className="cozy-girl-skirt" />
        </motion.div>

        <motion.div
          animate={{ rotate: [-8, -3, -8], x: [0, 3, 0], y: [0, -3, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          className="cozy-picked-card"
        >
          <span className="cozy-picked-top" />
          <span className="cozy-picked-text">今天先从喜欢的那件开始</span>
        </motion.div>

        <div className="cozy-room-plant">
          <span className="cozy-plant-leaf cozy-plant-leaf-left" />
          <span className="cozy-plant-leaf cozy-plant-leaf-right" />
          <span className="cozy-plant-pot" />
        </div>

        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.94, 1.04, 0.94] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          className="cozy-spark cozy-spark-one"
        >
          <Star className="size-4" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1.08, 0.96] }}
          transition={{ duration: 4.3, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
          className="cozy-spark cozy-spark-two"
        >
          <Sparkles className="size-4" />
        </motion.div>
      </div>

      {floatingNotes.map(({ label, icon: Icon, className }, index) => (
        <motion.div
          key={label}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.6 }}
          className={className}
        >
          <Icon className="size-4" />
          <span>{label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
