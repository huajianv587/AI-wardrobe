"use client";

import { startTransition, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { AvatarStage } from "@/components/avatar-3d/avatar-stage";
import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchWardrobeItems } from "@/lib/api";
import { useWardrobeStore } from "@/store/wardrobe-store";

export function TryOnStudio() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const selectedTryOnIds = useWardrobeStore((state) => state.selectedTryOnIds);
  const toggleTryOnItem = useWardrobeStore((state) => state.toggleTryOnItem);
  const resetTryOn = useWardrobeStore((state) => state.resetTryOn);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);

  const [hydratingWardrobe, setHydratingWardrobe] = useState(false);
  const [hasHydratedWardrobe, setHasHydratedWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");

  const wearingItems = items.filter((item) => selectedTryOnIds.includes(item.id));

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      startTransition(() => replaceItems([]));
      setHasHydratedWardrobe(false);
      setStatusText("");
      return;
    }

    if (items.length > 0 || hasHydratedWardrobe) {
      return;
    }

    let active = true;

    async function hydrateWardrobe() {
      setHydratingWardrobe(true);
      setStatusText("Loading your wardrobe so the try-on stage can use your private items.");

      try {
        const wardrobeItems = await fetchWardrobeItems();

        if (!active) {
          return;
        }

        startTransition(() => replaceItems(wardrobeItems));
        setStatusText(
          wardrobeItems.length > 0
            ? `Loaded ${wardrobeItems.length} private wardrobe items for try-on.`
            : "Your wardrobe is empty. Add clothing first, then return to build looks in the try-on studio."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setStatusText(error instanceof Error ? error.message : "Could not load wardrobe items for try-on.");
      } finally {
        if (active) {
          setHasHydratedWardrobe(true);
          setHydratingWardrobe(false);
        }
      }
    }

    void hydrateWardrobe();

    return () => {
      active = false;
    };
  }, [authReady, hasHydratedWardrobe, isAuthenticated, items.length, replaceItems]);

  if (!authReady) {
    return (
      <section className="section-card rounded-[32px] p-6">
        <p className="pill mb-3">Checking account session</p>
        <p className="text-sm leading-6 text-[var(--muted)]">Preparing your private try-on studio.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to open your try-on studio"
        description="The 2.5D try-on stage now uses the same authenticated wardrobe store as the rest of the app, so only the signed-in user's items appear here."
      />
    );
  }

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
            {statusText ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{statusText}</p> : null}
          </div>

          <button
            type="button"
            onClick={resetTryOn}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <RefreshCw className="size-4" />
            {hydratingWardrobe ? "Loading..." : "Reset"}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-4 text-sm leading-6 text-[var(--muted)]">
            Add clothing in the wardrobe page first. Once items exist, you can toggle them here to preview a simple layered avatar composition.
          </div>
        ) : null}

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
