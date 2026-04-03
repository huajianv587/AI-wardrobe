"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react";

import { resolveAssetUrl, WardrobeFormValues } from "@/lib/api";
import { WardrobeCategory, WardrobeItem } from "@/store/wardrobe-store";

interface ManualItemEditorProps {
  item: WardrobeItem | null;
  disabled?: boolean;
  saving: boolean;
  deleting: boolean;
  onUpdate: (itemId: number, values: WardrobeFormValues) => Promise<void>;
  onDelete: (itemId: number) => Promise<void>;
}

const categories: { value: WardrobeCategory; label: string }[] = [
  { value: "tops", label: "上衣" },
  { value: "bottoms", label: "下装" },
  { value: "outerwear", label: "外搭" },
  { value: "shoes", label: "鞋子" },
  { value: "accessories", label: "配饰" }
];

function buildForm(item: WardrobeItem): WardrobeFormValues {
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

export function ManualItemEditor({
  item,
  disabled = false,
  saving,
  deleting,
  onUpdate,
  onDelete
}: ManualItemEditorProps) {
  const [form, setForm] = useState<WardrobeFormValues | null>(item ? buildForm(item) : null);
  const [error, setError] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setForm(item ? buildForm(item) : null);
    setError("");
    setFileInputKey((current) => current + 1);
  }, [item]);

  const sourcePreviewUrl = useMemo(() => resolveAssetUrl(item?.imageUrl), [item?.imageUrl]);
  const processedPreviewUrl = useMemo(() => resolveAssetUrl(item?.processedImageUrl), [item?.processedImageUrl]);

  function updateField<Key extends keyof WardrobeFormValues>(key: Key, value: WardrobeFormValues[Key]) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!item || !form) {
      return;
    }

    if (disabled) {
      setError("当前是访客预览模式，登录后才能真正修改衣物信息。");
      return;
    }

    setError("");

    try {
      await onUpdate(item.id, form);
      setFileInputKey((current) => current + 1);
      setForm((current) => current ? { ...current, imageFile: null } : current);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update the item.");
    }
  }

  async function handleDelete() {
    if (!item) {
      return;
    }

    if (disabled) {
      setError("当前是访客预览模式，登录后才能真正删除单品。");
      return;
    }

    setError("");

    try {
      await onDelete(item.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete the item.");
    }
  }

  if (!item || !form) {
    return (
      <section className="section-card rounded-[32px] p-5">
        <h3 className="text-xl font-semibold text-[var(--ink-strong)]">衣物信息编辑</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          先从左侧卡片墙里选中一件单品，再在这里修改它的名称、标签、场景、图片和备注。
        </p>
      </section>
    );
  }

  return (
    <section className="section-card rounded-[32px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="pill mb-3">手动整理接口</div>
          <h3 className="text-xl font-semibold text-[var(--ink-strong)]">衣物信息编辑</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            这里专门负责人工维护。你可以替换图片、改标签、改场景、改备注，不和 AI 自动补全混在一起。
          </p>
        </div>
        <div className="pill">{item.category}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[26px] border border-[var(--line)] bg-white/82 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">原图</p>
          <div className="mt-3 overflow-hidden rounded-[22px] bg-[var(--background-soft)]">
            {sourcePreviewUrl ? (
              <img src={sourcePreviewUrl} alt={item.name} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-[var(--muted)]">暂未上传原图</div>
            )}
          </div>
        </article>

        <article className="rounded-[26px] border border-[var(--line)] bg-white/82 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">处理后图片</p>
          <div className="mt-3 overflow-hidden rounded-[22px] bg-[var(--background-soft)]">
            {processedPreviewUrl ? (
              <img src={processedPreviewUrl} alt={`${item.name} processed`} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-[var(--muted)]">AI 处理结果会显示在这里</div>
            )}
          </div>
        </article>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">名称</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            disabled={disabled}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">分类</span>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value as WardrobeCategory)}
              disabled={disabled}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">颜色</span>
            <input
              value={form.color}
              onChange={(event) => updateField("color", event.target.value)}
              disabled={disabled}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">品牌 / 来源</span>
          <input
            value={form.brand}
            onChange={(event) => updateField("brand", event.target.value)}
            disabled={disabled}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <ImagePlus className="size-4" />
            替换本地图片
          </span>
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(event) => updateField("imageFile", event.currentTarget.files?.[0] ?? null)}
            className="w-full rounded-[22px] border border-dashed border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--ink-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          />
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {form.imageFile ? `准备上传: ${form.imageFile.name}` : "选一个新的本地文件，就会替换当前原图。"}
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">原图 URL</span>
          <input
            value={form.imageUrl}
            onChange={(event) => updateField("imageUrl", event.target.value)}
            disabled={disabled}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">标签</span>
          <input
            value={form.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            disabled={disabled}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="柔和, 通勤, 轻盈"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">适用场景</span>
          <input
            value={form.occasions}
            onChange={(event) => updateField("occasions", event.target.value)}
            disabled={disabled}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="上班, 约会, 周末"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">手动备注</span>
          <textarea
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            disabled={disabled}
            className="min-h-28 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="这里写人工整理备注，不是 AI 自动补全。"
          />
        </label>

        {error ? (
          <div className="rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={disabled || saving || form.name.trim().length < 2 || form.color.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "保存中..." : "保存修改"}
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={disabled || deleting}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-rose)] bg-[var(--accent-rose)]/20 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {deleting ? "删除中..." : "删除单品"}
          </button>
        </div>
      </form>
    </section>
  );
}
