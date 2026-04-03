"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS_EN, type ClothingCategory } from "@/lib/mockData";

interface CategoryTabsProps {
  selectedCategory: ClothingCategory;
  onSelect: (category: ClothingCategory) => void;
}

export function CategoryTabs({ selectedCategory, onSelect }: CategoryTabsProps) {
  const [hoveredCategory, setHoveredCategory] = useState<ClothingCategory | null>(null);

  return (
    <div className="scrollbar-hide overflow-x-auto overflow-y-visible">
      <div className="category-shell">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          const isHovered = hoveredCategory === category;

          return (
            <motion.button
              key={category}
              type="button"
              data-cursor="hover"
              aria-pressed={isActive}
              onClick={() => onSelect(category)}
              onHoverStart={() => setHoveredCategory(category)}
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
                <span className={`text-sm ${isActive ? "text-white" : "text-[var(--text-secondary)]"}`}>{category}</span>
                <span className={`text-[0.62rem] tracking-[0.22em] ${isActive ? "text-white/76" : "text-[rgba(var(--text-secondary-rgb),0.64)]"}`}>
                  {CATEGORY_LABELS_EN[category]}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
