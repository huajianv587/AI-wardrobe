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
import { fetchWardrobeItems } from "@/lib/api";
import { seedWardrobeItems, useWardrobeStore } from "@/store/wardrobe-store";

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
  const replaceItems = useWardrobeStore((state) => state.replaceItems);

  const [hydratingWardrobe, setHydratingWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [dropHovered, setDropHovered] = useState(false);
  const [absorbBurst, setAbsorbBurst] = useState<AbsorbBurst | null>(null);
  const [absorbLabel, setAbsorbLabel] = useState<string | null>(null);
  const [dragTelemetry, setDragTelemetry] = useState<DragTelemetry | null>(null);
  const previewMode = !isAuthenticated;
  const displayItems = items.length > 0 ? items : seedWardrobeItems;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragGuardRef = useRef<{ itemId: number | null; until: number }>({ itemId: null, until: 0 });

  const wearingItems = displayItems.filter((item) => selectedTryOnIds.includes(item.id));

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

  if (!authReady) {
    return <PanelSkeleton rows={2} />;
  }

  const draggingItem = displayItems.find((item) => item.id === draggingItemId) ?? null;

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
    const item = displayItems.find((entry) => entry.id === itemId);
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
    setStatusText(`Updated avatar layers with ${displayItems.find((item) => item.id === itemId)?.name ?? "the selected garment"}.`);
  }

  function handleRailTap(itemId: number, active: boolean) {
    if (dragGuardRef.current.itemId === itemId && dragGuardRef.current.until > Date.now()) {
      return;
    }

    toggleTryOnItem(itemId);
    const item = displayItems.find((entry) => entry.id === itemId);
    setStatusText(
      active
        ? `${item?.name ?? "That piece"} slipped back off the avatar.`
        : `${item?.name ?? "That piece"} is now on the avatar.`
    );
  }

  function handleDrag(itemId: number, info: PanInfo) {
    const item = displayItems.find((entry) => entry.id === itemId);
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
    const item = displayItems.find((entry) => entry.id === itemId);
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
    <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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

      <div>
        <AvatarStage
          stageRef={stageRef}
          palette={wearingItems.map((item) => item.colorHex)}
          dropActive={draggingItemId !== null}
          dropHovered={dropHovered}
          dropTone={draggingItem?.colorHex ?? "var(--accent)"}
          absorbActive={Boolean(absorbLabel)}
          absorbLabel={absorbLabel}
          magneticStrength={dragTelemetry?.strength ?? 0}
          magneticVector={dragTelemetry?.vector ?? null}
          dragHint={draggingItem ? `Drop ${draggingItem.name} onto the avatar to wear or remove it` : undefined}
        />
      </div>

      <div className="section-card subtle-card rounded-[32px] p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[var(--ink-strong)]">2.5D Try-On Studio</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Select pieces to preview the layered avatar stage.</p>
            {statusText ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{statusText}</p> : null}
          </div>
          <StoryCluster
            emoji="🪄"
            title={draggingItem ? "magnetic mode" : "tap or toss"}
            chips={draggingItem ? ["snap ready", "avatar awake", "release softly"] : ["tap to wear", "drag to stage", "low-friction"]}
            tone={draggingItem ? "sky" : "peach"}
            compact
          />

          <button
            type="button"
            onClick={resetTryOn}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <RefreshCw className="size-4" />
            {hydratingWardrobe ? "Loading..." : "Reset"}
          </button>
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

        <div className="space-y-3">
          {displayItems.map((item) => {
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
                className={`tap-card flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
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
                <div>
                  <div className="flex items-center gap-2">
                    <GripVertical className={`size-4 ${active ? "text-white/65" : "text-[var(--muted)]"}`} />
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <p className={`mt-1 text-sm ${active ? "text-white/75" : "text-[var(--muted)]"}`}>{item.category} - {item.color}</p>
                  <p className={`mt-2 text-xs ${active ? "text-white/65" : "text-[var(--muted)]"}`}>{active ? "Tap or drag again to remove from avatar" : "Tap to wear instantly or drag into the avatar's magnetic field"}</p>
                </div>

                <div className="flex items-center gap-3">
                  {active ? <Sparkles className="size-4 text-white/80" /> : null}
                  <span className="size-4 rounded-full border" style={{ backgroundColor: item.colorHex, borderColor: active ? "rgba(255,255,255,0.55)" : "rgba(18,32,51,0.08)" }} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
