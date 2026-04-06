"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "framer-motion";
import { GripVertical, RefreshCw, Sparkles } from "lucide-react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { AvatarStage } from "@/components/avatar-3d/avatar-stage";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { StateCard } from "@/components/ui/state-card";
import { StoryCluster } from "@/components/ui/story-cluster";
import { fetchWardrobeItems, renderVirtualTryOn, TryOnRenderResult } from "@/lib/api";
import { seedWardrobeItems, useWardrobeStore } from "@/store/wardrobe-store";

const TRY_ON_FOCUS_KEY = "wenwen:try-on-focus";
const TRY_ON_AVATAR_KEY = "wenwen:try-on-avatar-photo";

type RailFilter = "all" | "new" | "top" | "bottom" | "outerwear" | "shoes" | "accessory";
type SeasonFilter = "all" | "spring" | "summer" | "autumn" | "winter";
type SortMode = "focus" | "newest" | "name";

const railFilters: Array<{ value: RailFilter; label: string }> = [
  { value: "new", label: "新增" },
  { value: "all", label: "全部" },
  { value: "top", label: "上衣" },
  { value: "bottom", label: "下装" },
  { value: "outerwear", label: "外套" },
  { value: "shoes", label: "鞋子" },
  { value: "accessory", label: "配饰" },
];

const seasonFilters: Array<{ value: SeasonFilter; label: string }> = [
  { value: "all", label: "全部季节" },
  { value: "spring", label: "春" },
  { value: "summer", label: "夏" },
  { value: "autumn", label: "秋" },
  { value: "winter", label: "冬" },
];

const sortModes: Array<{ value: SortMode; label: string }> = [
  { value: "focus", label: "最新优先" },
  { value: "newest", label: "按时间" },
  { value: "name", label: "按名称" },
];

