"use client";

/* eslint-disable @next/next/no-img-element */

import { motion } from "framer-motion";
import { useDeferredValue } from "react";
import { CheckCircle2, Image as ImageIcon } from "lucide-react";

import { resolveAssetUrl } from "@/lib/api";
import { useWardrobeStore } from "@/store/wardrobe-store";

export function WardrobeGrid() {
  const items = useWardrobeStore((state) => state.items);
  const selectedCategory = useWardrobeStore((state) => state.selectedCategory);
  const searchQuery = useWardrobeStore((state) => state.searchQuery);
  const selectedItemId = useWardrobeStore((state) => state.selectedItemId);
  const setSelectedItemId = useWardrobeStore((state) => state.setSelectedItemId);

  const deferredQuery = useDeferredValue(searchQuery);

  const filteredItems = items.filter((item) => {
    const categoryMatch = selectedCategory === "all" || item.category === selectedCategory;
    const query = deferredQuery.trim().toLowerCase();
    const queryMatch =
      query.length === 0 ||
      [item.name, item.brand, item.color, item.note, ...item.tags, ...item.occasions].join(" ").toLowerCase().includes(query);

    return categoryMatch && queryMatch;
  });

  if (filteredItems.length === 0) {
    return (
      <div className="section-card rounded-[28px] p-8 text-center">
        <p className="text-lg font-semibold text-[var(--ink-strong)]">No matching items</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Try adjusting the search keywords or add a new item to keep building your wardrobe memory.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredItems.map((item, index) => {
        const selected = item.id === selectedItemId;
        const previewUrl = resolveAssetUrl(item.processedImageUrl ?? item.imageUrl);

        return (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.18) }}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedItemId(item.id)}
            className={`section-card interactive-card rounded-[28px] p-4 text-left ${
              selected ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : ""
            }`}
          >
            <div className="relative mb-4 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(160deg, ${item.colorHex} 0%, rgba(255,255,255,0.88) 100%)` }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.72))]" />
              <div className="relative flex h-52 items-end justify-between p-4">
                <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--ink)]">{item.imageLabel}</div>
                {item.processedImageUrl ? (
                  <div className="rounded-full bg-[var(--accent-mint)]/85 px-3 py-1 text-xs font-medium text-[var(--ink-strong)]">
                    processed
                  </div>
                ) : item.imageUrl ? (
                  <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--ink)]">
                    source linked
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink-strong)]">{item.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.brand} - {item.color}</p>
              </div>
              <span className="rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs text-[var(--ink)]">{item.category}</span>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.note}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[...item.tags, ...item.occasions].slice(0, 4).map((token) => (
                <span key={token} className="pill">{token}</span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="size-4" />
                {previewUrl ? "Preview ready" : "No image yet"}
              </span>
              {selected ? <CheckCircle2 className="size-4 text-[var(--accent)]" /> : null}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
