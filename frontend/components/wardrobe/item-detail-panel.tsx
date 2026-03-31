"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { LoaderCircle, Save, Sparkles, Trash2, UploadCloud } from "lucide-react";

import { resolveAssetUrl, WardrobeFormValues } from "@/lib/api";
import { WardrobeCategory, WardrobeItem } from "@/store/wardrobe-store";

interface ItemDetailPanelProps {
  item: WardrobeItem | null;
  saving: boolean;
  deleting: boolean;
  processing: boolean;
  onUpdate: (itemId: number, values: WardrobeFormValues) => Promise<void>;
  onDelete: (itemId: number) => Promise<void>;
  onProcess: (itemId: number) => Promise<void>;
}

const categories: { value: WardrobeCategory; label: string }[] = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" }
];

function toFormValues(item: WardrobeItem): WardrobeFormValues {
  return {
    name: item.name,
    category: item.category,
    color: item.color,
    brand: item.brand,
    imageUrl: item.imageUrl ?? "",
    imageFile: null,
    tags: item.tags.join(", "),
    occasions: item.occasions.join(", "),
    note: item.note
  };
}

function ItemDetailEditor({ item, saving, deleting, processing, onUpdate, onDelete, onProcess }: ItemDetailPanelProps & { item: WardrobeItem }) {
  const [form, setForm] = useState<WardrobeFormValues>(() => toFormValues(item));
  const [error, setError] = useState("");
  const previewUrl = resolveAssetUrl(item.processedImageUrl ?? item.imageUrl);

  function updateField<Key extends keyof WardrobeFormValues>(key: Key, value: WardrobeFormValues[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await onUpdate(item.id, form);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update the item.");
    }
  }

  async function handleDelete() {
    setError("");

    if (!window.confirm(`Delete ${item.name} from the wardrobe?`)) {
      return;
    }

    try {
      await onDelete(item.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete the item.");
    }
  }

  async function handleProcess() {
    setError("");

    try {
      await onProcess(item.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not process the image.");
    }
  }

  return (
    <section className="section-card rounded-[32px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Item detail</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Edit metadata, upload or replace the garment image, run AI cleanup with a real service or local fallback, or remove the item from the wardrobe.</p>
        </div>
        <div className="pill">
          {item.processedImageUrl ? "AI cleanup ready" : item.imageUrl ? "Source image attached" : "Metadata only"}
        </div>
      </div>

      <div className="relative mb-5 overflow-hidden rounded-[24px]" style={{ background: `linear-gradient(160deg, ${item.colorHex} 0%, rgba(255,255,255,0.9) 100%)` }}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.75))]" />
        <div className="relative flex h-40 items-end justify-between p-4">
          <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-[var(--ink)]">{item.imageLabel}</div>
          {item.processedImageUrl ? (
            <div className="rounded-full bg-[var(--accent-mint)]/85 px-3 py-1 text-xs font-medium text-[var(--ink-strong)]">
              processed image linked
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Name</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Category</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value as WardrobeCategory)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none">
              {categories.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Color</span>
            <input value={form.color} onChange={(event) => updateField("color", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Brand</span>
          <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Upload or replace image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => updateField("imageFile", event.currentTarget.files?.[0] ?? null)}
            className="w-full rounded-[22px] border border-dashed border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--ink-strong)]"
          />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {form.imageFile ? `Ready to upload: ${form.imageFile.name}` : item.imageUrl ? "A source image is already attached. Select a new file to replace it on save." : "No local file attached yet."}
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Original image URL</span>
          <input value={form.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Keep a remote reference if you want. A newly uploaded local file will become the active source image.</p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Tags</span>
          <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Occasions</span>
          <input value={form.occasions} onChange={(event) => updateField("occasions", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Styling note</span>
          <textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} className="min-h-28 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
        </label>

        {error ? (
          <div className="rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" disabled={saving || form.name.trim().length < 2 || form.color.trim().length === 0} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : form.imageFile ? <UploadCloud className="size-4" /> : <Save className="size-4" />}
            {saving ? "Saving..." : "Save changes"}
          </button>

          <button type="button" onClick={() => void handleProcess()} disabled={processing} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60">
            {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {processing ? "Processing..." : "Run AI cleanup"}
          </button>

          <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-rose)] bg-[var(--accent-rose)]/25 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60">
            {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {deleting ? "Deleting..." : "Delete item"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ItemDetailPanel({ item, saving, deleting, processing, onUpdate, onDelete, onProcess }: ItemDetailPanelProps) {
  if (!item) {
    return (
      <section className="section-card rounded-[32px] p-5">
        <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Item detail</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Select a clothing card to edit metadata, upload or replace its image, remove it from the wardrobe, or run the AI cleanup pipeline.</p>
      </section>
    );
  }

  const editorKey = `${item.id}:${item.name}:${item.imageUrl ?? "none"}:${item.processedImageUrl ?? "none"}:${item.tags.join("|")}:${item.occasions.join("|")}:${item.note}`;
  return <ItemDetailEditor key={editorKey} item={item} saving={saving} deleting={deleting} processing={processing} onUpdate={onUpdate} onDelete={onDelete} onProcess={onProcess} />;
}
