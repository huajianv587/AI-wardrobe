import { resolveAssetUrl } from "@/lib/api";
import type { WardrobeCategory, WardrobeItem, WardrobeSlot } from "@/store/wardrobe-store";

export const HOME_CATEGORIES = [
  { id: "outerwear", label: "外套", shortLabel: "OUTER" },
  { id: "tops", label: "上衣", shortLabel: "TOP" },
  { id: "bottoms", label: "下装", shortLabel: "BOTTOM" },
  { id: "shoes", label: "鞋子", shortLabel: "SHOES" },
  { id: "accessories", label: "配饰", shortLabel: "ACC" }
] as const;

export type HomeWardrobeCategory = (typeof HOME_CATEGORIES)[number]["id"];

export interface HomeWardrobeItem {
  id: number;
  sourceItemId: number;
  name: string;
  category: HomeWardrobeCategory;
  categoryLabel: string;
  tag: string;
  color: string;
  primaryColor: string;
  secondaryColor: string;
  emoji: string;
  note: string;
  imageUrl: string | null;
}

export const HOME_QUICK_ACTIONS = [
  {
    id: "coffee-look",
    label: "咖啡馆整套",
    prompt: "Weekend coffee with friends, relaxed but polished",
    keywords: ["coffee", "weekend", "gallery", "soft", "relaxed"],
    preferredCategories: ["tops", "outerwear", "accessories"]
  },
  {
    id: "weekend-look",
    label: "周末整套",
    prompt: "Weekend stroll, gentle and breathable",
    keywords: ["weekend", "travel", "casual", "soft", "relaxed"],
    preferredCategories: ["tops", "bottoms", "shoes"]
  },
  {
    id: "swap-color",
    label: "一键换色",
    prompt: "Change the color mood but keep the same wardrobe logic",
    keywords: [],
    preferredCategories: []
  },
  {
    id: "commute-look",
    label: "通勤整套",
    prompt: "Office meeting tomorrow, soft but professional",
    keywords: ["office", "meeting", "commute", "formal", "smart"],
    preferredCategories: ["outerwear", "tops", "shoes"]
  },
  {
    id: "date-look",
    label: "约会整套",
    prompt: "Evening date, gentle and refined",
    keywords: ["date", "dinner", "soft", "elegant", "refined"],
    preferredCategories: ["outerwear", "accessories", "shoes"]
  },
  {
    id: "sporty-look",
    label: "运动风",
    prompt: "A light sporty city look for active daytime movement",
    keywords: ["sport", "weekend", "travel", "city", "casual"],
    preferredCategories: ["tops", "shoes", "bottoms"]
  }
] as const;

export type HomeQuickAction = (typeof HOME_QUICK_ACTIONS)[number]["id"];

const SLOT_EMOJI_MAP: Record<WardrobeSlot, string> = {
  top: "👚",
  bottom: "👖",
  outerwear: "🧥",
  shoes: "👠",
  accessory: "👜"
};

const CATEGORY_LABEL_MAP: Record<HomeWardrobeCategory, string> = HOME_CATEGORIES.reduce(
  (accumulator, entry) => ({
    ...accumulator,
    [entry.id]: entry.label
  }),
  {} as Record<HomeWardrobeCategory, string>
);

function mixHexWithWhite(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  const numeric = Number.parseInt(normalized, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

function summarizeItem(item: WardrobeItem) {
  return [
    item.name,
    item.brand,
    item.color,
    item.note,
    ...item.tags,
    ...item.occasions,
    ...(item.seasonTags ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function mapWardrobeCategoryToHomeCategory(category: WardrobeCategory): HomeWardrobeCategory {
  return category;
}

export function mapWardrobeItemToHomeItem(item: WardrobeItem): HomeWardrobeItem {
  const category = mapWardrobeCategoryToHomeCategory(item.category);
  const previewUrl = resolveAssetUrl(item.processedImageUrl ?? item.imageUrl);

  return {
    id: item.id,
    sourceItemId: item.id,
    name: item.name,
    category,
    categoryLabel: CATEGORY_LABEL_MAP[category],
    tag: item.occasions[0] ?? item.tags[0] ?? item.brand ?? item.color,
    color: item.color,
    primaryColor: item.colorHex,
    secondaryColor: mixHexWithWhite(item.colorHex, 0.72),
    emoji: SLOT_EMOJI_MAP[item.slot] ?? "✨",
    note: item.note,
    imageUrl: previewUrl
  };
}

export function findBestQuickActionItem(
  items: HomeWardrobeItem[],
  actionId: HomeQuickAction
) {
  const action = HOME_QUICK_ACTIONS.find((entry) => entry.id === actionId);
  if (!action || action.id === "swap-color") {
    return null;
  }

  return [...items]
    .map((item) => {
      const summary = `${item.name} ${item.note} ${item.tag} ${item.color} ${item.categoryLabel}`.toLowerCase();
      const keywordScore = action.keywords.reduce((total, keyword) => total + (summary.includes(keyword) ? 2 : 0), 0);
      const categoryScore = (action.preferredCategories as readonly HomeWardrobeCategory[]).includes(item.category) ? 2.5 : 0;
      const imageScore = item.imageUrl ? 0.4 : 0;
      return {
        item,
        score: keywordScore + categoryScore + imageScore
      };
    })
    .sort((left, right) => right.score - left.score)[0]?.item ?? null;
}

export function buildStarterLookIds(items: WardrobeItem[], focusItemId?: number | null) {
  if (items.length === 0) {
    return [];
  }

  const focusItem = focusItemId ? items.find((item) => item.id === focusItemId) ?? null : null;
  const orderedSlots: WardrobeSlot[] = focusItem
    ? [focusItem.slot, "top", "bottom", "outerwear", "shoes", "accessory"]
    : ["outerwear", "top", "bottom", "shoes", "accessory"];
  const selectedIds: number[] = [];

  if (focusItem) {
    selectedIds.push(focusItem.id);
  }

  for (const slot of orderedSlots) {
    const candidate = items.find((item) => item.slot === slot && !selectedIds.includes(item.id));
    if (candidate) {
      selectedIds.push(candidate.id);
    }
    if (selectedIds.length >= 4) {
      break;
    }
  }

  if (selectedIds.length === 0) {
    return items.slice(0, 4).map((item) => item.id);
  }

  return selectedIds;
}

export function hasMeaningfulKeywordMatch(item: WardrobeItem, keywords: string[]) {
  if (keywords.length === 0) {
    return false;
  }

  const summary = summarizeItem(item);
  return keywords.some((keyword) => summary.includes(keyword));
}
