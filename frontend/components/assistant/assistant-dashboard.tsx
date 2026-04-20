"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { Bot, BriefcaseBusiness, CalendarDays, CloudSun, MapPinned, Package2, Sparkles } from "lucide-react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
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
import { seedWardrobeItems, useWardrobeStore } from "@/store/wardrobe-store";

const quickModes = [
  { label: "通勤", value: "office" },
  { label: "约会夜", value: "date" },
  { label: "咖啡出门", value: "coffee" },
  { label: "帮我决定", value: "low-thought" }
] as const;

function buildPreviewRecommendation(title: string, rationale: string, itemIds: number[]): RecommendationResult {
  return {
    source: "fallback",
    outfits: [
      {
        title,
        rationale,
        itemIds,
        confidence: 0.77,
        confidenceLabel: "预览搭配",
        keyItemId: itemIds[0] ?? null,
        substituteItemIds: itemIds.slice(1, 3),
        reasonBadges: ["preview", "soft", "easy"],
        charmCopy: "Preview mode keeps this suggestion local now, then swaps in your personal assistant once you sign in.",
        moodEmoji: "预览"
      }
    ],
    agentTrace: [
      { node: "预览路由", summary: "使用演示衣橱和当前场景提示词，先生成一份本地草稿。" },
      { node: "预览造型师", summary: "保持和真实助理一致的返回结构，确保登录前后的页面行为稳定。" }
    ],
    profileSummary: "预览模式还没有加载你的真实风格画像，所以这份草稿基于本地演示数据生成。",
    closetGaps: ["轻外搭", "舒服的通勤鞋"],
    reminderFlags: ["本周重复率偏高", "有一件针织单品该护理了"]
  };
}

function buildPreviewProfile(): StyleProfile {
  return {
    user_id: 0,
    favorite_colors: ["cream", "soft pink", "mist blue"],
    avoid_colors: ["neon green", "high-saturation purple"],
    favorite_silhouettes: ["high waist", "A-line", "soft drape"],
    avoid_silhouettes: ["too tight", "too stiff"],
    style_keywords: ["gentle", "light", "commute"],
    dislike_keywords: ["too sharp", "too streetwear"],
    commute_profile: "轻正式，但不要显得太板正。",
    comfort_priorities: ["面料柔软", "久坐也轻松"],
    wardrobe_rules: ["通勤 look 尽量控制在三种主色以内", "约会时保留一个柔和亮点"],
    personal_note: "希望整体是温柔、透气、有一点克制精致感的。",
    updated_at: new Date().toISOString()
  };
}

function buildPreviewOverview(): AssistantOverview {
  return {
    tomorrow: {
      weather: {
        location_name: "Shanghai",
        timezone: "Asia/Shanghai",
        date: new Date().toISOString().slice(0, 10),
        weather_code: 1,
        condition_label: "晴间多云",
        temperature_max: 24,
        temperature_min: 18,
        precipitation_probability_max: 16
      },
      morning: {
        period: "morning",
        summary: "早晨通勤略有凉意，建议随手带一件轻外套。",
        recommendation: buildPreviewRecommendation(
          "柔和通勤开场",
          "用一件轻衬衫和柔和外层稳住通勤质感，不会显得太重。",
          [6, 1, 3, 7]
        )
      },
      evening: {
        period: "evening",
        summary: "晚间可以放松一点，但仍然保留一个柔和亮点。",
        recommendation: buildPreviewRecommendation(
          "下班后的松弛感",
          "把白天的结构感稍微放下来，同时保留舒适与精致的平衡。",
          [2, 4, 8, 9]
        )
      },
      commute_tip: "今天温差不大，但一件顺手的轻外层依然值得备着。"
    },
    gaps: {
      summary: "这份演示衣橱还缺一件更轻的外搭，以及一双更适合轮换的通勤鞋。",
      insights: [
        { title: "轻外搭仍有空缺", description: "天气转场时还需要一件更容易切换的过渡单品。", urgency: "medium" },
        { title: "通勤鞋轮换不够", description: "重复工作日的鞋履选择仍然偏少。", urgency: "medium" }
      ]
    },
    reminders: {
      repeat_warning: [
        { title: "重复模式提醒", description: "最近几次穿搭比较依赖浅色上装配深色下装。", tone: "reminder", item_ids: [1, 3] }
      ],
      laundry_and_care: [
        { title: "护理提醒", description: "有一件高频针织已经到了轻柔清洗的节点。", tone: "care", item_ids: [2] }
      ],
      idle_and_seasonal: [
        { title: "换季提醒", description: "有一件外套已经有一段时间没有重新启用。", tone: "idle", item_ids: [5] }
      ]
    },
    style_profile: buildPreviewProfile(),
    recent_saved_outfits: [
      {
        id: 1,
        user_id: null,
        name: "奶油通勤编辑",
        occasion: "commute",
        style: "柔和通勤",
        item_ids: [1, 3, 7],
        reasoning: "平衡、安静，而且容易重复穿。",
        ai_generated: true,
        created_at: new Date().toISOString()
      }
    ]
  };
}

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

