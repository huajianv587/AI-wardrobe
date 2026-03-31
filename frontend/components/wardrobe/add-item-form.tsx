"use client";

import { useState } from "react";
import { ImagePlus, Wand2 } from "lucide-react";
import { WardrobeFormValues } from "@/lib/api";
import { WardrobeCategory } from "@/store/wardrobe-store";

interface AddItemFormProps {
  submitting: boolean;
  onSubmit: (values: WardrobeFormValues) => Promise<void>;
}

const initialForm: WardrobeFormValues = {
  name: "",
  category: "tops",
  color: "",
  brand: "",
  imageUrl: "",
  imageFile: null,
  tags: "",
  occasions: "",
  note: ""
};

const categories: { value: WardrobeCategory; label: string }[] = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" }
];

export function AddItemForm({ submitting, onSubmit }: AddItemFormProps) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  function updateField<Key extends keyof WardrobeFormValues>(key: Key, value: WardrobeFormValues[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await onSubmit(form);
      setForm(initialForm);
      setFileInputKey((current) => current + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save the item.");
    }
  }

  function fillDemoItem() {
    setForm({
      name: "Soft Blue Weekend Shirt",
      category: "tops",
      color: "Blue",
      brand: "Home Edit",
      imageUrl: "https://example.com/source-shirt.jpg",
      imageFile: null,
      tags: "soft, casual, layering",
      occasions: "weekend, coffee, travel",
      note: "Lightweight shirt for relaxed but polished daily outfits."
    });
    setFileInputKey((current) => current + 1);
  }

  return (
    <form onSubmit={handleSubmit} className="section-card subtle-card rounded-[32px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Add clothing</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Save a new item into the SQLite wardrobe, with either a remote source URL or a local image upload for later AI cleanup.
          </p>
        </div>

        <button type="button" onClick={fillDemoItem} className="pill transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
          <Wand2 className="size-4" />
          Fill demo
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Name</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="Soft blazer, pleated skirt..." />
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
            <input value={form.color} onChange={(event) => updateField("color", event.target.value)} required className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="Ivory, Navy, Mint..." />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Brand</span>
          <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="Optional personal label or brand" />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <ImagePlus className="size-4" />
            Upload local image
          </span>
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            onChange={(event) => updateField("imageFile", event.currentTarget.files?.[0] ?? null)}
            className="w-full rounded-[22px] border border-dashed border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--ink-strong)]"
          />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {form.imageFile ? `Ready to upload: ${form.imageFile.name}` : "Attach a garment photo from your device to test the local upload flow."}
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Original image URL</span>
          <input value={form.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="Optional image reference for future processing" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Tags</span>
          <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="comma separated: office, soft-formal, layering" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Occasions</span>
          <input value={form.occasions} onChange={(event) => updateField("occasions", event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="comma separated: date, weekend, meeting" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Styling note</span>
          <textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} className="min-h-28 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" placeholder="Short note about silhouette, fabric, or styling role..." />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-[5.4rem] mt-5 rounded-[24px] border border-[var(--line)] bg-white/88 px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <button type="submit" disabled={submitting || form.name.trim().length < 2 || form.color.trim().length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto">
          {submitting ? "Saving..." : form.imageFile ? "Save item and upload image" : "Save to wardrobe"}
        </button>
      </div>
    </form>
  );
}
