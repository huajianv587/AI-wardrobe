"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { HOME_CATEGORIES, type HomeWardrobeCategory } from "@/lib/home-wardrobe";

interface CategoryTabsProps {
  selectedCategory: HomeWardrobeCategory;
  onSelect: (category: HomeWardrobeCategory) => void;
}

export function CategoryTabs({ selectedCategory, onSelect }: CategoryTabsProps) {
  const [hoveredCategory, setHoveredCategory] = useState<HomeWardrobeCategory | null>(null);

  return (
    <div className="scrollbar-hide overflow-visible md:overflow-x-auto md:overflow-y-visible">
      <div className="category-shell">
        {HOME_CATEGORIES.map((category) => {
          const isActive = selectedCategory === category.id;
          const isHovered = hoveredCategory === category.id;

          return (
            <motion.button
              key={category.id}
              type="button"
              data-cursor="hover"
              aria-pressed={isActive}
              onClick={() => onSelect(category.id)}
              onHoverStart={() => setHoveredCategory(category.id)}
              onHoverEnd={() => setHoveredCategory(null)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="tab-pill"
            >
              {isHovered && !isActive ? (
                <motion.div
                  layoutId="hoverTab"
                  className="absolute inset-0 rounded-full bg-white/70"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              ) : null}
              {isActive ? (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "linear-gradient(135deg, #FF9AB4, #FF7A99)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10 flex flex-col items-center gap-1">
                <span className={`text-[0.96rem] md:text-sm ${isActive ? "text-white" : "text-[var(--text-secondary)]"}`}>
                  {category.label}
                </span>
                <span className={`text-[0.58rem] tracking-[0.18em] md:text-[0.62rem] md:tracking-[0.22em] ${isActive ? "text-white/76" : "text-[rgba(var(--text-secondary-rgb),0.64)]"}`}>
                  {category.shortLabel}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
