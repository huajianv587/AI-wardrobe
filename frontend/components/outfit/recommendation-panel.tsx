"use client";

import { startTransition, useState } from "react";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { seedWardrobeItems, WardrobeItem, useWardrobeStore } from "@/store/wardrobe-store";

interface AgentTraceStep {
  node: string;
  summary: string;
}

interface RecommendationCard {
  title: string;
  rationale: string;
  itemIds: number[];
}

interface RecommendationResult {
  source: "api" | "fallback";
  outfits: RecommendationCard[];
  agentTrace: AgentTraceStep[];
}

const promptPresets = [
  "Office meeting tomorrow, soft but professional",
  "Weekend coffee with friends, relaxed but polished",
  "Evening date, gentle and refined"
];

function pickBySlot(items: WardrobeItem[], slot: WardrobeItem["slot"], keywords: string[]) {
  return items.find((item) => keywords.some((keyword) => item.tags.includes(keyword) || item.occasions.includes(keyword)) && item.slot === slot) || items.find((item) => item.slot === slot);
}

function buildFallbackRecommendations(prompt: string): RecommendationResult {
  const lower = prompt.toLowerCase();
  const officeMode = /office|meeting|work|commute/.test(lower);
  const dateMode = /date|dinner|evening/.test(lower);
  const travelMode = /travel|weekend|coffee|relaxed/.test(lower);

  const scenarioKeywords = officeMode ? ["office", "meeting", "soft-formal"] : dateMode ? ["date", "soft", "elegant"] : travelMode ? ["weekend", "travel", "cozy"] : ["city", "minimal", "versatile"];

  const top = pickBySlot(seedWardrobeItems, "top", scenarioKeywords);
  const bottom = pickBySlot(seedWardrobeItems, "bottom", scenarioKeywords);
  const outerwear = pickBySlot(seedWardrobeItems, "outerwear", scenarioKeywords);
  const shoes = pickBySlot(seedWardrobeItems, "shoes", scenarioKeywords);
  const accessory = pickBySlot(seedWardrobeItems, "accessory", scenarioKeywords);

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
  const activePrompt = useWardrobeStore((state) => state.activePrompt);
  const setActivePrompt = useWardrobeStore((state) => state.setActivePrompt);
  const items = useWardrobeStore((state) => state.items);

  const [prompt, setPrompt] = useState(activePrompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult>(() => buildFallbackRecommendations(activePrompt));

  async function handleGenerate(nextPrompt: string) {
    setLoading(true);
    setPrompt(nextPrompt);
    setActivePrompt(nextPrompt);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/v1/outfits/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nextPrompt })
      });

      if (!response.ok) {
        throw new Error("API unavailable");
      }

      const payload = (await response.json()) as RecommendationResult;
      startTransition(() => setResult({ ...payload, source: "api" }));
    } catch {
      startTransition(() => setResult(buildFallbackRecommendations(nextPrompt)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="section-card rounded-[32px] p-5">
        <div className="mb-5">
          <div className="pill mb-3"><Sparkles className="size-4" />LangGraph-ready flow</div>
          <h3 className="text-2xl font-semibold text-[var(--ink-strong)]">Prompt your styling agent</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The panel falls back to local heuristics when the backend is offline, so product work can continue before your fine-tuned checkpoint is connected.</p>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-40 w-full rounded-[24px] border border-[var(--line)] bg-white/85 p-4 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          placeholder="Describe scene, mood, weather, and style direction..."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {promptPresets.map((preset) => (
            <button key={preset} type="button" onClick={() => void handleGenerate(preset)} className="pill transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
              {preset}
            </button>
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
        </div>
      </section>

      <section className="space-y-4">
        {result.outfits.map((outfit) => (
          <article key={outfit.title} className="section-card rounded-[32px] p-5">
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
                  <div key={piece.id} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                    <div className="mb-3 h-24 rounded-[18px]" style={{ background: `linear-gradient(160deg, ${piece.colorHex} 0%, rgba(255,255,255,0.96) 100%)` }} />
                    <p className="font-medium text-[var(--ink-strong)]">{piece.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{piece.category} - {piece.color}</p>
                  </div>
                );
              })}
            </div>
          </article>
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