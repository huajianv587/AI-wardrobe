"use client";

import { RefreshCw } from "lucide-react";
import { AvatarStage } from "@/components/avatar-3d/avatar-stage";
import { useWardrobeStore } from "@/store/wardrobe-store";

export function TryOnStudio() {
  const items = useWardrobeStore((state) => state.items);
  const selectedTryOnIds = useWardrobeStore((state) => state.selectedTryOnIds);
  const toggleTryOnItem = useWardrobeStore((state) => state.toggleTryOnItem);
  const resetTryOn = useWardrobeStore((state) => state.resetTryOn);

  const wearingItems = items.filter((item) => selectedTryOnIds.includes(item.id));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <AvatarStage palette={wearingItems.map((item) => item.colorHex)} />
      </div>

      <div className="section-card rounded-[32px] p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[var(--ink-strong)]">2.5D Try-On Studio</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Select pieces to preview the layered avatar stage.</p>
          </div>

          <button
            type="button"
            onClick={resetTryOn}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <RefreshCw className="size-4" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const active = selectedTryOnIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleTryOnItem(item.id)}
                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  active
                    ? "border-transparent bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]"
                    : "border-[var(--line)] bg-white/70 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className={`mt-1 text-sm ${active ? "text-white/75" : "text-[var(--muted)]"}`}>{item.category} - {item.color}</p>
                </div>

                <span className="size-4 rounded-full border" style={{ backgroundColor: item.colorHex, borderColor: active ? "rgba(255,255,255,0.55)" : "rgba(18,32,51,0.08)" }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}