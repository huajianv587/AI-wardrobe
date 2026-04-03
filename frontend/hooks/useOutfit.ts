"use client";

import { useState } from "react";
import {
  QUICK_ACTION_PRESETS,
  QUICK_ACTIONS,
  mockClothing,
  type ClothingCategory,
  type ClothingItem,
  type QuickAction
} from "@/lib/mockData";

export function useOutfit() {
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory>("套装");
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(mockClothing[0] ?? null);
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);

  const filteredItems = mockClothing.filter((item) => item.category === selectedCategory);

  const selectCategory = (category: ClothingCategory) => {
    setSelectedCategory(category);
    setActiveAction(null);

    const nextItem = mockClothing.find((item) => item.category === category) ?? null;
    setSelectedItem(nextItem);
  };

  const selectItem = (item: ClothingItem) => {
    setSelectedCategory(item.category);
    setSelectedItem(item);
    setActiveAction(null);
  };

  const applyQuickAction = (action: QuickAction) => {
    setActiveAction(action);

    if (action === "一键换色") {
      const currentItems = mockClothing.filter((item) => item.category === selectedCategory);
      const currentIndex = currentItems.findIndex((item) => item.id === selectedItem?.id);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % currentItems.length : 0;
      const nextItem = currentItems[nextIndex] ?? selectedItem ?? null;

      if (nextItem) {
        setSelectedItem(nextItem);
        setSelectedCategory(nextItem.category);
      }

      return;
    }

    const presetItemId = QUICK_ACTION_PRESETS[action];
    const nextItem = mockClothing.find((item) => item.id === presetItemId) ?? null;

    if (!nextItem) {
      return;
    }

    setSelectedCategory(nextItem.category);
    setSelectedItem(nextItem);
  };

  return {
    activeAction,
    filteredItems,
    quickActions: QUICK_ACTIONS,
    selectedCategory,
    selectedItem,
    applyQuickAction,
    selectCategory,
    selectItem
  };
}
