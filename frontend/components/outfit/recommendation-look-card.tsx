"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, CheckCheck, Heart, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";

import { createWearLog, recordRecommendationFeedback, RecommendationCard as RecommendationCardData, saveAssistantOutfit } from "@/lib/api";
import { WardrobeItem } from "@/store/wardrobe-store";

interface RecommendationLookCardProps {
  recommendation: RecommendationCardData;
  items: WardrobeItem[];
  prompt?: string;
  scene?: string;
  onActionComplete?: (message: string) => void;
}

function findItem(items: WardrobeItem[], itemId: number) {
  return items.find((item) => item.id === itemId) ?? null;
}

export function RecommendationLookCard({ recommendation, items, prompt, scene, onActionComplete }: RecommendationLookCardProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function handleFeedback(action: string, successMessage: string) {
    setBusyAction(action);

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
      onActionComplete?.(successMessage);
    } catch (error) {
      onActionComplete?.(error instanceof Error ? error.message : "Could not record recommendation feedback.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSave() {
    setBusyAction("save");

    try {
      await saveAssistantOutfit({
        name: recommendation.title,
        occasion: scene ?? "assistant",
        style: recommendation.reasonBadges[0] ?? "personalized",
        item_ids: recommendation.itemIds,
        reasoning: recommendation.rationale
      });
      onActionComplete?.("这套已经存进你的私人搭配夹啦。");
    } catch (error) {
      onActionComplete?.(error instanceof Error ? error.message : "Could not save the outfit.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWearLog() {
    setBusyAction("wear");

    try {
      await createWearLog({
        outfit_name: recommendation.title,
        item_ids: recommendation.itemIds,
        occasion: scene ?? "assistant",
        period: "all-day",
        feedback_note: "Marked as worn from the recommendation card."
      });
      onActionComplete?.("已记成穿过记录，后续会帮你避开太像的重复搭配。");
    } catch (error) {
      onActionComplete?.(error instanceof Error ? error.message : "Could not create the wear log.");
    } finally {
      setBusyAction(null);
    }
  }

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
            {recommendation.moodEmoji ?? "✨"} {recommendation.confidenceLabel ?? "Personalized look"}
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">{recommendation.title}</h4>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{recommendation.rationale}</p>
        </div>
        <div className="rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)]">
          {recommendation.confidence ? `${Math.round(recommendation.confidence * 100)}% match` : "Curated"}
        </div>
      </div>

      {recommendation.charmCopy ? (
        <div className="mt-4 rounded-[24px] border border-[rgba(255,154,123,0.22)] bg-[rgba(255,255,255,0.9)] px-4 py-4 text-sm leading-6 text-[var(--ink)] shadow-[var(--shadow-soft)]">
          {recommendation.charmCopy}
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

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {recommendation.itemIds.map((itemId) => {
          const piece = findItem(items, itemId);
          if (!piece) {
            return null;
          }

          return (
            <motion.div key={piece.id} whileHover={{ y: -3, scale: 1.01 }} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="mb-3 h-24 rounded-[18px]" style={{ background: `linear-gradient(160deg, ${piece.colorHex} 0%, rgba(255,255,255,0.96) 100%)` }} />
              <p className="font-medium text-[var(--ink-strong)]">{piece.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {piece.category} · {piece.color}
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
          可替换件：{recommendation.substituteItemIds.map((itemId) => findItem(items, itemId)?.name ?? `#${itemId}`).join(" / ")}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleFeedback("liked", "已记住你偏爱这套的方向。")}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "liked" ? <LoaderCircle className="size-4 animate-spin" /> : <Heart className="size-4" />}
          喜欢
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Bookmark className="size-4" />}
          保存这套
        </button>

        <button
          type="button"
          onClick={() => void handleWearLog()}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "wear" ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
          今天穿它
        </button>

        <button
          type="button"
          onClick={() => void handleFeedback("dismissed", "收到，这套的特征会被降低权重。")}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "dismissed" ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          不太像我
        </button>
      </div>
    </motion.article>
  );
}
