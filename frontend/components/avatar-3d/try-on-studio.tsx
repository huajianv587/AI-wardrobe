"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "framer-motion";
import { GripVertical, RefreshCw, Sparkles } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { AvatarStage } from "@/components/avatar-3d/avatar-stage";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { StateCard } from "@/components/ui/state-card";
import { StoryCluster } from "@/components/ui/story-cluster";
import { fetchWardrobeItems } from "@/lib/api";
import { useWardrobeStore } from "@/store/wardrobe-store";

interface AbsorbBurst {
  id: number;
  name: string;
  colorHex: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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
  const [hasHydratedWardrobe, setHasHydratedWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [dropHovered, setDropHovered] = useState(false);
  const [absorbBurst, setAbsorbBurst] = useState<AbsorbBurst | null>(null);
  const [absorbLabel, setAbsorbLabel] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragGuardRef = useRef<{ itemId: number | null; until: number }>({ itemId: null, until: 0 });

  const wearingItems = items.filter((item) => selectedTryOnIds.includes(item.id));

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

    if (!isAuthenticated) {
      startTransition(() => replaceItems([]));
      setHasHydratedWardrobe(false);
      setStatusText("");
      return;
    }

    if (items.length > 0 || hasHydratedWardrobe) {
      return;
    }

    let active = true;

    async function hydrateWardrobe() {
      setHydratingWardrobe(true);
      setStatusText("Loading your wardrobe so the try-on stage can use your private items.");

      try {
        const wardrobeItems = await fetchWardrobeItems();

        if (!active) {
          return;
        }

        startTransition(() => replaceItems(wardrobeItems));
        setStatusText(
          wardrobeItems.length > 0
            ? `Loaded ${wardrobeItems.length} private wardrobe items for try-on.`
            : "Your wardrobe is empty. Add clothing first, then return to build looks in the try-on studio."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setStatusText(error instanceof Error ? error.message : "Could not load wardrobe items for try-on.");
      } finally {
        if (active) {
          setHasHydratedWardrobe(true);
          setHydratingWardrobe(false);
        }
      }
    }

    void hydrateWardrobe();

    return () => {
      active = false;
    };
  }, [authReady, hasHydratedWardrobe, isAuthenticated, items.length, replaceItems]);

  if (!authReady) {
    return <PanelSkeleton rows={2} />;
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to open your try-on studio"
        description="The 2.5D try-on stage now uses the same authenticated wardrobe store as the rest of the app, so only the signed-in user's items appear here."
      />
    );
  }

  const draggingItem = items.find((item) => item.id === draggingItemId) ?? null;

  function getStageRect() {
    return stageRef.current?.getBoundingClientRect() ?? null;
  }

  function isPointInsideMagneticZone(point: { x: number; y: number }) {
    const rect = getStageRect();

    if (!rect) {
      return false;
    }

    const magneticPadding = 42;

    return (
      point.x >= rect.left - magneticPadding &&
      point.x <= rect.right + magneticPadding &&
      point.y >= rect.top - magneticPadding &&
      point.y <= rect.bottom + magneticPadding
    );
  }

  function setStageHoverFromPoint(point: { x: number; y: number }, itemName?: string) {
    const nextHovered = isPointInsideMagneticZone(point);

    if (nextHovered !== dropHovered) {
      setStatusText(
        nextHovered
          ? `${itemName ?? "This piece"} is inside the avatar's magnetic field. Let go and the stage will snap it in.`
          : itemName
            ? `Keep pulling ${itemName} toward the avatar to let the stage absorb it.`
            : "Keep pulling toward the avatar to let the stage absorb the garment."
      );
    }

    setDropHovered(nextHovered);
    return nextHovered;
  }

  function triggerAbsorbBurst(itemId: number, point: { x: number; y: number }) {
    const item = items.find((entry) => entry.id === itemId);
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
    setStatusText(`Updated avatar layers with ${items.find((item) => item.id === itemId)?.name ?? "the selected garment"}.`);
  }

  function handleRailTap(itemId: number, active: boolean) {
    if (dragGuardRef.current.itemId === itemId && dragGuardRef.current.until > Date.now()) {
      return;
    }

    toggleTryOnItem(itemId);
    const item = items.find((entry) => entry.id === itemId);
    setStatusText(
      active
        ? `${item?.name ?? "That piece"} slipped back off the avatar.`
        : `${item?.name ?? "That piece"} is now on the avatar.`
    );
  }

  function handleDrag(itemId: number, info: PanInfo) {
    const item = items.find((entry) => entry.id === itemId);
    setDraggingItemId(itemId);
    setStageHoverFromPoint(info.point, item?.name);
  }

  function handleDragEnd(itemId: number, info: PanInfo) {
    const item = items.find((entry) => entry.id === itemId);
    const snapped = isPointInsideMagneticZone(info.point);

    dragGuardRef.current = { itemId, until: Date.now() + 180 };
    setDraggingItemId(null);
    setDropHovered(false);

    if (snapped) {
      triggerAbsorbBurst(itemId, info.point);
      handleDropItem(itemId);
      return;
    }

    setStatusText(`${item?.name ?? "That piece"} snapped back to the rail. Tap it if you want to wear it instantly.`);
  }

  return (
    <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <AnimatePresence>
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

        {items.length === 0 ? (
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
            {dropHovered ? `The avatar is pulling ${draggingItem.name} in.` : `Drag ${draggingItem.name} toward the avatar for a snap-in preview.`}
          </motion.div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const active = selectedTryOnIds.includes(item.id);

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
                  scale: 1.04,
                  rotate: active ? 0 : -1.3,
                  zIndex: 50,
                  boxShadow: "0 26px 62px rgba(69, 54, 31, 0.18)",
                  cursor: "grabbing"
                }}
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
                style={{ touchAction: "none" }}
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
