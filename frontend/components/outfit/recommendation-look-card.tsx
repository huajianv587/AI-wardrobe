"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, CheckCheck, Heart, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";

import { StoryCluster } from "@/components/ui/story-cluster";
import { createWearLog, recordRecommendationFeedback, RecommendationCard as RecommendationCardData, saveAssistantOutfit } from "@/lib/api";
import { WardrobeItem } from "@/store/wardrobe-store";

interface RecommendationLookCardProps {
  recommendation: RecommendationCardData;
  items: WardrobeItem[];
  prompt?: string;
  scene?: string;
  previewMode?: boolean;
  onActionComplete?: (message: string) => void;
}

function findItem(items: WardrobeItem[], itemId: number) {
  return items.find((item) => item.id === itemId) ?? null;
}

export function RecommendationLookCard({
  recommendation,
  items,
  prompt,
  scene,
  previewMode = false,
  onActionComplete
}: RecommendationLookCardProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionEcho, setActionEcho] = useState<string>("");

  function buildModeAwareMessage(message: string) {
    return previewMode ? `${message} 预览模式会先把这次操作保留在本地，登录后再同步到你的账号。` : message;
  }

  function completePreviewAction(message: string) {
    const finalMessage = buildModeAwareMessage(message);
    setActionEcho(finalMessage);
    onActionComplete?.(finalMessage);
    setBusyAction(null);
  }

  async function handleFeedback(action: string, successMessage: string) {
    setBusyAction(action);

    if (previewMode) {
      completePreviewAction(successMessage);
      return;
    }

    try {
      await recordRecommendationFeedback({
        prompt,
        scene,
        action,
        item_ids: recommendation.itemIds,
        feedback_note: recommendation.rationale,
        metadata_json: {
          title: recommendation.title,
          confidence: recommendation.confidence,
          confidence_label: recommendation.confidenceLabel
        }
      });
      completePreviewAction(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "暂时无法记录这次推荐反馈。";
      setActionEcho(message);
      onActionComplete?.(message);
      setBusyAction(null);
    }
  }

  async function handleSave() {
    setBusyAction("save");

    if (previewMode) {
      completePreviewAction("这套搭配已经先保存在本地预览板。");
      return;
    }

    try {
      await saveAssistantOutfit({
        name: recommendation.title,
        occasion: scene ?? "assistant",
        style: recommendation.reasonBadges[0] ?? "personalized",
        item_ids: recommendation.itemIds,
        reasoning: recommendation.rationale
      });
      completePreviewAction("这套搭配已经保存到你的私有穿搭板。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "暂时无法保存这套搭配。";
      setActionEcho(message);
      onActionComplete?.(message);
      setBusyAction(null);
    }
  }

  async function handleWearLog() {
    setBusyAction("wear");

    if (previewMode) {
      completePreviewAction("这套搭配已经先记入本地预览时间线。");
      return;
    }

    try {
      await createWearLog({
        outfit_name: recommendation.title,
        item_ids: recommendation.itemIds,
        occasion: scene ?? "assistant",
        period: "all-day",
        feedback_note: "Marked as worn from the recommendation card."
      });
      completePreviewAction("这套搭配已经记录到你的穿着历史。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "暂时无法创建穿着记录。";
      setActionEcho(message);
      onActionComplete?.(message);
      setBusyAction(null);
    }
  }

  const substituteNames = recommendation.substituteItemIds
    .map((itemId) => findItem(items, itemId)?.name ?? `#${itemId}`)
    .join(" / ");

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="section-card rounded-[32px] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="pill mb-3">
            <Sparkles className="size-4" />
            {recommendation.moodEmoji ?? "风格"} {recommendation.confidenceLabel ?? "专属搭配"}
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">{recommendation.title}</h4>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{recommendation.rationale}</p>
        </div>
        <div className="rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)]">
          {recommendation.confidence ? `匹配度 ${Math.round(recommendation.confidence * 100)}%` : "已精选"}
        </div>
      </div>

      {recommendation.charmCopy ? (
        <div className="mt-4 rounded-[28px] border border-[rgba(255,154,123,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,239,0.9))] px-4 py-4 text-sm leading-6 text-[var(--ink)] shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl">{recommendation.charmCopy}</p>
            <StoryCluster
              emoji={recommendation.moodEmoji ?? "Look"}
              title="像你会穿的样子"
              chips={recommendation.reasonBadges.length > 0 ? recommendation.reasonBadges : ["平衡", "轻松", "柔和自信"]}
              tone="peach"
              compact
            />
          </div>
        </div>
      ) : null}

      {recommendation.reasonBadges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.reasonBadges.map((badge) => (
            <span key={badge} className="pill">
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      {actionEcho ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-[22px] border border-[rgba(255,154,123,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,239,0.92))] px-4 py-3 text-sm leading-6 text-[var(--ink)]"
        >
          {actionEcho}
        </motion.div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {recommendation.itemIds.map((itemId) => {
          const piece = findItem(items, itemId);
          if (!piece) {
            return null;
          }

          return (
            <motion.div key={piece.id} whileHover={{ y: -4, scale: 1.015, rotate: -0.3 }} className="tap-card rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="mb-3 h-24 rounded-[18px]" style={{ background: `linear-gradient(160deg, ${piece.colorHex} 0%, rgba(255,255,255,0.96) 100%)` }} />
              <p className="font-medium text-[var(--ink-strong)]">{piece.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {piece.category} / {piece.color}
              </p>
              {piece.memoryCard?.highlights?.[0] ? (
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{piece.memoryCard.highlights[0]}</p>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {recommendation.substituteItemIds.length > 0 ? (
        <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          可替换单品：{substituteNames}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void handleFeedback("liked", "这次偏好已记下，后续推荐会更贴近你。")}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "liked" ? <LoaderCircle className="size-4 animate-spin" /> : <Heart className="size-4" />}
          喜欢
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void handleSave()}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Bookmark className="size-4" />}
          保存搭配
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void handleWearLog()}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "wear" ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
          今天穿它
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void handleFeedback("dismissed", "这条搭配方向的权重已经调低。")}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "dismissed" ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          不像我
        </motion.button>
      </div>
    </motion.article>
  );
}