function parseStoredFocusIds() {
  try {
    const raw = window.localStorage.getItem(TRY_ON_FOCUS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as { itemIds?: number[]; at?: string };
    const itemIds = Array.isArray(parsed?.itemIds) ? parsed.itemIds.map(Number).filter(Boolean) : [];
    if (!itemIds.length) {
      return [];
    }
    if (parsed?.at) {
      const age = Date.now() - new Date(parsed.at).getTime();
      if (Number.isFinite(age) && age > 1000 * 60 * 60 * 72) {
        return [];
      }
    }
    return itemIds;
  } catch {
    return [];
  }
}

function normalizeSeasonTags(tags: string[]) {
  const joined = tags.join("|").toLowerCase();
  const normalized: string[] = [];
  if (/春|spring/.test(joined)) normalized.push("spring");
  if (/夏|summer/.test(joined)) normalized.push("summer");
  if (/秋|autumn|fall/.test(joined)) normalized.push("autumn");
  if (/冬|winter/.test(joined)) normalized.push("winter");
  return normalized;
}

interface AbsorbBurst {
  id: number;
  name: string;
  colorHex: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface DragTelemetry {
  itemId: number;
  point: { x: number; y: number };
  center: { x: number; y: number };
  strength: number;
  distance: number;
  engaged: boolean;
  vector: { x: number; y: number };
}

export function TryOnStudio() {
  const reduceMotion = useReducedMotion();
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const selectedTryOnIds = useWardrobeStore((state) => state.selectedTryOnIds);
  const toggleTryOnItem = useWardrobeStore((state) => state.toggleTryOnItem);
  const resetTryOn = useWardrobeStore((state) => state.resetTryOn);
  const setTryOnItems = useWardrobeStore((state) => state.setTryOnItems);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);

  const [hydratingWardrobe, setHydratingWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [dropHovered, setDropHovered] = useState(false);
  const [absorbBurst, setAbsorbBurst] = useState<AbsorbBurst | null>(null);
  const [absorbLabel, setAbsorbLabel] = useState<string | null>(null);
  const [dragTelemetry, setDragTelemetry] = useState<DragTelemetry | null>(null);
  const [focusItemIds, setFocusItemIds] = useState<number[]>([]);
  const [railFilter, setRailFilter] = useState<RailFilter>("new");
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("focus");
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState<string | null>(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [serverPreview, setServerPreview] = useState<TryOnRenderResult | null>(null);
  const previewMode = !isAuthenticated;
  const displayItems = items.length > 0 ? items : seedWardrobeItems;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragGuardRef = useRef<{ itemId: number | null; until: number }>({ itemId: null, until: 0 });
  const appliedFocusRef = useRef("");
  const avatarUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!absorbLabel) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAbsorbLabel(null);
    }, reduceMotion ? 120 : 820);

    return () => {
      window.clearTimeout(timer);
    };
  }, [absorbLabel, reduceMotion]);

  useEffect(() => {
    if (!absorbBurst) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAbsorbBurst(null);
    }, reduceMotion ? 120 : 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [absorbBurst, reduceMotion]);

  useEffect(() => {
    const storedFocusIds = parseStoredFocusIds();
    if (storedFocusIds.length) {
      setFocusItemIds(storedFocusIds);
      setRailFilter("new");
      setStatusText(`已接入刚解构完成的 ${storedFocusIds.length} 件单品，试衣轨道会优先展示它们。`);
    }

    try {
      const storedPhoto = window.localStorage.getItem(TRY_ON_AVATAR_KEY);
      if (storedPhoto) {
        setAvatarPhotoUrl(storedPhoto);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let active = true;

    async function hydrateWardrobe() {
      setHydratingWardrobe(true);
      setStatusText(
        isAuthenticated
          ? "Loading your wardrobe so the try-on stage can use your private items."
          : "Loading the public experience wardrobe for the try-on stage."
      );

      try {
        const wardrobeItems = await fetchWardrobeItems();

        if (!active) {
          return;
        }

        startTransition(() => replaceItems(wardrobeItems));
        setStatusText(
          wardrobeItems.length > 0
            ? isAuthenticated
              ? `Loaded ${wardrobeItems.length} private wardrobe items for try-on.`
              : `已载入 ${wardrobeItems.length} 件公开体验单品，试衣工作台和私人模式现在共用同一条读取链路。`
            : "Your wardrobe is empty. Add clothing first, then return to build looks in the try-on studio."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        startTransition(() => replaceItems(seedWardrobeItems));
        setStatusText(error instanceof Error ? `${error.message} 已切到本地降级试衣轨道。` : "Could not load wardrobe items for try-on. Switched to local fallback.");
      } finally {
        if (active) {
          setHydratingWardrobe(false);
        }
      }
    }

    void hydrateWardrobe();

    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated, replaceItems]);

  useEffect(() => {
    if (!displayItems.length || !focusItemIds.length) {
      return;
    }

    const availableFocusIds = focusItemIds.filter((itemId) => displayItems.some((item) => item.id === itemId));
    const focusSignature = availableFocusIds.join(",");
    if (!focusSignature || appliedFocusRef.current === focusSignature) {
      return;
    }

    appliedFocusRef.current = focusSignature;
    startTransition(() => setTryOnItems(availableFocusIds));
    setRailFilter("new");
    setSortMode("focus");
    setStatusText(`已把最新解构的 ${availableFocusIds.length} 件单品放到试衣舞台最前面。`);
  }, [displayItems, focusItemIds, setTryOnItems]);

  if (!authReady) {
    return <PanelSkeleton rows={2} />;
  }

  const focusSet = new Set(focusItemIds);
  const decoratedItems = displayItems.map((item) => {
    const seasonTags = normalizeSeasonTags(item.seasonTags ?? []);
    const isNewArrival = item.isNewArrival || focusSet.has(item.id) || item.tags.includes("新增");
    return {
      ...item,
      seasonTags,
      isNewArrival,
    };
  });
  const draggingItem = decoratedItems.find((item) => item.id === draggingItemId) ?? null;
  const wearingItems = decoratedItems.filter((item) => selectedTryOnIds.includes(item.id));
  const filteredItems = decoratedItems
    .filter((item) => {
      if (railFilter === "new") {
        return item.isNewArrival;
      }
      if (railFilter !== "all" && item.slot !== railFilter) {
        return false;
      }
      if (seasonFilter !== "all" && item.seasonTags.indexOf(seasonFilter) < 0) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (sortMode === "name") {
        return left.name.localeCompare(right.name, "zh-Hans-CN");
      }
      const leftFocusIndex = focusItemIds.indexOf(left.id);
      const rightFocusIndex = focusItemIds.indexOf(right.id);
      if (sortMode === "focus" && (leftFocusIndex >= 0 || rightFocusIndex >= 0)) {
        if (leftFocusIndex < 0) return 1;
        if (rightFocusIndex < 0) return -1;
        return leftFocusIndex - rightFocusIndex;
      }
      const leftStamp = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightStamp = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightStamp - leftStamp;
    });

  function handleAvatarPhotoUpload(file: File | null) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }
      setAvatarPhotoUrl(result);
      try {
        window.localStorage.setItem(TRY_ON_AVATAR_KEY, result);
      } catch {
        // ignore storage failures
      }
      setStatusText("已载入你的全身照，点击或拖拽单品会直接贴到照片舞台上。");
    };
    reader.readAsDataURL(file);
  }

  function clearAvatarPhoto() {
    setAvatarPhotoUrl(null);
    try {
      window.localStorage.removeItem(TRY_ON_AVATAR_KEY);
    } catch {
      // ignore storage failures
    }
    if (avatarUploadRef.current) {
      avatarUploadRef.current.value = "";
    }
    setStatusText("已切回 2.5D avatar 舞台。");
  }

  async function handleRenderPreview() {
    if (!selectedTryOnIds.length) {
      setStatusText("先选中至少 1 件单品，再生成试衣图。");
      return;
    }

    setRenderingPreview(true);
    setStatusText(avatarPhotoUrl ? "正在把选中的衣物贴到你的全身照上..." : "正在根据当前选中单品生成试衣预览...");

    try {
      const result = await renderVirtualTryOn({
        item_ids: selectedTryOnIds,
        person_image_url: avatarPhotoUrl,
        scene: avatarPhotoUrl ? "photo try-on" : "studio try-on",
        prompt: "Generate a polished wardrobe try-on preview."
      });
      setServerPreview(result);
      setStatusText(result.message);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "试衣图生成失败，请稍后再试。");
    } finally {
      setRenderingPreview(false);
    }
  }

  function getStageRect() {
    return stageRef.current?.getBoundingClientRect() ?? null;
  }

  function getMagneticTelemetry(itemId: number, point: { x: number; y: number }): DragTelemetry | null {
    const rect = getStageRect();

    if (!rect) {
      return null;
    }

    const magneticPadding = 42;
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const rawX = (point.x - center.x) / (rect.width / 2);
    const rawY = (point.y - center.y) / (rect.height / 2);
    const distance = Math.hypot(rawX, rawY);
    const withinPadding =
      point.x >= rect.left - magneticPadding &&
      point.x <= rect.right + magneticPadding &&
      point.y >= rect.top - magneticPadding &&
      point.y <= rect.bottom + magneticPadding;
    const strength = Math.max(0, 1 - distance / 1.26);
    const engaged = withinPadding || strength > 0.28;

    return {
      itemId,
      point,
      center,
      strength: withinPadding ? Math.max(strength, 0.34) : strength,
      distance,
      engaged,
      vector: {
        x: Math.max(-1, Math.min(1, rawX)),
        y: Math.max(-1, Math.min(1, rawY))
      }
    };
  }

  function triggerAbsorbBurst(itemId: number, point: { x: number; y: number }) {
    const item = decoratedItems.find((entry) => entry.id === itemId);
    const rect = getStageRect();

    if (!item || !rect) {
      return;
    }

    setAbsorbLabel(item.name);
    setAbsorbBurst({
      id: item.id,
      name: item.name,
      colorHex: item.colorHex,
      startX: point.x - 78,
      startY: point.y - 24,
      endX: rect.left + rect.width / 2 - 78,
      endY: rect.top + rect.height / 2 - 24
    });
  }

  function handleDropItem(itemId: number) {
    toggleTryOnItem(itemId);
    setDraggingItemId(null);
    setStatusText(`Updated avatar layers with ${decoratedItems.find((item) => item.id === itemId)?.name ?? "the selected garment"}.`);
  }

  function handleRailTap(itemId: number, active: boolean) {
    if (dragGuardRef.current.itemId === itemId && dragGuardRef.current.until > Date.now()) {
      return;
    }

    toggleTryOnItem(itemId);
    const item = decoratedItems.find((entry) => entry.id === itemId);
    setStatusText(
      active
        ? `${item?.name ?? "That piece"} slipped back off the avatar.`
        : `${item?.name ?? "That piece"} is now on the avatar.`
    );
  }

  function handleDrag(itemId: number, info: PanInfo) {
    const item = decoratedItems.find((entry) => entry.id === itemId);
    setDraggingItemId(itemId);
    const telemetry = getMagneticTelemetry(itemId, info.point);
    setDragTelemetry(telemetry);
    const nextHovered = Boolean(telemetry?.engaged);

    if (nextHovered !== dropHovered) {
      setStatusText(
        nextHovered
          ? `${item?.name ?? "This piece"} is inside the avatar's magnetic field. Let go and the stage will snap it in.`
          : item?.name
            ? `Keep pulling ${item.name} toward the avatar to let the stage absorb it.`
            : "Keep pulling toward the avatar to let the stage absorb the garment."
      );
    }

    setDropHovered(nextHovered);
  }

  function handleDragEnd(itemId: number, info: PanInfo) {
    const item = decoratedItems.find((entry) => entry.id === itemId);
    const telemetry = getMagneticTelemetry(itemId, info.point);
    const snapped = Boolean(telemetry?.engaged);

    dragGuardRef.current = { itemId, until: Date.now() + 180 };
    setDraggingItemId(null);
    setDropHovered(false);
    setDragTelemetry(null);

    if (snapped) {
      triggerAbsorbBurst(itemId, info.point);
      handleDropItem(itemId);
      return;
    }

    setStatusText(`${item?.name ?? "That piece"} snapped back to the rail. Tap it if you want to wear it instantly.`);
  }

  return (
    <div className="tryon-studio-grid relative grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      {previewMode ? (
        <div className="xl:col-span-2">
          <VisitorPreviewNotice description="当前是公开体验模式。你现在拖拽的是公开体验衣橱单品，但页面仍然优先走真实读取接口；登录后会自动切到你自己的衣橱单品。" />
        </div>
      ) : null}

      <AnimatePresence>
        {dragTelemetry && draggingItem ? (
          <motion.div
            key={`tether-${dragTelemetry.itemId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: dragTelemetry.strength > 0.08 ? 1 : 0 }}
            exit={{ opacity: 0 }}
            className="magnetic-tether"
            style={{
              left: dragTelemetry.point.x,
              top: dragTelemetry.point.y,
              width: Math.hypot(dragTelemetry.center.x - dragTelemetry.point.x, dragTelemetry.center.y - dragTelemetry.point.y),
              transform: `translateY(-50%) rotate(${Math.atan2(dragTelemetry.center.y - dragTelemetry.point.y, dragTelemetry.center.x - dragTelemetry.point.x)}rad)`
            }}
          >
            <motion.span
              animate={{ opacity: 0.2 + dragTelemetry.strength * 0.85 }}
              className="magnetic-tether-line"
              style={{
                width: "100%",
                background: `linear-gradient(90deg, color-mix(in srgb, ${draggingItem.colorHex} 70%, rgba(255,255,255,0.95)), rgba(255,255,255,0.12))`
              }}
            />
          </motion.div>
        ) : null}

        {dragTelemetry && draggingItem && dragTelemetry.strength > 0.55 ? (
          <motion.div
            key={`whisper-${dragTelemetry.itemId}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, x: dragTelemetry.point.x + 16, y: dragTelemetry.point.y - 42 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.5 }}
            className="gesture-whisper"
          >
            <div
              className="snap-hint rounded-full px-4 py-2 text-xs"
              style={{
                borderColor: `color-mix(in srgb, ${draggingItem.colorHex} 38%, rgba(255,255,255,0.82))`,
                background: `linear-gradient(180deg, rgba(255,255,255,0.96), color-mix(in srgb, ${draggingItem.colorHex} 14%, rgba(255,247,239,0.94)))`
              }}
            >
              <Sparkles className="size-3.5" />
              {dragTelemetry.strength > 0.78 ? "Locked on" : "Almost snapped"}
            </div>
          </motion.div>
        ) : null}

        {absorbBurst ? (
          <motion.div
            key={`${absorbBurst.id}-${absorbBurst.startX}-${absorbBurst.startY}`}
            initial={{ opacity: 0.95, x: absorbBurst.startX, y: absorbBurst.startY, scale: 1 }}
            animate={{ opacity: 0, x: absorbBurst.endX, y: absorbBurst.endY, scale: reduceMotion ? 0.95 : 0.24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.16 : 0.58, ease: [0.18, 1, 0.3, 1] }}
            className="pointer-events-none fixed left-0 top-0 z-[90]"
          >
            <div
              className="snap-hint min-w-[156px] justify-center text-sm font-medium"
              style={{
                background: `linear-gradient(140deg, ${absorbBurst.colorHex}26 0%, rgba(255,255,255,0.96) 100%)`,
                borderColor: `color-mix(in srgb, ${absorbBurst.colorHex} 32%, rgba(255,255,255,0.72))`
              }}
            >
              <Sparkles className="size-4" />
              {absorbBurst.name}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="tryon-stage-wrap">
        <AvatarStage
          stageRef={stageRef}
          palette={wearingItems.map((item) => item.colorHex)}
          wearingItems={wearingItems}
          avatarPhotoUrl={avatarPhotoUrl}
          dropActive={draggingItemId !== null}
          dropHovered={dropHovered}
          dropTone={draggingItem?.colorHex ?? "var(--accent)"}
          absorbActive={Boolean(absorbLabel)}
          absorbLabel={absorbLabel}
          magneticStrength={dragTelemetry?.strength ?? 0}
          magneticVector={dragTelemetry?.vector ?? null}
          dragHint={draggingItem ? `Drop ${draggingItem.name} onto the avatar to wear or remove it` : undefined}
        />
        {serverPreview ? (
          <div className="section-card subtle-card mt-4 rounded-[28px] p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="pill mb-2">Server Try-On</div>
                <h4 className="text-lg font-semibold text-[var(--ink-strong)]">生成试衣图</h4>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {serverPreview.providerMode === "remote" ? "远端模型结果" : serverPreview.providerMode === "remote-fallback-local" ? "远端失败后已切到本地生成" : "本地试衣合成结果"}
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--line)] bg-white/80 px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                {serverPreview.provider}
              </div>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/75">
              <img src={serverPreview.previewUrl} alt="Generated try-on preview" className="h-auto w-full object-cover" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="tryon-panel section-card subtle-card rounded-[32px] p-4 sm:p-5">
        <div className="tryon-panel-head mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="tryon-panel-copy">
            <h3 className="text-lg font-semibold text-[var(--ink-strong)] sm:text-xl">新增单品试衣工作台</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">新解构出来的衣服会优先排在前面，点一下就能直接贴到舞台或全身照上。</p>
            {statusText ? <p className="tryon-status-text mt-2 text-xs leading-5 text-[var(--muted)]">{statusText}</p> : null}
          </div>
          <StoryCluster
            emoji="🪄"
            title={draggingItem ? "magnetic mode" : "new drops first"}
            chips={draggingItem ? ["snap ready", "avatar awake", "release softly"] : ["新增优先", "照片舞台", "直接试穿"]}
            tone={draggingItem ? "sky" : "peach"}
            compact
          />

          <div className="tryon-stage-actions flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => avatarUploadRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <Sparkles className="size-4" />
              {avatarPhotoUrl ? "更换全身照" : "上传全身照"}
            </button>
            {avatarPhotoUrl ? (
              <button
                type="button"
                onClick={clearAvatarPhoto}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                清除照片
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleRenderPreview()}
              disabled={renderingPreview || !selectedTryOnIds.length}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="size-4" />
              {renderingPreview ? "生成中..." : "生成试衣图"}
            </button>
            <button
              type="button"
              onClick={resetTryOn}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <RefreshCw className="size-4" />
              {hydratingWardrobe ? "Loading..." : "Reset"}
            </button>
            <input
              ref={avatarUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAvatarPhotoUpload(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {displayItems.length === 0 ? (
          <StateCard
            variant={hydratingWardrobe ? "loading" : "empty"}
            title={hydratingWardrobe ? "Loading your try-on rail" : "Your try-on rail is still empty"}
            description={hydratingWardrobe ? "正在把你的私人衣橱装进试衣工作台。" : "先去衣橱页添加几件衣服，再回来拖到虚拟人身上，试衣区会立刻变得有意思起来。"}
          />
        ) : null}

        {draggingItem ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 snap-hint"
          >
            <Sparkles className="size-4 text-[var(--accent)]" />
            {dropHovered
              ? `The avatar is pulling ${draggingItem.name} in.`
              : dragTelemetry && dragTelemetry.strength > 0.2
                ? `${draggingItem.name} is feeling the stage's pull.`
                : `Drag ${draggingItem.name} toward the avatar for a snap-in preview.`}
          </motion.div>
        ) : null}

        <div className="tryon-filter-block mb-4 space-y-3 rounded-[28px] border border-[var(--line)] bg-white/72 p-3 sm:p-4">
          <div className="tryon-filter-row flex flex-wrap gap-2">
            {railFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRailFilter(option.value)}
                className={`tryon-chip rounded-full border px-4 py-2 text-sm transition ${
                  railFilter === option.value
                    ? "border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-float)]"
                    : "border-[var(--line)] bg-white/85 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="tryon-filter-row tryon-season-row flex flex-wrap gap-2">
            {seasonFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSeasonFilter(option.value)}
                className={`tryon-chip rounded-full border px-3 py-1.5 text-xs tracking-[0.14em] transition ${
                  seasonFilter === option.value
                    ? "border-transparent bg-[var(--ink-strong)] text-white"
                    : "border-[var(--line)] bg-white/85 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="tryon-filter-row tryon-sort-row flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">排序</span>
            {sortModes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value)}
                className={`tryon-chip rounded-full border px-3 py-1.5 text-xs transition ${
                  sortMode === option.value
                    ? "border-transparent bg-[var(--accent-soft)] text-[var(--ink-strong)]"
                    : "border-[var(--line)] bg-white/85 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                }`}
              >
                {option.label}
              </button>
            ))}
            {focusItemIds.length ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs text-[var(--ink-strong)]">
                当前有 {focusItemIds.length} 件新解构单品已置顶
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.map((item) => {
            const active = selectedTryOnIds.includes(item.id);
            const magneticStrength = draggingItemId === item.id ? dragTelemetry?.strength ?? 0 : 0;
            const dynamicShadow =
              draggingItemId === item.id
                ? `0 ${24 + magneticStrength * 20}px ${54 + magneticStrength * 32}px color-mix(in srgb, ${item.colorHex} 20%, rgba(69,54,31,0.18))`
                : undefined;
            const dynamicBackground =
              !active && magneticStrength > 0.12
                ? `linear-gradient(160deg, color-mix(in srgb, ${item.colorHex} 14%, rgba(255,255,255,0.98)) 0%, rgba(255,255,255,0.92) 100%)`
                : undefined;

            return (
              <motion.button
                key={item.id}
                type="button"
                drag
                dragSnapToOrigin
                dragElastic={0.16}
                dragMomentum
                dragTransition={{ bounceStiffness: 260, bounceDamping: 22, power: 0.2, timeConstant: 150 }}
                whileHover={{ y: -4, scale: 1.015, rotate: active ? 0 : -0.35 }}
                whileTap={{ scale: 0.985 }}
                whileDrag={{
                  scale: 1.04 + magneticStrength * 0.025,
                  rotate: active ? 0 : -1.3 - magneticStrength * 1.4,
                  zIndex: 50,
                  boxShadow: dynamicShadow ?? "0 26px 62px rgba(69, 54, 31, 0.18)",
                  cursor: "grabbing"
                }}
                animate={
                  draggingItemId === item.id
                    ? {
                        y: -magneticStrength * 8,
                        rotate: active ? 0 : -magneticStrength * 1.2
                      }
                    : {
                        y: 0,
                        rotate: 0
                      }
                }
                onDragStart={() => {
                  setDraggingItemId(item.id);
                  setStatusText(`Dragging ${item.name}. Pull it into the avatar's magnetic field to style the stage.`);
                }}
                onDrag={(_, info) => handleDrag(item.id, info)}
                onDragEnd={(_, info) => handleDragEnd(item.id, info)}
                onClick={() => handleRailTap(item.id, active)}
                className={`tryon-item-card tap-card flex w-full items-center justify-between rounded-[20px] border px-3 py-3 text-left transition sm:rounded-[24px] sm:px-4 sm:py-4 ${
                  active
                    ? "border-transparent bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]"
                    : "border-[var(--line)] bg-white/70 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
                style={{
                  touchAction: "none",
                  boxShadow: dynamicShadow,
                  background: dynamicBackground,
                  borderColor: !active && magneticStrength > 0.12 ? `color-mix(in srgb, ${item.colorHex} 38%, rgba(255,154,123,0.26))` : undefined
                }}
              >
                <div className="tryon-item-main flex items-center gap-3 sm:gap-4">
                  <div className="tryon-item-thumb relative h-[72px] w-[58px] shrink-0 overflow-hidden rounded-[16px] border border-white/50 bg-white/70 sm:h-20 sm:w-16 sm:rounded-[18px]">
                    {item.processedImageUrl || item.imageUrl ? (
                      <img src={item.processedImageUrl || item.imageUrl || ""} alt={item.name} className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]" style={{ background: `linear-gradient(145deg, ${item.colorHex}20, rgba(255,255,255,0.94))` }}>
                        {item.color}
                      </div>
                    )}
                    {item.isNewArrival ? (
                      <div className="absolute left-1.5 top-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.16em] text-white">
                        NEW
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <GripVertical className={`size-4 ${active ? "text-white/65" : "text-[var(--muted)]"}`} />
                    <div className="tryon-item-copy">
                      <p className="tryon-item-title text-sm font-medium sm:text-base">{item.name}</p>
                      <p className={`tryon-item-meta mt-1 text-xs sm:text-sm ${active ? "text-white/75" : "text-[var(--muted)]"}`}>{item.category} - {item.color}</p>
                      <p className={`tryon-item-hint mt-2 text-[11px] sm:text-xs ${active ? "text-white/65" : "text-[var(--muted)]"}`}>{active ? "Tap or drag again to remove from avatar" : "Tap to wear instantly or drag into the avatar's magnetic field"}</p>
                    </div>
                  </div>
                </div>

                <div className="tryon-item-tail flex items-center gap-3">
                  {active ? <Sparkles className="size-4 text-white/80" /> : null}
                  <span className="size-4 rounded-full border" style={{ backgroundColor: item.colorHex, borderColor: active ? "rgba(255,255,255,0.55)" : "rgba(18,32,51,0.08)" }} />
                </div>
              </motion.button>
            );
          })}

          {!filteredItems.length && displayItems.length ? (
            <StateCard
              variant="empty"
              title="当前筛选下没有单品"
              description="换一个分类、季节或排序试试，或者先回到智能衣物页继续解构新的单品。"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
