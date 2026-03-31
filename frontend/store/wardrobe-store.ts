import { create } from "zustand";

export type WardrobeCategory = "tops" | "bottoms" | "outerwear" | "shoes" | "accessories";
export type FilterCategory = "all" | WardrobeCategory;
export type WardrobeSlot = "top" | "bottom" | "outerwear" | "shoes" | "accessory";

export interface WardrobeItem {
  id: number;
  name: string;
  category: WardrobeCategory;
  slot: WardrobeSlot;
  color: string;
  colorHex: string;
  brand: string;
  tags: string[];
  occasions: string[];
  note: string;
  imageLabel: string;
  imageUrl?: string | null;
  processedImageUrl?: string | null;
}

const COLOR_HEX_MAP: Record<string, string> = {
  ivory: "#f7f3e8",
  mint: "#c9eddc",
  charcoal: "#566170",
  cream: "#f3ead4",
  "dusty rose": "#e7bcb1",
  navy: "#355172",
  white: "#ffffff",
  pearl: "#f7f0ea",
  black: "#202833",
  blue: "#7bb2f5",
  green: "#98c7a8",
  pink: "#efc2cf",
  brown: "#8b6b4a",
  graphite: "#596270"
};

export function colorToHex(color: string) {
  const normalized = color.trim().toLowerCase();
  return COLOR_HEX_MAP[normalized] ?? "#d8e0ea";
}

export function categoryToSlot(category: WardrobeCategory): WardrobeSlot {
  if (category === "tops") {
    return "top";
  }

  if (category === "bottoms") {
    return "bottom";
  }

  if (category === "outerwear") {
    return "outerwear";
  }

  if (category === "shoes") {
    return "shoes";
  }

  return "accessory";
}

function deriveDefaultTryOnIds(items: WardrobeItem[]) {
  const preferredSlots: WardrobeSlot[] = ["top", "bottom", "shoes"];
  const orderedIds = preferredSlots
    .map((slot) => items.find((item) => item.slot === slot)?.id ?? null)
    .filter((value): value is number => value !== null);

  if (orderedIds.length > 0) {
    return orderedIds;
  }

  return items.slice(0, 3).map((item) => item.id);
}

export const seedWardrobeItems: WardrobeItem[] = [
  { id: 1, name: "Ivory Fluid Shirt", category: "tops", slot: "top", color: "Ivory", colorHex: "#f7f3e8", brand: "Aerial", tags: ["clean", "soft-formal", "layering"], occasions: ["office", "meeting", "date"], note: "Gentle drape that works for polished weekday looks.", imageLabel: "Silk shirt" },
  { id: 2, name: "Mint Cloud Knit", category: "tops", slot: "top", color: "Mint", colorHex: "#c9eddc", brand: "Morning Dew", tags: ["soft", "cozy", "weekend"], occasions: ["weekend", "travel", "coffee"], note: "A soft knit for relaxed layering and spring color balance.", imageLabel: "Soft knit" },
  { id: 3, name: "Charcoal Wide Trouser", category: "bottoms", slot: "bottom", color: "Charcoal", colorHex: "#566170", brand: "Mode Form", tags: ["formal", "minimal", "versatile"], occasions: ["office", "meeting", "city"], note: "Anchors recommendation sets with a stable professional shape.", imageLabel: "Tailored pants" },
  { id: 4, name: "Cream Pleated Skirt", category: "bottoms", slot: "bottom", color: "Cream", colorHex: "#f3ead4", brand: "Lune", tags: ["feminine", "airy", "date"], occasions: ["date", "weekend", "gallery"], note: "Adds movement and a softer silhouette for warm scenes.", imageLabel: "Pleated skirt" },
  { id: 5, name: "Dusty Rose Wrap Coat", category: "outerwear", slot: "outerwear", color: "Dusty Rose", colorHex: "#e7bcb1", brand: "Cocoon", tags: ["hero", "elegant", "city"], occasions: ["date", "dinner", "meeting"], note: "Works as the hero layer in photo-friendly looks.", imageLabel: "Wrap coat" },
  { id: 6, name: "Navy Soft Blazer", category: "outerwear", slot: "outerwear", color: "Navy", colorHex: "#355172", brand: "Shift", tags: ["smart", "office", "structured"], occasions: ["office", "meeting", "travel"], note: "Creates soft-formal balance without feeling too rigid.", imageLabel: "Soft blazer" },
  { id: 7, name: "Ivory Line Loafer", category: "shoes", slot: "shoes", color: "Ivory", colorHex: "#f5efe0", brand: "Halo", tags: ["clean", "office", "smart-casual"], occasions: ["office", "meeting", "city"], note: "Keeps office looks light and elegant.", imageLabel: "Loafers" },
  { id: 8, name: "White Breeze Sneaker", category: "shoes", slot: "shoes", color: "White", colorHex: "#ffffff", brand: "Pulse", tags: ["casual", "travel", "weekend"], occasions: ["weekend", "travel", "errands"], note: "Easy fallback for relaxed daily styling.", imageLabel: "Sneakers" },
  { id: 9, name: "Pearl Mini Bucket Bag", category: "accessories", slot: "accessory", color: "Pearl", colorHex: "#f7f0ea", brand: "Muse", tags: ["accent", "date", "soft"], occasions: ["date", "gallery", "dinner"], note: "Softens recommendations and adds a refined finish.", imageLabel: "Bucket bag" }
];

