"use client";

import { AnimatePresence, motion } from "framer-motion";

import { ClothingCard } from "./ClothingCard";
import { CategoryTabs } from "./CategoryTabs";
import { OutfitActionBar } from "./OutfitActionBar";
import type { HomeQuickAction, HomeWardrobeCategory, HomeWardrobeItem } from "@/lib/home-wardrobe";

interface QuickActionDescriptor {
  id: HomeQuickAction;
  label: string;
  prompt: string;
  keywords: readonly string[];
  preferredCategories: readonly HomeWardrobeCategory[];
}

interface ClothingPanelProps {
  actions: readonly QuickActionDescriptor[];
  activeAction: HomeQuickAction | null;
  items: HomeWardrobeItem[];
  selectedCategory: HomeWardrobeCategory;
  selectedItem: HomeWardrobeItem | null;
  onApplyQuickAction: (action: HomeQuickAction) => void;
  onSelectCategory: (category: HomeWardrobeCategory) => void;
  onSelectItem: (item: HomeWardrobeItem) => void;
}

export function ClothingPanel({
  actions,
  activeAction,
  items,
  selectedCategory,
  selectedItem,
  onApplyQuickAction,
  onSelectCategory,
  onSelectItem
}: ClothingPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg-primary)]">
      <div className="relative z-10 px-4 pb-4 pt-4 md:px-8 md:pb-6 md:pt-28">
        <CategoryTabs selectedCategory={selectedCategory} onSelect={onSelectCategory} />
      </div>

      <div className="relative flex-1 overflow-visible px-4 pb-0 md:overflow-hidden md:px-8 md:pb-8">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 24px 60px rgba(180,120,140,0.14)" }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className="relative flex h-auto min-h-[34rem] flex-col overflow-visible rounded-[30px] border border-[rgba(var(--accent-rose-rgb),0.14)] bg-white/50 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:h-full md:overflow-hidden md:rounded-[36px]"
          data-cursor="hover"
        >
          <div className="scrollbar-hide flex-1 overflow-visible px-4 pb-5 pt-4 md:h-full md:overflow-y-auto md:px-5 md:pb-28 md:pt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCategory}
                initial={{ x: 60, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  transition: {
                    duration: 0.42,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    staggerChildren: 0.05,
                    delayChildren: 0.05
                  }
                }}
                exit={{ x: -40, opacity: 0, transition: { duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] } }}
                className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:gap-4"
              >
                {items.map((item, index) => (
                  <ClothingCard
                    key={item.id}
                    index={index}
                    isSelected={selectedItem?.id === item.id}
                    item={item}
                    onSelect={onSelectItem}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-28 bg-gradient-to-t from-[rgba(var(--bg-primary-rgb),0.98)] via-[rgba(var(--bg-primary-rgb),0.82)] to-transparent md:block" />

          <div className="mt-4 px-4 pb-4 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:px-5 md:pb-5">
            <div className="rounded-[28px] border border-[var(--surface-border)] bg-white/78 p-3 backdrop-blur-xl">
              <OutfitActionBar actions={actions} activeAction={activeAction} onSelect={onApplyQuickAction} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
