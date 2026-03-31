"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Cloud, Database, RefreshCw } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { AddItemForm } from "@/components/wardrobe/add-item-form";
import { FilterBar } from "@/components/wardrobe/filter-bar";
import { ItemDetailPanel } from "@/components/wardrobe/item-detail-panel";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import {
  ApiError,
  createWardrobeItem,
  deleteWardrobeItem,
  fetchWardrobeItems,
  processWardrobeImage,
  updateWardrobeItem,
  uploadWardrobeItemImage,
  WardrobeFormValues
} from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useWardrobeStore } from "@/store/wardrobe-store";

type SyncState = "loading" | "connected" | "error";

const syncStateCopy: Record<SyncState, { label: string; accent: string }> = {
  loading: { label: "Loading backend wardrobe", accent: "var(--accent-soft)" },
  connected: { label: "Connected to FastAPI + SQLite", accent: "var(--accent-mint)" },
  error: { label: "Could not save to backend", accent: "var(--accent-rose)" }
};

export function WardrobeWorkspace() {
  const { ready: authReady, isAuthenticated, user } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const selectedItemId = useWardrobeStore((state) => state.selectedItemId);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);
  const prependItem = useWardrobeStore((state) => state.prependItem);
  const upsertItem = useWardrobeStore((state) => state.upsertItem);
  const removeItem = useWardrobeStore((state) => state.removeItem);

  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [statusText, setStatusText] = useState("Loading wardrobe from backend...");
  const [creating, setCreating] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const loadWardrobe = useCallback(async () => {
    setSyncState("loading");
    setStatusText("Loading wardrobe from backend...");

    try {
      const apiItems = await fetchWardrobeItems();
      startTransition(() => replaceItems(apiItems));
      setSyncState("connected");
      setStatusText(
        apiItems.length > 0
          ? `${apiItems.length} items loaded from backend storage.`
          : "Connected to FastAPI + SQLite. The wardrobe is empty, so you can start by adding your first garment."
      );
    } catch (error) {
      startTransition(() => replaceItems([]));
      setSyncState("error");
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "Your session expired or is missing. Sign in again to load your private wardrobe."
          : error instanceof Error
            ? error.message
            : "Backend is unavailable right now, so the wardrobe could not be loaded."
      );
    }
  }, [replaceItems]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      startTransition(() => replaceItems([]));
      return;
    }

    void loadWardrobe();
  }, [authReady, isAuthenticated, loadWardrobe, replaceItems]);

  async function handleCreateItem(values: WardrobeFormValues) {
    setCreating(true);

    try {
      let created = await createWardrobeItem(values);

      if (values.imageFile) {
        created = await uploadWardrobeItemImage(created.id, values.imageFile);
      }

      startTransition(() => prependItem(created));
      setSyncState("connected");
      setStatusText(values.imageFile ? `Saved ${created.name} and uploaded its source image.` : `Saved ${created.name} into the SQLite wardrobe.`);
    } catch (error) {
      setSyncState("error");
      setStatusText(error instanceof Error ? error.message : "Could not save the item to backend.");
      throw error;
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateItem(itemId: number, values: WardrobeFormValues) {
    setSavingItemId(itemId);

    try {
      let updated = await updateWardrobeItem(itemId, values);

      if (values.imageFile) {
        updated = await uploadWardrobeItemImage(itemId, values.imageFile);
      }

      startTransition(() => upsertItem(updated));
      setSyncState("connected");
      setStatusText(values.imageFile ? `Updated ${updated.name} and replaced its image.` : `Updated ${updated.name}.`);
    } catch (error) {
      setSyncState("error");
      setStatusText(error instanceof Error ? error.message : "Could not update the item.");
      throw error;
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleDeleteItem(itemId: number) {
    setDeletingItemId(itemId);

    try {
      const deleted = await deleteWardrobeItem(itemId);
      startTransition(() => removeItem(itemId));
      setSyncState("connected");
      setStatusText(`Removed item ${deleted.id} from the wardrobe.`);
    } catch (error) {
      setSyncState("error");
      setStatusText(error instanceof Error ? error.message : "Could not delete the item.");
      throw error;
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleProcessItem(itemId: number) {
    setProcessingItemId(itemId);

    try {
      const processed = await processWardrobeImage(itemId);
      startTransition(() => upsertItem(processed));
      const usedRemoteCleanup = processed.tags.includes("cleanup-remote");
      const usedFallbackCleanup = processed.tags.includes("cleanup-fallback");
      setSyncState("connected");
      setStatusText(
        processed.processedImageUrl
          ? usedRemoteCleanup
            ? `Processed ${processed.name} with the configured AI cleanup service and saved the result to local-first storage.`
            : usedFallbackCleanup
              ? `External AI cleanup was unavailable, so ${processed.name} fell back to the local placeholder output.`
              : `Generated the local cleanup placeholder asset for ${processed.name}.`
          : `Saved the note for ${processed.name}. Upload an image before running the cleanup pipeline.`
      );
    } catch (error) {
      setSyncState("error");
      setStatusText(error instanceof Error ? error.message : "Could not process the image.");
      throw error;
    } finally {
      setProcessingItemId(null);
    }
  }

  if (!authReady) {
    return (
      <section className="section-card rounded-[32px] p-6">
        <p className="pill mb-3">Checking account session</p>
        <p className="text-sm leading-6 text-[var(--muted)]">Preparing your protected wardrobe workspace.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to open your private wardrobe"
        description="Wardrobe items now belong to the authenticated Supabase user mirrored into SQLite, so anonymous visitors no longer see placeholder clothing data as if it were theirs."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="section-card story-gradient rounded-[32px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[24px] p-3" style={{ background: syncStateCopy[syncState].accent }}>
                {syncState === "connected" ? <Cloud className="size-5 text-[var(--ink-strong)]" /> : <Database className="size-5 text-[var(--ink-strong)]" />}
              </div>
              <div>
                <p className="pill mb-3">{syncStateCopy[syncState].label}</p>
                <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Wardrobe data flow</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{statusText}</p>
                {user ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Current owner: {user.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm text-[var(--ink)]">
                {items.length} items in memory
              </div>
              <button type="button" onClick={() => void loadWardrobe()} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                <RefreshCw className="size-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="ambient-divider my-5" />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Owner</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{user?.email ?? "Signed-out session"}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Wardrobe cards, uploads, and cloud sync are now isolated per authenticated user.</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Storage mode</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">SQLite first</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Fast local CRUD first, with optional Supabase backup layered in only when configured.</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Image lane</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">Upload / cleanup / sync</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Each item can carry a source image, a processed asset, and later your own self-hosted AI pipeline output.</p>
            </div>
          </div>
        </section>

        <FilterBar />
        <WardrobeGrid />
      </div>

      <div className="space-y-6">
        <AddItemForm submitting={creating} onSubmit={handleCreateItem} />
        <ItemDetailPanel
          item={selectedItem}
          saving={savingItemId === selectedItem?.id}
          deleting={deletingItemId === selectedItem?.id}
          processing={processingItemId === selectedItem?.id}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          onProcess={handleProcessItem}
        />
      </div>
    </div>
  );
}
