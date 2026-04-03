"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw, Sparkles } from "lucide-react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { FilterBar } from "@/components/wardrobe/filter-bar";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { SmartItemLab } from "@/components/smart-wardrobe/smart-item-lab";
import {
  ApiError,
  fetchAssistantTask,
  fetchWardrobeItems,
  processWardrobeImage,
  processWardrobeImageAsync,
  runWardrobeAutoEnrich
} from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { seedWardrobeItems, useWardrobeStore } from "@/store/wardrobe-store";

export function SmartWardrobeDashboard() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const selectedItemId = useWardrobeStore((state) => state.selectedItemId);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);
  const upsertItem = useWardrobeStore((state) => state.upsertItem);

  const [statusText, setStatusText] = useState("正在准备 AI 衣物工作台...");
  const [loading, setLoading] = useState(true);
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);
  const [queuedTaskItemId, setQueuedTaskItemId] = useState<number | null>(null);
  const [enrichingItemId, setEnrichingItemId] = useState<number | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const processedCount = items.filter((item) => Boolean(item.processedImageUrl)).length;
  const enrichedCount = items.filter((item) => item.tags.length > 0 || item.occasions.length > 0).length;
  const previewMode = !isAuthenticated;

  const loadWardrobe = useCallback(async () => {
    setLoading(true);

    try {
      if (previewMode) {
        startTransition(() => replaceItems(seedWardrobeItems));
        setStatusText("访客预览模式已刷新，现在展示的是演示衣物和 AI 处理入口。登录后会自动切换成你的真实任务结果。");
        return;
      }

      const payload = await fetchWardrobeItems();
      startTransition(() => replaceItems(payload));
      setStatusText(
        payload.length > 0
          ? "AI 图片处理、异步队列和自动补全都已经就绪，选中单品即可开始。"
          : "你的衣橱还没有单品，先去“衣橱管理”上传几件常穿衣服。"
      );
    } catch (error) {
      startTransition(() => replaceItems([]));
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "登录状态失效了，请重新登录后再使用智能衣物管理。"
          : error instanceof Error
            ? error.message
            : "暂时无法读取 AI 衣物数据。"
      );
    } finally {
      setLoading(false);
    }
  }, [previewMode, replaceItems]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      startTransition(() => replaceItems(seedWardrobeItems));
      setStatusText("当前是访客预览模式，你可以先浏览 AI 衣物管理界面；登录后才会真正接入你的原图、异步任务和自动补全结果。");
      setLoading(false);
      return;
    }

    void loadWardrobe();
  }, [authReady, isAuthenticated, loadWardrobe, replaceItems]);

  async function handleProcess(itemId: number) {
    setProcessingItemId(itemId);

    try {
      if (previewMode) {
        const item = items.find((entry) => entry.id === itemId);
        if (item) {
          startTransition(() => upsertItem({
            ...item,
            note: `${item.note} 预览模式中展示了 AI 抠图 / 白底图入口。登录后会返回真实处理图。`
          }));
        }
        setStatusText("访客预览模式下不会真正调用图片处理服务，但界面和流程已经完整展示出来。");
        return;
      }

      const processed = await processWardrobeImage(itemId);
      startTransition(() => upsertItem(processed));
      setStatusText(
        processed.processedImageUrl
          ? `已完成 ${processed.name} 的抠图 / 白底图处理。`
          : "这件单品还没有原图，所以暂时无法生成处理结果。"
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "AI 图片处理失败。");
      throw error;
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleQueue(itemId: number) {
    setQueuedTaskItemId(itemId);

    try {
      if (previewMode) {
        setStatusText("访客预览模式下不会真正加入异步队列。登录后这里会轮询任务状态并刷新结果。");
        return;
      }

      const task = await processWardrobeImageAsync(itemId);
      setStatusText(`已把任务 #${task.id} 加入异步队列，正在轮询结果...`);

      let currentStatus = task.status;
      while (currentStatus === "queued" || currentStatus === "running") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const nextTask = await fetchAssistantTask(task.id);
        currentStatus = nextTask.status;

        if (currentStatus === "completed") {
          await loadWardrobe();
          setStatusText("异步图片处理已完成，最新结果已经刷新到卡片墙。");
          break;
        }

        if (currentStatus === "failed") {
          setStatusText(nextTask.error_message ?? "异步任务执行失败。");
          break;
        }
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "加入异步队列失败。");
      throw error;
    } finally {
      setQueuedTaskItemId(null);
    }
  }

  async function handleAutoEnrich(itemId: number) {
    setEnrichingItemId(itemId);

    try {
      if (previewMode) {
        const item = items.find((entry) => entry.id === itemId);
        if (item) {
          startTransition(() => upsertItem({
            ...item,
            tags: item.tags.length > 0 ? item.tags : ["柔和", "轻盈", "预览标签"],
            occasions: item.occasions.length > 0 ? item.occasions : ["通勤", "周末"],
            note: item.note || "访客预览模式下，这里会显示 AI 自动补全的风格说明。"
          }));
        }
        setStatusText("预览模式里已经模拟补全了标签和场景，登录后这里会接真实识别结果。");
        return;
      }

      const enriched = await runWardrobeAutoEnrich(itemId);
      startTransition(() => upsertItem(enriched));
      setStatusText(`已根据 ${enriched.name} 自动补全标签、场景和风格说明。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "自动补全失败。");
      throw error;
    } finally {
      setEnrichingItemId(null);
    }
  }

  if (!authReady || loading) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        {previewMode ? (
          <VisitorPreviewNotice description="这里已经开放访客浏览。你可以先看 AI 抠图、白底图、异步处理队列和自动补全的完整界面；登录后这些按钮会连接到你自己的衣物数据。" />
        ) : null}

        <section className="section-card story-gradient rounded-[32px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe1d4_0%,#fff4ec_46%,#def4e8_100%)] p-3 text-[var(--ink-strong)]">
                <Bot className="size-5" />
              </div>
              <div>
                <div className="pill mb-3">分网页后的 AI 工位</div>
                <h3 className="text-xl font-semibold text-[var(--ink-strong)]">智能衣物管理</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{statusText}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadWardrobe()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/82 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <RefreshCw className="size-4" />
              刷新结果
            </button>
          </div>

          <div className="ambient-divider my-5" />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">处理后图片</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{processedCount}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">抠图和白底图结果会沉淀在这里。</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">已补全信息</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{enrichedCount}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">AI 会自动回填标签、场景和风格描述。</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">当前焦点</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{selectedItem?.name ?? "等待选择"}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">这一页只做智能识别和 AI 处理，不做手改。</p>
            </div>
          </div>
        </section>

        <section className="section-card rounded-[32px] p-5">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe7de_0%,#fff9f3_48%,#e5f7ee_100%)] p-3 text-[var(--ink-strong)]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">自动链路说明</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">这里和“衣橱管理”分开</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                这个页面只保留 AI 图片处理、本地 fallback、外部服务接入、异步处理队列和自动 enrich；人工修改标签和信息已经拆回衣橱管理页。
              </p>
            </div>
          </div>
        </section>

        <FilterBar />
        <WardrobeGrid />
      </div>

      <SmartItemLab
        item={selectedItem}
        processing={processingItemId === selectedItem?.id}
        queueing={queuedTaskItemId === selectedItem?.id}
        enriching={enrichingItemId === selectedItem?.id}
        statusText={statusText}
        onProcess={handleProcess}
        onQueue={handleQueue}
        onAutoEnrich={handleAutoEnrich}
      />
    </div>
  );
}
