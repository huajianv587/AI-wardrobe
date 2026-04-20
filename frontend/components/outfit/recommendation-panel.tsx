"use client";

import { startTransition, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { RecommendationLookCard } from "@/components/outfit/recommendation-look-card";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { StateCard } from "@/components/ui/state-card";
import { ApiError, fetchRecommendations, fetchWardrobeItems, RecommendationResult } from "@/lib/api";
import { seedWardrobeItems, WardrobeItem, useWardrobeStore } from "@/store/wardrobe-store";

const promptPresets = [
  "Office meeting tomorrow, soft but professional",
  "Weekend coffee with friends, relaxed but polished",
  "Evening date, gentle and refined"
];

function pickBySlot(items: WardrobeItem[], slot: WardrobeItem["slot"], keywords: string[]) {
  return items.find((item) => keywords.some((keyword) => item.tags.includes(keyword) || item.occasions.includes(keyword)) && item.slot === slot) || items.find((item) => item.slot === slot);
}

function buildFallbackRecommendations(prompt: string, availableItems: WardrobeItem[]): RecommendationResult {
  const lower = prompt.toLowerCase();
  const officeMode = /office|meeting|work|commute/.test(lower);
  const dateMode = /date|dinner|evening/.test(lower);
  const travelMode = /travel|weekend|coffee|relaxed/.test(lower);

  const scenarioKeywords = officeMode ? ["office", "meeting", "soft-formal"] : dateMode ? ["date", "soft", "elegant"] : travelMode ? ["weekend", "travel", "cozy"] : ["city", "minimal", "versatile"];

  const top = pickBySlot(availableItems, "top", scenarioKeywords);
  const bottom = pickBySlot(availableItems, "bottom", scenarioKeywords);
  const outerwear = pickBySlot(availableItems, "outerwear", scenarioKeywords);
  const shoes = pickBySlot(availableItems, "shoes", scenarioKeywords);
  const accessory = pickBySlot(availableItems, "accessory", scenarioKeywords);

  const optionOne = [outerwear, top, bottom, shoes].filter(Boolean) as WardrobeItem[];
  const optionTwo = [top, bottom, shoes, accessory].filter(Boolean) as WardrobeItem[];

  return {
    source: "fallback",
    outfits: [
      {
        title: officeMode ? "Soft Formal Balance" : dateMode ? "Rosy Evening Layer" : "Light Weekend Edit",
        rationale: officeMode ? "Use structured neutrals to keep the look professional, then soften the impression with light layers so the result stays approachable." : dateMode ? "A softer palette and one refined accessory create a polished date look without feeling overdone." : "Keep the silhouette relaxed, then add one clean anchor piece so the outfit still feels intentional.",
        itemIds: optionOne.map((item) => item.id),
        confidence: 0.74,
        confidenceLabel: "Local draft",
        keyItemId: optionOne[0]?.id ?? null,
        substituteItemIds: optionTwo.slice(0, 2).map((item) => item.id),
        reasonBadges: scenarioKeywords.slice(0, 3),
        charmCopy: "Preview mode gives you a local draft now, then swaps in the live styling path once you sign in.",
        moodEmoji: officeMode ? "Work" : dateMode ? "Date" : "Weekend"
      },
      {
        title: "Change Another Look",
        rationale: "This alternative composition keeps the same scene fit while reducing repeated hero pieces, closer to the final one-more-look interaction.",
        itemIds: optionTwo.map((item) => item.id),
        confidence: 0.69,
        confidenceLabel: "Backup look",
        keyItemId: optionTwo[0]?.id ?? null,
        substituteItemIds: optionOne.slice(0, 2).map((item) => item.id),
        reasonBadges: ["fallback", "swap-friendly"],
        charmCopy: "This backup look keeps the same scene fit while giving you a softer second option.",
        moodEmoji: "Swap"
      }
    ],
    agentTrace: [
      { node: "Router Agent", summary: "Parsed scene, tone, and dress-code intent from the prompt." },
      { node: "Retriever Agent", summary: "Matched wardrobe candidates by slot, occasion tags, and color safety." },
      { node: "Stylist Agent", summary: "Composed the silhouette hierarchy and styling explanation." },
      { node: "Verifier Agent", summary: "Checked that the look remains wearable and coherent." }
    ],
    profileSummary: "Preview mode has not loaded a personal style profile yet, so this draft is based on the prompt and the local demo wardrobe.",
    closetGaps: [],
    reminderFlags: []
  };
}

export function RecommendationPanel() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const activePrompt = useWardrobeStore((state) => state.activePrompt);
  const setActivePrompt = useWardrobeStore((state) => state.setActivePrompt);
  const items = useWardrobeStore((state) => state.items);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);

  const [prompt, setPrompt] = useState(activePrompt);
  const [loading, setLoading] = useState(false);
  const [hydratingWardrobe, setHydratingWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");
  const previewMode = !isAuthenticated;
  const availableItems = items.length > 0 ? items : seedWardrobeItems;
  const [result, setResult] = useState<RecommendationResult>(() => buildFallbackRecommendations(activePrompt, seedWardrobeItems));

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let active = true;

    async function hydrateWardrobe() {
      setHydratingWardrobe(true);
      setStatusText(
        isAuthenticated
          ? "Loading your wardrobe so the recommendation cards can reference real user items."
          : "Loading the local preview wardrobe for recommendation rendering."
      );

      try {
        if (!isAuthenticated) {
          startTransition(() => replaceItems(seedWardrobeItems));
          setStatusText("Preview mode is using local wardrobe data for recommendations.");
          return;
        }

        const wardrobeItems = await fetchWardrobeItems();

        if (!active) {
          return;
        }

        startTransition(() => replaceItems(wardrobeItems));
        setStatusText(
          wardrobeItems.length > 0
            ? `Loaded ${wardrobeItems.length} wardrobe items for recommendation rendering.`
            : "Your wardrobe is empty. Add a few pieces first so the styling agent can build private looks."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        startTransition(() => replaceItems(seedWardrobeItems));
        setStatusText(error instanceof Error ? `${error.message} Switched to the local wardrobe fallback.` : "Could not load the wardrobe for this page. Switched to local fallback.");
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
    if (result.source !== "fallback") {
      return;
    }

    startTransition(() => setResult(buildFallbackRecommendations(activePrompt, availableItems)));
  }, [activePrompt, availableItems, result.source]);

  async function handleGenerate(nextPrompt: string) {
    setLoading(true);
    setPrompt(nextPrompt);
    setActivePrompt(nextPrompt);
    setStatusText("");

    try {
      if (previewMode) {
        const fallback = buildFallbackRecommendations(nextPrompt, availableItems);
        startTransition(() => setResult(fallback));
        setStatusText("Preview mode generated a local recommendation draft.");
        return;
      }

      const payload = await fetchRecommendations(nextPrompt);
      startTransition(() => setResult(payload));
      setStatusText("Recommendation results are ready.");
    } catch (error) {
      const fallback = buildFallbackRecommendations(nextPrompt, availableItems);
      startTransition(() => setResult(fallback));
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "Your session expired while requesting a recommendation. The page has temporarily switched back to the public experience path."
          : "Backend recommendation is unavailable right now, so the panel is showing a local heuristic draft."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) {
    return <PanelSkeleton rows={2} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="section-card story-gradient rounded-[32px] p-5">
        {previewMode ? (
          <div className="mb-5">
            <VisitorPreviewNotice description="Preview mode now stays fully local. This page only uses demo wardrobe data and local recommendation drafts until you sign in." />
          </div>
        ) : null}

        <div className="mb-5">
          <div className="pill mb-3"><Sparkles className="size-4" />LangGraph-ready flow</div>
          <h3 className="text-2xl font-semibold text-[var(--ink-strong)]">Prompt your styling agent</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The panel now sends your Bearer token to the backend recommendation endpoint, and falls back to local heuristics only when the API is temporarily unavailable.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="metric-tile p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Retriever scope</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{availableItems.length} {previewMode ? "public demo items" : "private items"}</p>
          </div>
          <div className="metric-tile p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Request mode</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{result.source === "fallback" ? "Local fallback" : "Live backend"}</p>
          </div>
          <div className="metric-tile p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">One more look</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">Built in</p>
          </div>
        </div>

        <div className="ambient-divider my-5" />

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-40 w-full rounded-[24px] border border-[var(--line)] bg-white/85 p-4 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-white"
          placeholder="Describe scene, mood, weather, and style direction..."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {promptPresets.map((preset) => (
            <motion.button key={preset} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => void handleGenerate(preset)} className="pill transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
              {preset}
            </motion.button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate(prompt)}
            disabled={loading || prompt.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <RefreshCw className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {loading ? "Generating..." : "Generate look"}
          </button>
          <div className="pill">Source: {result.source}</div>
          {hydratingWardrobe ? <div className="pill">Hydrating wardrobe...</div> : null}
        </div>

        {statusText ? (
          <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
            {statusText}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {availableItems.length === 0 ? (
          <StateCard
            variant="empty"
            title="Your wardrobe is still empty"
            description="Add a few real pieces in the wardrobe first, then come back so recommendations can start reflecting your private closet."
          />
        ) : null}

        {result.outfits.map((outfit) => (
          <RecommendationLookCard key={outfit.title} recommendation={outfit} items={availableItems} prompt={prompt} scene="recommendation-panel" previewMode={previewMode} onActionComplete={setStatusText} />
        ))}

        <article className="section-card rounded-[32px] p-5">
          <h4 className="text-lg font-semibold text-[var(--ink-strong)]">Agent Trace</h4>
          {result.profileSummary ? (
            <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
              {result.profileSummary}
            </div>
          ) : null}
          {(result.closetGaps.length > 0 || result.reminderFlags.length > 0) ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.closetGaps.length > 0 ? (
                <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                  <p className="text-sm font-semibold text-[var(--ink-strong)]">Closet gaps</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{result.closetGaps.join(" / ")}</p>
                </div>
              ) : null}
              {result.reminderFlags.length > 0 ? (
                <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                  <p className="text-sm font-semibold text-[var(--ink-strong)]">Gentle reminders</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{result.reminderFlags.join(" / ")}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {result.agentTrace.map((step) => (
              <div key={step.node} className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{step.node}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{step.summary}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
