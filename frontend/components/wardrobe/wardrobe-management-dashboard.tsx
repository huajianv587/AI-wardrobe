"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Cloud, Database, PencilLine, RefreshCw } from "lucide-react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { AddItemForm } from "@/components/wardrobe/add-item-form";
import { FilterBar } from "@/components/wardrobe/filter-bar";
import { ManualItemEditor } from "@/components/wardrobe/manual-item-editor";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import {
  ApiError,
  createWardrobeItem,
  deleteWardrobeItem,
  fetchWardrobeItems,
  updateWardrobeItem,
  uploadWardrobeItemImage,
  WardrobeFormValues
} from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { seedWardrobeItems, useWardrobeStore } from "@/store/wardrobe-store";

type StatusTone = "loading" | "connected" | "error";

const statusCopy: Record<StatusTone, { label: string; accent: string }> = {
  loading: { label: "正在连接衣橱数据", accent: "var(--accent-soft)" },
  connected: { label: "衣橱管理已接入后端", accent: "var(--accent-mint)" },
  error: { label: "本次操作没有成功", accent: "var(--accent-rose)" }
};

export function WardrobeManagementDashboard() {
  const { ready: authReady, isAuthenticated, user } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const selectedItemId = useWardrobeStore((state) => state.selectedItemId);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);
  const prependItem = useWardrobeStore((state) => state.prependItem);
  const upsertItem = useWardrobeStore((state) => state.upsertItem);
  const removeItem = useWardrobeStore((state) => state.removeItem);

  const [statusTone, setStatusTone] = useState<StatusTone>("loading");
  const [statusText, setStatusText] = useState("正在读取你的私人衣橱...");
  const [creating, setCreating] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const sourceCount = items.filter((item) => Boolean(item.imageUrl)).length;
  const previewMode = !isAuthenticated;

  const loadWardrobe = useCallback(async () => {
    setStatusTone("loading");
    setStatusText("正在读取你的私人衣橱...");

    try {
      if (previewMode) {
        startTransition(() => replaceItems(seedWardrobeItems));
        setStatusTone("connected");
        setStatusText("访客预览模式已刷新，现在展示的是演示衣橱结构。登录后这里会切换成你的真实单品。");
        return;
      }

      const payload = await fetchWardrobeItems();
      startTransition(() => replaceItems(payload));
      setStatusTone("connected");
      setStatusText(
        payload.length > 0
          ? `已同步 ${payload.length} 件单品，你可以开始整理、筛选和修改标签。`
          : "衣橱还是空的，现在就可以从第一件常穿单品开始上传。"
      );
    } catch (error) {
      startTransition(() => replaceItems([]));
      setStatusTone("error");
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "登录状态失效了，请重新进入注册 / 登录页。"
          : error instanceof Error
            ? error.message
            : "暂时无法读取衣橱数据。"
      );
    }
  }, [previewMode, replaceItems]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      startTransition(() => replaceItems(seedWardrobeItems));
      setStatusTone("connected");
      setStatusText("当前是访客预览模式，你可以先看完整衣橱管理界面；登录后才会真正保存、删除和修改自己的数据。");
      return;
    }

    void loadWardrobe();
  }, [authReady, isAuthenticated, loadWardrobe, replaceItems]);

  async function handleCreateItem(values: WardrobeFormValues) {
    setCreating(true);

    if (previewMode) {
      setCreating(false);
      setStatusTone("connected");
      setStatusText("访客预览模式下不会真正新增单品，登录后就能开始保存到你的私人衣橱。");
      return;
    }

    try {
      let created = await createWardrobeItem(values);

      if (values.imageFile) {
        created = await uploadWardrobeItemImage(created.id, values.imageFile);
      }

      startTransition(() => prependItem(created));
      setStatusTone("connected");
      setStatusText(values.imageFile ? `已添加 ${created.name}，并同步了原图。` : `已把 ${created.name} 收进衣橱。`);
    } catch (error) {
      setStatusTone("error");
      setStatusText(error instanceof Error ? error.message : "添加单品失败。");
      throw error;
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateItem(itemId: number, values: WardrobeFormValues) {
    setSavingItemId(itemId);

    if (previewMode) {
      setSavingItemId(null);
      setStatusTone("connected");
      setStatusText("访客预览模式下不会真正修改单品，登录后就能保存标签、信息和图片替换。");
      return;
    }

    try {
      let updated = await updateWardrobeItem(itemId, values);

      if (values.imageFile) {
        updated = await uploadWardrobeItemImage(itemId, values.imageFile);
      }

      startTransition(() => upsertItem(updated));
      setStatusTone("connected");
      setStatusText(values.imageFile ? `已更新 ${updated.name}，并替换图片。` : `已保存 ${updated.name} 的手动整理信息。`);
    } catch (error) {
      setStatusTone("error");
      setStatusText(error instanceof Error ? error.message : "更新单品失败。");
      throw error;
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleDeleteItem(itemId: number) {
    setDeletingItemId(itemId);

    if (previewMode) {
      setDeletingItemId(null);
      setStatusTone("connected");
      setStatusText("访客预览模式下不会真正删除单品，登录后就能管理自己的衣橱。");
      return;
    }

    try {
      const result = await deleteWardrobeItem(itemId);
      startTransition(() => removeItem(itemId));
      setStatusTone("connected");
      setStatusText(`已删除单品 #${result.id}。`);
    } catch (error) {
      setStatusTone("error");
      setStatusText(error instanceof Error ? error.message : "删除单品失败。");
      throw error;
    } finally {
      setDeletingItemId(null);
    }
  }

  if (!authReady) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-6">
        {previewMode ? (
          <VisitorPreviewNotice description="你现在看到的是完整的衣橱管理工作台预览版。筛选、浏览和界面结构都可以先体验，真正的上传添加、删除、替换图片和保存标签会在登录后接到你的私人数据。" />
        ) : null}

        <section className="section-card story-gradient rounded-[32px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[24px] p-3" style={{ background: statusCopy[statusTone].accent }}>
                {statusTone === "connected" ? <Cloud className="size-5 text-[var(--ink-strong)]" /> : <Database className="size-5 text-[var(--ink-strong)]" />}
              </div>
              <div>
                <p className="pill mb-3">{statusCopy[statusTone].label}</p>
                <h3 className="text-xl font-semibold text-[var(--ink-strong)]">衣橱管理工作台</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{statusText}</p>
                {user ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">当前账号: {user.email}</p> : previewMode ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">当前状态: 访客浏览</p> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadWardrobe()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/82 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <RefreshCw className="size-4" />
              刷新衣橱
            </button>
          </div>

          <div className="ambient-divider my-5" />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">总单品数</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{items.length}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">上传、整理和删除都从这里开始。</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">已带原图</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{sourceCount}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">保留原图 URL 和本地上传入口，方便后续 AI 流程继续处理。</p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">当前焦点</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{selectedItem?.name ?? "等待选择"}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">手动编辑标签、场景、备注和图片都放在右侧面板。</p>
            </div>
          </div>
        </section>

        <FilterBar />
        <WardrobeGrid />
      </div>

      <div className="space-y-6">
        <section className="section-card rounded-[32px] p-5">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffdacc_0%,#fff4ec_55%,#dff5eb_100%)] p-3 text-[var(--ink-strong)]">
              <PencilLine className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">入口拆分后</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">这里只做人工整理</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                上传添加、整理、删除、筛选、手动修改标签和信息，都留在这个页面；AI 自动识别与图片处理会单独放到“智能衣物管理”。
              </p>
            </div>
          </div>
        </section>

        <AddItemForm submitting={creating} disabled={previewMode} onSubmit={handleCreateItem} />
        <ManualItemEditor
          item={selectedItem}
          disabled={previewMode}
          saving={savingItemId === selectedItem?.id}
          deleting={deletingItemId === selectedItem?.id}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
      </div>
    </div>
  );
}
