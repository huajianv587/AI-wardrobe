"use client";

import { startTransition, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ApiError, fetchRecommendations, fetchWardrobeItems, RecommendationResult } from "@/lib/api";
import { WardrobeItem, useWardrobeStore } from "@/store/wardrobe-store";

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
        itemIds: optionOne.map((item) => item.id)
      },
      {
        title: "Change Another Look",
        rationale: "This alternative composition keeps the same scene fit while reducing repeated hero pieces, closer to the final one-more-look interaction.",
        itemIds: optionTwo.map((item) => item.id)
      }
    ],
    agentTrace: [
      { node: "Router Agent", summary: "Parsed scene, tone, and dress-code intent from the prompt." },
      { node: "Retriever Agent", summary: "Matched wardrobe candidates by slot, occasion tags, and color safety." },
      { node: "Stylist Agent", summary: "Composed the silhouette hierarchy and styling explanation." },
      { node: "Verifier Agent", summary: "Checked that the look remains wearable and coherent." }
    ]
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
  const [hasHydratedWardrobe, setHasHydratedWardrobe] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<RecommendationResult>(() => buildFallbackRecommendations(activePrompt, []));

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
      setStatusText("Loading your wardrobe so the recommendation cards can reference real user items.");

      try {
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

        setStatusText(error instanceof Error ? error.message : "Could not load the wardrobe for this page.");
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

  useEffect(() => {
    if (result.source === "api") {
      return;
    }

    startTransition(() => setResult(buildFallbackRecommendations(activePrompt, items)));
  }, [activePrompt, items, result.source]);

  async function handleGenerate(nextPrompt: string) {
    setLoading(true);
    setPrompt(nextPrompt);
    setActivePrompt(nextPrompt);
    setStatusText("");

    try {
      const payload = await fetchRecommendations(nextPrompt);
      startTransition(() => setResult(payload));
    } catch (error) {
      const fallback = buildFallbackRecommendations(nextPrompt, items);
      startTransition(() => setResult(fallback));
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "Your session expired while requesting a recommendation. Sign in again to continue."
          : "Backend recommendation is unavailable right now, so the panel is showing a local heuristic draft."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) {
    return (
      <section className="section-card rounded-[32px] p-6">
        <p className="pill mb-3">Checking account session</p>
        <p className="text-sm leading-6 text-[var(--muted)]">Preparing the recommendation workspace.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to run private outfit recommendations"
        description="The recommendation API now queries only the authenticated owner's wardrobe, so the styling agent needs an active Supabase session before it can retrieve items."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="section-card story-gradient rounded-[32px] p-5">
        <div className="mb-5">
          <div className="pill mb-3"><Sparkles className="size-4" />LangGraph-ready flow</div>
          <h3 className="text-2xl font-semibold text-[var(--ink-strong)]">Prompt your styling agent</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The panel now sends your Bearer token to the backend recommendation endpoint, and falls back to local heuristics only when the API is temporarily unavailable.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="metric-tile p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Retriever scope</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{items.length} private items</p>
          </div>
          <div className="metric-tile p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Request mode</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{result.source === "api" ? "Backend API" : "Local fallback"}</p>
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
        {items.length === 0 ? (
          <article className="section-card rounded-[32px] p-5">
            <h4 className="text-lg font-semibold text-[var(--ink-strong)]">Your wardrobe is still empty</h4>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Add a few real items in the wardrobe page first, then come back here to see recommendation cards tied to your own clothing inventory.</p>
          </article>
        ) : null}

        {result.outfits.map((outfit) => (
          <motion.article key={outfit.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="section-card rounded-[32px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xl font-semibold text-[var(--ink-strong)]">{outfit.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{outfit.rationale}</p>
              </div>
              <span className="pill">{outfit.itemIds.length} pieces</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {outfit.itemIds.map((itemId) => {
                const piece = items.find((item) => item.id === itemId);
                if (!piece) {
                  return null;
                }

                return (
                  <motion.div key={piece.id} whileHover={{ y: -3, scale: 1.01 }} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                    <div className="mb-3 h-24 rounded-[18px]" style={{ background: `linear-gradient(160deg, ${piece.colorHex} 0%, rgba(255,255,255,0.96) 100%)` }} />
                    <p className="font-medium text-[var(--ink-strong)]">{piece.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{piece.category} - {piece.color}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.article>
        ))}

        <article className="section-card rounded-[32px] p-5">
          <h4 className="text-lg font-semibold text-[var(--ink-strong)]">Agent Trace</h4>
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
