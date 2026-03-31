"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { Bot, BriefcaseBusiness, CalendarDays, CloudSun, MapPinned, Package2, Sparkles } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { RecommendationLookCard } from "@/components/outfit/recommendation-look-card";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import {
  AssistantOverview,
  fetchAssistantOverview,
  fetchPackingPlan,
  fetchStyleProfile,
  fetchTomorrowAssistant,
  fetchWardrobeItems,
  RecommendationResult,
  runAssistantQuickMode,
  searchAssistantLocations,
  StyleProfile,
  updateStyleProfile
} from "@/lib/api";
import { useWardrobeStore } from "@/store/wardrobe-store";

const quickModes = ["上班", "约会", "出门买咖啡", "今天不想费脑"];

function joinList(values: string[]) {
  return values.join(", ");
}

function splitList(value: string) {
  return value.split(",").map((token) => token.trim()).filter(Boolean);
}

interface StyleProfileFormState {
  favoriteColors: string;
  avoidColors: string;
  favoriteSilhouettes: string;
  avoidSilhouettes: string;
  styleKeywords: string;
  dislikeKeywords: string;
  commuteProfile: string;
  comfortPriorities: string;
  wardrobeRules: string;
  personalNote: string;
}

function toFormState(profile: StyleProfile | null): StyleProfileFormState {
  return {
    favoriteColors: joinList(profile?.favorite_colors ?? []),
    avoidColors: joinList(profile?.avoid_colors ?? []),
    favoriteSilhouettes: joinList(profile?.favorite_silhouettes ?? []),
    avoidSilhouettes: joinList(profile?.avoid_silhouettes ?? []),
    styleKeywords: joinList(profile?.style_keywords ?? []),
    dislikeKeywords: joinList(profile?.dislike_keywords ?? []),
    commuteProfile: profile?.commute_profile ?? "",
    comfortPriorities: joinList(profile?.comfort_priorities ?? []),
    wardrobeRules: joinList(profile?.wardrobe_rules ?? []),
    personalNote: profile?.personal_note ?? ""
  };
}