interface WardrobeStore {
  items: WardrobeItem[];
  selectedItemId: number | null;
  selectedCategory: FilterCategory;
  searchQuery: string;
  selectedTryOnIds: number[];
  activePrompt: string;
  setCategory: (category: FilterCategory) => void;
  setSearchQuery: (value: string) => void;
  setSelectedItemId: (itemId: number | null) => void;
  toggleTryOnItem: (itemId: number) => void;
  resetTryOn: () => void;
  setActivePrompt: (prompt: string) => void;
  replaceItems: (items: WardrobeItem[]) => void;
  prependItem: (item: WardrobeItem) => void;
  upsertItem: (item: WardrobeItem) => void;
  removeItem: (itemId: number) => void;
}

export const useWardrobeStore = create<WardrobeStore>((set) => ({
  items: [],
  selectedItemId: null,
  selectedCategory: "all",
  searchQuery: "",
  selectedTryOnIds: [],
  activePrompt: "Office meeting tomorrow, soft but professional",
  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (value) => set({ searchQuery: value }),
  setSelectedItemId: (itemId) => set({ selectedItemId: itemId }),
  toggleTryOnItem: (itemId) => set((state) => ({ selectedTryOnIds: state.selectedTryOnIds.includes(itemId) ? state.selectedTryOnIds.filter((id) => id !== itemId) : [...state.selectedTryOnIds, itemId] })),
  resetTryOn: () => set((state) => ({ selectedTryOnIds: deriveDefaultTryOnIds(state.items) })),
  setActivePrompt: (prompt) => set({ activePrompt: prompt }),
  replaceItems: (items) => set((state) => {
    const preservedTryOnIds = state.selectedTryOnIds.filter((id) => items.some((item) => item.id === id));

    return {
      items,
      selectedItemId: items.some((item) => item.id === state.selectedItemId) ? state.selectedItemId : (items[0]?.id ?? null),
      selectedTryOnIds: preservedTryOnIds.length > 0 ? preservedTryOnIds : deriveDefaultTryOnIds(items)
    };
  }),
  prependItem: (item) => set((state) => {
    const items = [item, ...state.items.filter((current) => current.id !== item.id)];
    return {
      items,
      selectedItemId: item.id,
      selectedTryOnIds: state.selectedTryOnIds.length > 0 ? state.selectedTryOnIds : deriveDefaultTryOnIds(items)
    };
  }),
  upsertItem: (item) => set((state) => {
    const items = state.items.some((current) => current.id === item.id)
      ? state.items.map((current) => current.id === item.id ? item : current)
      : [item, ...state.items];
    const preservedTryOnIds = state.selectedTryOnIds.filter((id) => items.some((current) => current.id === id));

    return {
      items,
      selectedItemId: item.id,
      selectedTryOnIds: preservedTryOnIds.length > 0 ? preservedTryOnIds : deriveDefaultTryOnIds(items)
    };
  }),
  removeItem: (itemId) => set((state) => {
    const nextItems = state.items.filter((item) => item.id !== itemId);
    const preservedTryOnIds = state.selectedTryOnIds.filter((id) => id !== itemId);
    return {
      items: nextItems,
      selectedItemId: state.selectedItemId === itemId ? (nextItems[0]?.id ?? null) : state.selectedItemId,
      selectedTryOnIds: preservedTryOnIds.length > 0 ? preservedTryOnIds : deriveDefaultTryOnIds(nextItems)
    };
  })
}));
