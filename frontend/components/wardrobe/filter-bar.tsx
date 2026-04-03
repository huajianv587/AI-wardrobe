"use client";

import { Search } from "lucide-react";
import { FilterCategory, useWardrobeStore } from "@/store/wardrobe-store";

const categories: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "tops", label: "上衣" },
  { value: "bottoms", label: "下装" },
  { value: "outerwear", label: "外搭" },
  { value: "shoes", label: "鞋子" },
  { value: "accessories", label: "配饰" }
];

export function FilterBar() {
  const selectedCategory = useWardrobeStore((state) => state.selectedCategory);
  const searchQuery = useWardrobeStore((state) => state.searchQuery);
  const setCategory = useWardrobeStore((state) => state.setCategory);
  const setSearchQuery = useWardrobeStore((state) => state.setSearchQuery);

  return (
    <div className="section-card subtle-card glow-card mb-6 rounded-[28px] p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category.value === selectedCategory;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setCategory(category.value)}
                className={`tap-card rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-transparent bg-[var(--ink-strong)] text-white"
                    : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <label className="status-bubble flex w-full items-center gap-3 rounded-full px-4 py-3 lg:max-w-sm">
          <Search className="size-4 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="按名称、品牌、标签或场景搜索"
            className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
        </label>
      </div>
    </div>
  );
}