export function AssistantDashboard() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);

  const [overview, setOverview] = useState<AssistantOverview | null>(null);
  const [quickResult, setQuickResult] = useState<RecommendationResult | null>(null);
  const [packingSummary, setPackingSummary] = useState<string>("");
  const [statusText, setStatusText] = useState("Assistant is warming up...");
  const [locationQuery, setLocationQuery] = useState("Shanghai");
  const [schedule, setSchedule] = useState("明天正常上班，早晚有通勤");
  const [hasCommute, setHasCommute] = useState(true);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [formState, setFormState] = useState<StyleProfileFormState>(() => toFormState(null));
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reminderCount = useMemo(() => {
    if (!overview) {
      return 0;
    }

    return overview.reminders.repeat_warning.length + overview.reminders.laundry_and_care.length + overview.reminders.idle_and_seasonal.length;
  }, [overview]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      return;
    }

    let active = true;

    async function hydrate() {
      setBusyKey("overview");
      setStatusText("Loading your weather-aware styling assistant...");

      try {
        const [overviewPayload, profilePayload, wardrobePayload] = await Promise.all([
          fetchAssistantOverview(),
          fetchStyleProfile(),
          items.length > 0 ? Promise.resolve(items) : fetchWardrobeItems()
        ]);

        if (!active) {
          return;
        }

        setOverview(overviewPayload);
        setStyleProfile(profilePayload);
        setFormState(toFormState(profilePayload));
        if (wardrobePayload !== items) {
          startTransition(() => replaceItems(wardrobePayload));
        }
        setStatusText("Your assistant overview is ready, with tomorrow planning, closet gaps, and gentle reminders.");
      } catch (error) {
        if (!active) {
          return;
        }

        setStatusText(error instanceof Error ? error.message : "Could not load the assistant overview.");
      } finally {
        if (active) {
          setBusyKey(null);
        }
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated, items, replaceItems]);

  async function handleSearchLocation() {
    setBusyKey("location-search");

    try {
      const matches = await searchAssistantLocations(locationQuery);
      setLocationSuggestions(matches.map((item) => [item.name, item.admin1, item.country].filter(Boolean).join(", ")));
      setStatusText(matches.length > 0 ? "地点候选已更新，点一个就能直接生成明日穿搭。" : "没有搜到更合适的地点候选，试试更完整的城市名。");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not search locations.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTomorrowPlan() {
    setBusyKey("tomorrow");

    try {
      const tomorrow = await fetchTomorrowAssistant({
        location_query: locationQuery,
        schedule,
        has_commute: hasCommute
      });
      setOverview((current) => current ? { ...current, tomorrow } : current);
      setStatusText("明天穿什么助手已经按地点、天气和通勤状态更新好了。");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not generate the tomorrow plan.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleQuickMode(mode: string) {
    setBusyKey(`quick-${mode}`);

    try {
      const recommendation = await runAssistantQuickMode(mode);
      setQuickResult(recommendation);
      setStatusText(`少思考模式已切到「${mode}」，现在会更偏向直接给结果。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not run quick mode.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePackingPlan() {
    setBusyKey("packing");

    try {
      const result = await fetchPackingPlan({
        city: locationQuery,
        days: 4,
        trip_kind: "city break",
        include_commute: false
      });
      const itemNames = result.suggestions.map((entry: { item_id: number }) => items.find((item) => item.id === entry.item_id)?.name ?? `#${entry.item_id}`);
      setPackingSummary(`${result.capsule_summary} 推荐带上：${itemNames.join(" / ")}`);
      setStatusText("行李箱模式已经按城市天气和现有衣橱做了胶囊衣橱建议。");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not build the packing plan.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveStyleProfile() {
    setBusyKey("profile");

    try {
      const nextProfile = await updateStyleProfile({
        favorite_colors: splitList(formState.favoriteColors),
        avoid_colors: splitList(formState.avoidColors),
        favorite_silhouettes: splitList(formState.favoriteSilhouettes),
        avoid_silhouettes: splitList(formState.avoidSilhouettes),
        style_keywords: splitList(formState.styleKeywords),
        dislike_keywords: splitList(formState.dislikeKeywords),
        commute_profile: formState.commuteProfile || null,
        comfort_priorities: splitList(formState.comfortPriorities),
        wardrobe_rules: splitList(formState.wardrobeRules),
        personal_note: formState.personalNote || null
      });
      setStyleProfile(nextProfile);
      setFormState(toFormState(nextProfile));
      setStatusText("个人风格记忆层已经更新，后续推荐会开始按这份画像重新排序。");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Could not update the style profile.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!authReady) {
    return <PanelSkeleton rows={3} />;
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to open your personal assistant"
        description="Tomorrow planning, closet gaps, low-thought mode, and personalized memory all depend on your private wardrobe and feedback signals."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="section-card story-gradient rounded-[36px] p-6">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="pill mb-4">
              <Bot className="size-4" />
              Personal styling brain
            </div>
            <h3 className="display-title text-3xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)] md:text-4xl">
              明天穿什么、少思考模式、衣橱提醒，现在都在同一块温柔面板里。
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              这里把天气、画像、反馈信号、记忆卡、打包模式和穿着记录串成了完整闭环。后续换成你训练好的模型，也能沿用同一套页面与接口。
            </p>
            <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
              {statusText}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tomorrow city</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{overview?.tomorrow.weather.location_name ?? "Waiting"}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Reminders</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{reminderCount}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Saved looks</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{overview?.recent_saved_outfits.length ?? 0}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Style memory</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{styleProfile?.favorite_colors[0] ?? "Learning"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-6">
          <article className="section-card rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="pill mb-3">
                  <CloudSun className="size-4" />
                  Tomorrow assistant
                </div>
                <h4 className="text-xl font-semibold text-[var(--ink-strong)]">按天气、日程、通勤生成早晚两套</h4>
              </div>
              <button type="button" onClick={() => void handleTomorrowPlan()} disabled={busyKey === "tomorrow"} className="rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white disabled:opacity-60">
                {busyKey === "tomorrow" ? "Generating..." : "Generate tomorrow"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink)]">地点</span>
                <div className="flex gap-2">
                  <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
                  <button type="button" onClick={() => void handleSearchLocation()} className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)]">
                    搜索
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink)]">日程提示</span>
                <input value={schedule} onChange={(event) => setSchedule(event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
              </label>
            </div>

            <label className="mt-4 inline-flex items-center gap-3 text-sm text-[var(--ink)]">
              <input type="checkbox" checked={hasCommute} onChange={(event) => setHasCommute(event.target.checked)} />
              明天要通勤
            </label>

            {locationSuggestions.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {locationSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => setLocationQuery(suggestion)} className="pill">
                    <MapPinned className="size-4" />
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {overview ? (
              <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
                {overview.tomorrow.weather.location_name} · {overview.tomorrow.weather.condition_label} · {overview.tomorrow.weather.temperature_min} - {overview.tomorrow.weather.temperature_max}°C
                <div className="mt-2 text-[var(--muted)]">{overview.tomorrow.commute_tip}</div>
              </div>
            ) : null}
          </article>

          {overview ? (
            <>
              <RecommendationLookCard recommendation={overview.tomorrow.morning.recommendation.outfits[0]} items={items} prompt={schedule} scene="tomorrow-morning" onActionComplete={setStatusText} />
              <RecommendationLookCard recommendation={overview.tomorrow.evening.recommendation.outfits[0]} items={items} prompt={schedule} scene="tomorrow-evening" onActionComplete={setStatusText} />
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <article className="section-card rounded-[32px] p-5">
            <div className="pill mb-3">
              <Sparkles className="size-4" />
              One-click low-thought mode
            </div>
            <h4 className="text-xl font-semibold text-[var(--ink-strong)]">用户只点一个场景，直接给结果</h4>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {quickModes.map((mode) => (
                <button key={mode} type="button" onClick={() => void handleQuickMode(mode)} className="tap-card whitespace-nowrap rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-soft)]">
                  {mode}
                </button>
              ))}
            </div>
          </article>

          {quickResult ? (
            <RecommendationLookCard recommendation={quickResult.outfits[0]} items={items} prompt="quick-mode" scene="quick-mode" onActionComplete={setStatusText} />
          ) : null}

          <article className="section-card rounded-[32px] p-5">
            <div className="pill mb-3">
              <Package2 className="size-4" />
              Packing mode
            </div>
            <h4 className="text-xl font-semibold text-[var(--ink-strong)]">按城市、天数、天气生成胶囊衣橱</h4>
            <button type="button" onClick={() => void handlePackingPlan()} disabled={busyKey === "packing"} className="mt-4 w-full rounded-full border border-[var(--line)] bg-white/85 px-5 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-soft)] md:w-auto">
              {busyKey === "packing" ? "Packing..." : "Generate packing plan"}
            </button>
            {packingSummary ? (
              <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
                {packingSummary}
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="section-card rounded-[32px] p-5">
          <div className="pill mb-3">
            <CalendarDays className="size-4" />
            Closet gaps and reminders
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">衣橱缺口、重复穿搭、洗护和换季提醒</h4>
          <div className="mt-5 space-y-3">
            {overview?.gaps.insights.map((insight) => (
              <div key={insight.title} className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{insight.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{insight.description}</p>
              </div>
            ))}
            {overview?.reminders.repeat_warning.map((card) => (
              <div key={card.title} className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
              </div>
            ))}
            {overview?.reminders.laundry_and_care.map((card) => (
              <div key={card.title} className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
              </div>
            ))}
            {overview?.reminders.idle_and_seasonal.map((card) => (
              <div key={card.title} className="rounded-[22px] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="section-card rounded-[32px] p-5">
          <div className="pill mb-3">
            <BriefcaseBusiness className="size-4" />
            Personal style memory
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">个人风格记忆层</h4>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">喜欢的颜色</span>
              <input value={formState.favoriteColors} onChange={(event) => setFormState((current) => ({ ...current, favoriteColors: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">避开的颜色</span>
              <input value={formState.avoidColors} onChange={(event) => setFormState((current) => ({ ...current, avoidColors: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">偏好轮廓</span>
              <input value={formState.favoriteSilhouettes} onChange={(event) => setFormState((current) => ({ ...current, favoriteSilhouettes: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">不喜欢的轮廓</span>
              <input value={formState.avoidSilhouettes} onChange={(event) => setFormState((current) => ({ ...current, avoidSilhouettes: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">风格关键词</span>
              <input value={formState.styleKeywords} onChange={(event) => setFormState((current) => ({ ...current, styleKeywords: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">穿搭禁忌</span>
              <input value={formState.dislikeKeywords} onChange={(event) => setFormState((current) => ({ ...current, dislikeKeywords: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">通勤画像</span>
            <input value={formState.commuteProfile} onChange={(event) => setFormState((current) => ({ ...current, commuteProfile: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">舒适优先项</span>
            <input value={formState.comfortPriorities} onChange={(event) => setFormState((current) => ({ ...current, comfortPriorities: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">衣橱规则</span>
            <input value={formState.wardrobeRules} onChange={(event) => setFormState((current) => ({ ...current, wardrobeRules: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">私人备注</span>
            <textarea value={formState.personalNote} onChange={(event) => setFormState((current) => ({ ...current, personalNote: event.target.value }))} className="min-h-32 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <button type="button" onClick={() => void handleSaveStyleProfile()} disabled={busyKey === "profile"} className="mt-5 w-full rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:opacity-60 md:w-auto">
            {busyKey === "profile" ? "Saving..." : "Save style memory"}
          </button>
        </article>
      </section>
    </div>
  );
}
