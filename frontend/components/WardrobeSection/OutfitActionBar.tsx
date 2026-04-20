"use client";

import { motion } from "framer-motion";

import type { HomeQuickAction, HomeWardrobeCategory } from "@/lib/home-wardrobe";

interface QuickActionDescriptor {
  id: HomeQuickAction;
  label: string;
  prompt: string;
  keywords: readonly string[];
  preferredCategories: readonly HomeWardrobeCategory[];
}

interface OutfitActionBarProps {
  actions: readonly QuickActionDescriptor[];
  activeAction: HomeQuickAction | null;
  onSelect: (action: HomeQuickAction) => void;
}

export function OutfitActionBar({ actions, activeAction, onSelect }: OutfitActionBarProps) {
  return (
    <div className="overflow-visible md:scrollbar-hide md:overflow-x-auto">
      <div className="flex flex-wrap gap-2 md:w-max md:flex-nowrap md:gap-3 md:pr-2">
        {actions.map((action) => {
          const isActive = activeAction === action.id;

          return (
            <motion.button
              key={action.id}
              type="button"
              data-cursor="hover"
              data-active={isActive}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(action.id)}
              aria-pressed={isActive}
              title={action.prompt}
              className={`action-chip inline-flex min-h-[2.75rem] flex-[1_1_calc(50%-0.5rem)] items-center justify-center whitespace-nowrap px-3.5 py-2.5 text-[0.82rem] md:min-h-0 md:flex-none md:px-4 md:py-2.5 md:text-sm ${isActive ? "bg-[rgba(var(--accent-rose-rgb),0.14)]" : ""}`}
            >
              {action.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
