"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/hooks/use-auth-session";
import { ApiError, fetchWardrobeItems } from "@/lib/api";
import {
  buildStarterLookIds,
  findBestQuickActionItem,
  HOME_CATEGORIES,
  HOME_QUICK_ACTIONS,
  mapWardrobeItemToHomeItem,
  type HomeQuickAction,
  type HomeWardrobeCategory,
  type HomeWardrobeItem
} from "@/lib/home-wardrobe";
import { seedWardrobeItems, type WardrobeItem, useWardrobeStore } from "@/store/wardrobe-store";

function nextAvailableCategory(items: HomeWardrobeItem[], preferredCategory: HomeWardrobeCategory) {
  if (items.some((item) => item.category === preferredCategory)) {
    return preferredCategory;
  }

  return items[0]?.category ?? HOME_CATEGORIES[0].id;
}

export function useOutfit() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const wardrobeItems = useWardrobeStore((state) => state.items);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);
  const setActivePrompt = useWardrobeStore((state) => state.setActivePrompt);

  const [fallbackItems] = useState<WardrobeItem[]>(seedWardrobeItems);
  const [selectedCategory, setSelectedCategory] = useState<HomeWardrobeCategory>(HOME_CATEGORIES[0].id);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<HomeQuickAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Connecting wardrobe data...");
  const [dataMode, setDataMode] = useState<"account" | "preview" | "fallback">("preview");

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let active = true;

    async function hydrateWardrobe() {
      setLoading(true);
      setStatusText(isAuthenticated ? "Loading your private wardrobe..." : "Loading the public preview wardrobe...");

      try {
        const payload = await fetchWardrobeItems();

        if (!active) {
          return;
        }

        startTransition(() => replaceItems(payload));
        setDataMode(isAuthenticated ? "account" : "preview");
        setStatusText(
          payload.length > 0
            ? isAuthenticated
              ? `Connected ${payload.length} private wardrobe items.`
              : `Loaded ${payload.length} public preview items. Sign in and this section will switch to your real wardrobe.`
            : "Your wardrobe is still empty. Add a few pieces in the management page and this section will update immediately."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        startTransition(() => replaceItems([]));
        setDataMode("fallback");
        setStatusText(
          error instanceof ApiError
            ? `${error.message} Switched to a local fallback wardrobe.`
            : "Wardrobe API is currently unavailable. Switched to a local fallback wardrobe."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void hydrateWardrobe();

    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated, replaceItems]);

  const effectiveWardrobeItems = wardrobeItems.length > 0 ? wardrobeItems : fallbackItems;
  const homeItems = useMemo(() => effectiveWardrobeItems.map(mapWardrobeItemToHomeItem), [effectiveWardrobeItems]);
  const filteredItems = useMemo(
    () => homeItems.filter((item) => item.category === selectedCategory),
    [homeItems, selectedCategory]
  );
  const selectedItem = homeItems.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    if (!homeItems.length) {
      if (selectedItemId !== null) {
        setSelectedItemId(null);
      }
      return;
    }

    const nextCategory = nextAvailableCategory(homeItems, selectedCategory);
    if (nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory);
      return;
    }

    const availableIds = new Set(homeItems.map((item) => item.id));
    if (selectedItemId === null || !availableIds.has(selectedItemId)) {
      const nextItem = homeItems.find((item) => item.category === nextCategory) ?? homeItems[0] ?? null;
      setSelectedItemId(nextItem?.id ?? null);
      return;
    }

    const selectedStillVisible = filteredItems.some((item) => item.id === selectedItemId);
    if (!selectedStillVisible) {
      const nextItem =
        filteredItems[0] ??
        homeItems.find((item) => item.category === nextCategory) ??
        homeItems[0] ??
        null;
      setSelectedItemId(nextItem?.id ?? null);
    }
  }, [filteredItems, homeItems, selectedCategory, selectedItemId]);

  const selectCategory = (category: HomeWardrobeCategory) => {
    setSelectedCategory(category);
    setActiveAction(null);
    const nextItem = homeItems.find((item) => item.category === category) ?? homeItems[0] ?? null;
    setSelectedItemId(nextItem?.id ?? null);
  };

  const selectItem = (item: HomeWardrobeItem) => {
    setSelectedCategory(item.category);
    setSelectedItemId(item.id);
    setActiveAction(null);
  };

  const applyQuickAction = (actionId: HomeQuickAction) => {
    setActiveAction(actionId);
    const action = HOME_QUICK_ACTIONS.find((entry) => entry.id === actionId);
    if (action) {
      setActivePrompt(action.prompt);
    }

    if (actionId === "swap-color") {
      const currentItems = filteredItems;
      const currentIndex = currentItems.findIndex((item) => item.id === selectedItemId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % currentItems.length : 0;
      const nextItem = currentItems[nextIndex] ?? selectedItem ?? homeItems[0] ?? null;

      if (nextItem) {
        setSelectedCategory(nextItem.category);
        setSelectedItemId(nextItem.id);
      }
      return;
    }

    const nextItem = findBestQuickActionItem(homeItems, actionId) ?? homeItems[0] ?? null;
    if (!nextItem) {
      return;
    }

    setSelectedCategory(nextItem.category);
    setSelectedItemId(nextItem.id);
  };

  return {
    activeAction,
    applyQuickAction,
    buildStarterLookIds,
    dataMode,
    effectiveWardrobeItems,
    filteredItems,
    homeItems,
    loading,
    quickActions: HOME_QUICK_ACTIONS,
    selectCategory,
    selectItem,
    selectedCategory,
    selectedItem,
    statusText
  };
}
