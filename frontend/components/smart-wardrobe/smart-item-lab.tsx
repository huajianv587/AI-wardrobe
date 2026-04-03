"use client";

/* eslint-disable @next/next/no-img-element */

import { resolveAssetUrl } from "@/lib/api";
import { WardrobeItem } from "@/store/wardrobe-store";

interface SmartItemLabProps {
  item: WardrobeItem | null;
  processing: boolean;
  queueing: boolean;
  enriching: boolean;
  statusText: string;
  onProcess: (itemId: number) => Promise<void>;
  onQueue: (itemId: number) => Promise<void>;
  onAutoEnrich: (itemId: number) => Promise<void>;
}

export function SmartItemLab({
  item,
  processing,
  queueing,
  enriching,
  statusText,
  onProcess,
  onQueue,
  onAutoEnrich
}: SmartItemLabProps) {
  const sourceUrl = resolveAssetUrl(item?.imageUrl);
  const processedUrl = resolveAssetUrl(item?.processedImageUrl);

  if (!item) {
    return (
      <section className="section-card rounded-[32px] p-5">
        <div className="pill mb-3">智能衣物管理</div>
        <h3 className="text-xl font-semibold text-[var(--ink-strong)]">先选中一件单品</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          这个页面负责 AI 抠图、白底图、异步任务和自动补全。先从左侧选中一件衣服，再启动智能流程。
        </p>
      </section>
    );
  }

  return (
    <section className="section-card rounded-[32px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="pill mb-3">AI 自动识别入口</div>
          <h3 className="text-xl font-semibold text-[var(--ink-strong)]">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            手动修改不在这里做。这里专门跑图片处理、自动补全、异步任务和 AI 提示信息。
          </p>
        </div>
        <div className="pill">{item.category}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[26px] border border-[var(--line)] bg-white/82 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">原图输入</p>
          <div className="mt-3 overflow-hidden rounded-[22px] bg-[var(--background-soft)]">
            {sourceUrl ? (
              <img src={sourceUrl} alt={item.name} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-[var(--muted)]">还没有原图，先去“衣橱管理”上传图片。</div>
            )}
          </div>
        </article>

        <article className="rounded-[26px] border border-[var(--line)] bg-white/82 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">AI 输出</p>
          <div className="mt-3 overflow-hidden rounded-[22px] bg-[var(--background-soft)]">
            {processedUrl ? (
              <img src={processedUrl} alt={`${item.name} processed`} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-[var(--muted)]">抠图、白底图和处理结果会显示在这里。</div>
            )}
          </div>
        </article>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onProcess(item.id)}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? "处理中..." : "立即 AI 处理"}
        </button>

        <button
          type="button"
          onClick={() => void onQueue(item.id)}
          disabled={queueing}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/82 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {queueing ? "排队中..." : "加入异步队列"}
        </button>

        <button
          type="button"
          onClick={() => void onAutoEnrich(item.id)}
          disabled={enriching}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/82 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enriching ? "识别中..." : "自动补全标签"}
        </button>
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/82 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
        {statusText}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">AI 标签</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.length > 0 ? item.tags.map((tag) => <span key={tag} className="pill">{tag}</span>) : <span className="text-sm text-[var(--muted)]">等待自动补全</span>}
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">AI 场景</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.occasions.length > 0 ? item.occasions.map((occasion) => <span key={occasion} className="pill">{occasion}</span>) : <span className="text-sm text-[var(--muted)]">等待场景识别</span>}
          </div>
        </article>
      </div>

      <article className="mt-4 rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">风格说明</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {item.note || "自动 enrich 后会把材质、气质和使用建议补在这里。"}
        </p>
      </article>

      {item.memoryCard ? (
        <article className="mt-4 rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,243,237,0.92),rgba(255,255,255,0.82),rgba(236,247,240,0.86))] p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">记忆卡线索</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.memoryCard.highlights.map((highlight) => (
              <span key={highlight} className="pill">{highlight}</span>
            ))}
            {item.memoryCard.avoidContexts.map((avoid) => (
              <span key={avoid} className="pill">{avoid}</span>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
