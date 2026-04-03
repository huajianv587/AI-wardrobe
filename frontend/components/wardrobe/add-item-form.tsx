"use client";

import { useState } from "react";
import { ImagePlus, Wand2 } from "lucide-react";
import { WardrobeFormValues } from "@/lib/api";
import { WardrobeCategory } from "@/store/wardrobe-store";

interface AddItemFormProps {
  submitting: boolean;
  disabled?: boolean;
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
  { value: "tops", label: "上衣" },
  { value: "bottoms", label: "下装" },
  { value: "outerwear", label: "外搭" },
  { value: "shoes", label: "鞋子" },
  { value: "accessories", label: "配饰" }
];

export function AddItemForm({ submitting, disabled = false, onSubmit }: AddItemFormProps) {
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

    if (disabled) {
      setError("当前是访客预览模式，登录后才能真正保存新单品。");
      return;
    }

    try {
      await onSubmit(form);
      setForm(initialForm);
      setFileInputKey((current) => current + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存单品失败。");
    }
  }

  function fillDemoItem() {
    setForm({
      name: "柔雾蓝周末衬衫",
      category: "tops",
      color: "浅蓝",
      brand: "私人衣橱",
      imageUrl: "https://example.com/source-shirt.jpg",
      imageFile: null,
      tags: "柔和, 轻松, 可叠穿",
      occasions: "周末, 咖啡店, 出行",
      note: "适合轻松但不邋遢的日常穿搭，可以作为温柔系外出 look 的基础单品。"
    });
    setFileInputKey((current) => current + 1);
  }

  return (
    <form onSubmit={handleSubmit} className="section-card subtle-card rounded-[32px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--ink-strong)]">添加衣物</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            这里负责最基础的收纳动作: 新增一件衣服，带上本地图片或原图 URL，后面再去智能衣物页做 AI 处理。
          </p>
        </div>

        <button type="button" onClick={fillDemoItem} disabled={disabled} className="pill transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60">
          <Wand2 className="size-4" />
          一键填充示例
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">名称</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="柔软西装外套、百褶裙..." />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">分类</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value as WardrobeCategory)} disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70">
              {categories.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">颜色</span>
            <input value={form.color} onChange={(event) => updateField("color", event.target.value)} required disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="奶油白、藏蓝、雾粉..." />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">品牌 / 来源</span>
          <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="可选，记录品牌或来源" />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <ImagePlus className="size-4" />
            本地上传图片
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
            {form.imageFile ? `准备上传: ${form.imageFile.name}` : "从你的设备选择一张衣物图，测试本地上传和后续处理流程。"}
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">原图 URL</span>
          <input value={form.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="可选，保留原图地址供后续 AI 使用" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">标签</span>
          <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="用逗号分隔: 通勤, 轻柔, 可叠穿" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">适用场景</span>
          <input value={form.occasions} onChange={(event) => updateField("occasions", event.target.value)} disabled={disabled} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="用逗号分隔: 约会, 周末, 会议" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">整理备注</span>
          <textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} disabled={disabled} className="min-h-28 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70" placeholder="写一点版型、材质、气质或搭配角色说明..." />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-[5.4rem] mt-5 rounded-[24px] border border-[var(--line)] bg-white/88 px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <button type="submit" disabled={disabled || submitting || form.name.trim().length < 2 || form.color.trim().length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto">
          {submitting ? "保存中..." : form.imageFile ? "保存并上传图片" : "保存到衣橱"}
        </button>
      </div>
    </form>
  );
}