function quickModeFallbackIds(mode: string) {
  if (mode === "office") {
    return [6, 1, 3, 7];
  }
  if (mode === "date") {
    return [5, 4, 9];
  }
  if (mode === "coffee") {
    return [2, 4, 8];
  }
  return [1, 3, 7];
}

export function AssistantDashboard() {
  const { ready: authReady, isAuthenticated } = useAuthSession();
  const items = useWardrobeStore((state) => state.items);
  const replaceItems = useWardrobeStore((state) => state.replaceItems);
  const previewMode = !isAuthenticated;
  const displayItems = items.length > 0 ? items : seedWardrobeItems;

  const [overview, setOverview] = useState<AssistantOverview | null>(null);
  const [quickResult, setQuickResult] = useState<RecommendationResult | null>(null);
  const [packingSummary, setPackingSummary] = useState<string>("");
  const [statusText, setStatusText] = useState("搭配助理正在准备今日上下文...");
  const [locationQuery, setLocationQuery] = useState("上海");
  const [schedule, setSchedule] = useState("明天是正常通勤日，早晚各有一段通勤路程。");
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
    if (!authReady) {
      return;
    }

    let active = true;

    async function hydrate() {
      setBusyKey("overview");
      setStatusText(
        isAuthenticated
          ? "Loading your weather-aware styling assistant..."
          : "Loading the local preview assistant workspace..."
      );

      try {
        if (!isAuthenticated) {
          const fallbackOverview = buildPreviewOverview();
          const fallbackProfile = fallbackOverview.style_profile;
          setOverview(fallbackOverview);
          setStyleProfile(fallbackProfile);
          setFormState(toFormState(fallbackProfile));
          startTransition(() => replaceItems(seedWardrobeItems));
          setStatusText("当前是本地预览模式。登录后会载入你的私有衣橱、穿搭历史和真实偏好。");
          return;
        }

        const [overviewPayload, profilePayload, wardrobePayload] = await Promise.all([
          fetchAssistantOverview(),
          fetchStyleProfile(),
          fetchWardrobeItems()
        ]);

        if (!active) {
          return;
        }

        setOverview(overviewPayload);
        setStyleProfile(profilePayload);
        setFormState(toFormState(profilePayload));
        startTransition(() => replaceItems(wardrobePayload));
        setStatusText("搭配助理已准备就绪，明日规划、衣橱缺口和护理提醒都已经同步完成。");
      } catch (error) {
        if (!active) {
          return;
        }

        const fallbackOverview = buildPreviewOverview();
        const fallbackProfile = fallbackOverview.style_profile;
        setOverview(fallbackOverview);
        setStyleProfile(fallbackProfile);
        setFormState(toFormState(fallbackProfile));
        startTransition(() => replaceItems(seedWardrobeItems));
        setStatusText(error instanceof Error ? `${error.message} 已切换到本地预览数据。` : "暂时无法载入助理概览，已切换到本地预览模式。");
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
  }, [authReady, isAuthenticated, replaceItems]);

  async function handleSearchLocation() {
    setBusyKey("location-search");

    try {
      if (previewMode) {
        setLocationSuggestions([
          `${locationQuery}, Central`,
          `${locationQuery}, Riverside`,
          `${locationQuery}, Downtown`
        ]);
        setStatusText("预览模式已刷新本地位置建议。");
        return;
      }

      const matches = await searchAssistantLocations(locationQuery);
      setLocationSuggestions(matches.map((item) => [item.name, item.admin1, item.country].filter(Boolean).join(", ")));
      setStatusText(matches.length > 0 ? "位置建议已更新，选择一个城市后可以重新生成明日搭配。" : "暂时没有找到接近的地点，请试试更完整的城市名。");
    } catch (error) {
      setLocationSuggestions([
        `${locationQuery}, City Center`,
        `${locationQuery}, Riverside`,
        `${locationQuery}, Business District`
      ]);
      setStatusText(error instanceof Error ? `${error.message} 先为你展示本地候选地点。` : "地点搜索暂时不可用，先展示本地候选地点。");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTomorrowPlan() {
    setBusyKey("tomorrow");

    try {
      if (previewMode) {
        const primaryIds = displayItems.slice(0, 4).map((item) => item.id);
        const secondaryIds = displayItems.slice(1, 5).map((item) => item.id);
        setOverview((current) => {
          const base = current ?? buildPreviewOverview();
          return {
            ...base,
            tomorrow: {
              ...base.tomorrow,
              weather: {
                ...base.tomorrow.weather,
                location_name: locationQuery
              },
              morning: {
                ...base.tomorrow.morning,
                recommendation: buildPreviewRecommendation(
                  "预览早晨搭配",
                  "预览模式会在登录前把明日搭配留在本地生成。",
                  primaryIds
                )
              },
              evening: {
                ...base.tomorrow.evening,
                recommendation: buildPreviewRecommendation(
                  "预览晚间搭配",
                  "这是晚间搭配流程的本地预览版本。",
                  secondaryIds.length > 0 ? secondaryIds : primaryIds
                )
              },
              commute_tip: hasCommute
                ? "预览模式建议随手备一件轻外层应对通勤温差。"
                : "预览模式建议在不需要通勤层次时保持更轻盈的搭配。"
            }
          };
        });
        setStatusText("预览模式已在本地刷新明日搭配草稿。");
        return;
      }

      const tomorrow = await fetchTomorrowAssistant({
        location_query: locationQuery,
        schedule,
        has_commute: hasCommute
      });
      setOverview((current) => current ? { ...current, tomorrow } : current);
      setStatusText("已经结合最新地点、天气和通勤信息刷新了明日搭配建议。");
    } catch (error) {
      setOverview((current) => current ? {
        ...current,
        tomorrow: {
          ...current.tomorrow,
          weather: {
            ...current.tomorrow.weather,
            location_name: locationQuery
          },
          commute_tip: hasCommute
            ? "回退模式建议随手备一件轻外层应对通勤温差。"
            : "回退模式建议在不需要通勤层次时保持更轻盈的搭配。"
        }
      } : current);
      setStatusText(error instanceof Error ? `${error.message} 已切换到本地明日搭配草稿。` : "明日搭配暂时生成失败，已切换到本地草稿。");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleQuickMode(mode: typeof quickModes[number]) {
    setBusyKey(`quick-${mode.value}`);

    try {
      if (previewMode) {
        setQuickResult(
          buildPreviewRecommendation(
            `${mode.label} 预览`,
            "预览模式会在登录前把快捷场景留在本地运行。",
            displayItems.slice(0, 4).map((item) => item.id)
          )
        );
        setStatusText(`预览模式已更新“${mode.label}”快捷场景。`);
        return;
      }

      const recommendation = await runAssistantQuickMode(mode.value);
      setQuickResult(recommendation);
      setStatusText(`快捷模式已切换到“${mode.label}”场景。`);
    } catch (error) {
      setQuickResult(
        buildPreviewRecommendation(
          `${mode.label} 回退`,
          "实时快捷模式暂时不可用，所以先给你一份仍然能直接上身的本地答案。",
          quickModeFallbackIds(mode.value)
        )
      );
      setStatusText(error instanceof Error ? `${error.message} 已切换到本地快捷场景。` : "快捷模式暂时不可用，已切换到本地场景。");
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePackingPlan() {
    setBusyKey("packing");

    try {
      if (previewMode) {
        const itemNames = displayItems.slice(0, 4).map((item) => item.name);
        setPackingSummary(`预览打包清单 · ${locationQuery}：${itemNames.join(" / ")}`);
        setStatusText("预览模式已生成本地行李清单草稿。");
        return;
      }

      const result = await fetchPackingPlan({
        city: locationQuery,
        days: 4,
        trip_kind: "city break",
        include_commute: false
      });
      const itemNames = result.suggestions.map((entry: { item_id: number }) => displayItems.find((item) => item.id === entry.item_id)?.name ?? `#${entry.item_id}`);
      setPackingSummary(`${result.capsule_summary} 推荐收纳：${itemNames.join(" / ")}`);
      setStatusText("打包模式已经结合城市天气和当前衣橱，整理出一份精简清单。");
    } catch (error) {
      const itemNames = displayItems.slice(0, 4).map((item) => item.name);
      setPackingSummary(`回退打包清单 · ${locationQuery}：${itemNames.join(" / ")}`);
      setStatusText(error instanceof Error ? `${error.message} 已切换到本地打包草稿。` : "打包清单暂时生成失败，已切换到本地草稿。");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveStyleProfile() {
    setBusyKey("profile");

    try {
      if (previewMode) {
        const nextProfile = {
          ...(styleProfile ?? buildPreviewProfile()),
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
        };
        setStyleProfile(nextProfile);
        setFormState(toFormState(nextProfile));
        setStatusText("预览模式已把风格记忆保存到本地。登录后就可以同步到你的账号里。");
        return;
      }

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
      setStatusText("你的风格记忆已更新，后续推荐会优先遵循这份画像。");
    } catch (error) {
      const nextProfile = {
        ...(styleProfile ?? buildPreviewProfile()),
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
      };
      setStyleProfile(nextProfile);
      setFormState(toFormState(nextProfile));
      setStatusText(error instanceof Error ? `${error.message} 最新编辑已保留在本地。` : "风格画像暂时更新失败，最新编辑已先保存在本地。");
    } finally {
      setBusyKey(null);
    }
  }

  if (!authReady) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="space-y-6">
      {previewMode ? (
        <VisitorPreviewNotice description="这里会完全停留在本地预览模式。登录前，助理页面会使用演示衣橱、地点和反馈数据。" />
      ) : null}

      <section className="section-card story-gradient rounded-[36px] p-6" data-testid="assistant-overview">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="pill mb-4">
              <Bot className="size-4" />
              个人搭配中枢
            </div>
            <h3 className="display-title text-3xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)] md:text-4xl">
              明日规划、快捷场景和衣橱提醒，现在都收进了同一个更顺手的助理工作台。
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              这里把天气、风格记忆、推荐反馈、打包模式和穿着记录串在一起，所以同一个页面既能承接公开预览，也能无缝切到你的私有助理。
            </p>
            <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-4 text-sm leading-6 text-[var(--ink)]" data-testid="assistant-status">
              {statusText}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">明日城市</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{overview?.tomorrow.weather.location_name ?? "等待中"}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">提醒数量</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{reminderCount}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">已保存搭配</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{overview?.recent_saved_outfits.length ?? 0}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">风格记忆</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{styleProfile?.favorite_colors[0] ?? "学习中"}</p>
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
                  明日助理
                </div>
                <h4 className="text-xl font-semibold text-[var(--ink-strong)]">根据天气、日程和通勤场景，提前规划早晚两套顺手搭配</h4>
              </div>
              <button type="button" onClick={() => void handleTomorrowPlan()} disabled={busyKey === "tomorrow"} className="rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white disabled:opacity-60" data-testid="assistant-generate-tomorrow">
                {busyKey === "tomorrow" ? "生成中..." : "生成明日搭配"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink)]">城市地点</span>
                <div className="flex gap-2">
                  <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" data-testid="assistant-location-input" />
                  <button type="button" onClick={() => void handleSearchLocation()} className="rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)]" data-testid="assistant-location-search">
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
              把通勤层次也考虑进去
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
              <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]" data-testid="assistant-tomorrow-summary">
                {overview.tomorrow.weather.location_name} / {overview.tomorrow.weather.condition_label} / {overview.tomorrow.weather.temperature_min} - {overview.tomorrow.weather.temperature_max}°C
                <div className="mt-2 text-[var(--muted)]">{overview.tomorrow.commute_tip}</div>
              </div>
            ) : null}
          </article>

          {overview ? (
            <>
              <RecommendationLookCard recommendation={overview.tomorrow.morning.recommendation.outfits[0]} items={displayItems} prompt={schedule} scene="tomorrow-morning" previewMode={previewMode} onActionComplete={setStatusText} />
              <RecommendationLookCard recommendation={overview.tomorrow.evening.recommendation.outfits[0]} items={displayItems} prompt={schedule} scene="tomorrow-evening" previewMode={previewMode} onActionComplete={setStatusText} />
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <article className="section-card rounded-[32px] p-5">
            <div className="pill mb-3">
              <Sparkles className="size-4" />
              一键少思考模式
            </div>
            <h4 className="text-xl font-semibold text-[var(--ink-strong)]">点一下场景，就能马上得到一份更轻负担的搭配答案</h4>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {quickModes.map((mode, modeIndex) => (
                <button key={mode.value} type="button" onClick={() => void handleQuickMode(mode)} className="tap-card whitespace-nowrap rounded-full border border-[var(--line)] bg-white/85 px-4 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-soft)]" data-testid={`assistant-quick-mode-${modeIndex}`}>
                  {mode.label}
                </button>
              ))}
            </div>
          </article>

          {quickResult ? (
            <RecommendationLookCard recommendation={quickResult.outfits[0]} items={displayItems} prompt="quick-mode" scene="quick-mode" previewMode={previewMode} onActionComplete={setStatusText} />
          ) : null}

          <article className="section-card rounded-[32px] p-5">
            <div className="pill mb-3">
              <Package2 className="size-4" />
              打包模式
            </div>
            <h4 className="text-xl font-semibold text-[var(--ink-strong)]">根据城市、行程长度和衣橱覆盖度，快速整理一份精简行李清单</h4>
            <button type="button" onClick={() => void handlePackingPlan()} disabled={busyKey === "packing"} className="mt-4 w-full rounded-full border border-[var(--line)] bg-white/85 px-5 py-3 text-sm text-[var(--ink)] shadow-[var(--shadow-soft)] md:w-auto" data-testid="assistant-generate-packing">
              {busyKey === "packing" ? "整理中..." : "生成打包清单"}
            </button>
            {packingSummary ? (
              <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]" data-testid="assistant-packing-summary">
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
            衣橱缺口与护理提醒
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">看看还缺什么、哪些搭配出现得太频繁，以及下一件该护理的单品</h4>
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
            个人风格记忆
          </div>
          <h4 className="text-xl font-semibold text-[var(--ink-strong)]">把颜色、廓形、舒适偏好和备注记下来，让后续推荐更贴近你</h4>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">偏爱颜色</span>
              <input value={formState.favoriteColors} onChange={(event) => setFormState((current) => ({ ...current, favoriteColors: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" data-testid="assistant-favorite-colors" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">避开颜色</span>
              <input value={formState.avoidColors} onChange={(event) => setFormState((current) => ({ ...current, avoidColors: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">偏爱廓形</span>
              <input value={formState.favoriteSilhouettes} onChange={(event) => setFormState((current) => ({ ...current, favoriteSilhouettes: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">避开廓形</span>
              <input value={formState.avoidSilhouettes} onChange={(event) => setFormState((current) => ({ ...current, avoidSilhouettes: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">风格关键词</span>
              <input value={formState.styleKeywords} onChange={(event) => setFormState((current) => ({ ...current, styleKeywords: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">不喜欢的关键词</span>
              <input value={formState.dislikeKeywords} onChange={(event) => setFormState((current) => ({ ...current, dislikeKeywords: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">通勤画像</span>
            <input value={formState.commuteProfile} onChange={(event) => setFormState((current) => ({ ...current, commuteProfile: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">舒适优先级</span>
            <input value={formState.comfortPriorities} onChange={(event) => setFormState((current) => ({ ...current, comfortPriorities: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">衣橱规则</span>
            <input value={formState.wardrobeRules} onChange={(event) => setFormState((current) => ({ ...current, wardrobeRules: event.target.value }))} className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">个人备注</span>
            <textarea value={formState.personalNote} onChange={(event) => setFormState((current) => ({ ...current, personalNote: event.target.value }))} className="min-h-32 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none" data-testid="assistant-personal-note" />
          </label>

          <button type="button" onClick={() => void handleSaveStyleProfile()} disabled={busyKey === "profile"} className="mt-5 w-full rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:opacity-60 md:w-auto" data-testid="assistant-save-profile">
            {busyKey === "profile" ? "保存中..." : "保存风格记忆"}
          </button>
        </article>
      </section>
    </div>
  );
}
