"use client";

import { motion } from "framer-motion";
import type { QuickAction } from "@/lib/mockData";

interface OutfitActionBarProps {
  actions: readonly QuickAction[];
  activeAction: QuickAction | null;
  onSelect: (action: QuickAction) => void;
}

export function OutfitActionBar({ actions, activeAction, onSelect }: OutfitActionBarProps) {
  return (
    <div className="scrollbar-hide overflow-x-auto">
      <div className="flex w-max gap-3 pr-2">
        {actions.map((action) => {
          const isActive = activeAction === action;

          return (
            <motion.button
              key={action}
              type="button"
              data-cursor="hover"
              data-active={isActive}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(action)}
              aria-pressed={isActive}
              className={`action-chip whitespace-nowrap px-4 py-2.5 text-sm ${isActive ? "bg-[rgba(var(--accent-rose-rgb),0.14)]" : ""}`}
            >
              {action}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
