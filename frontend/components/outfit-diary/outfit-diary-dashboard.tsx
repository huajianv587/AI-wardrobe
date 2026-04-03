"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, CalendarDays, MapPin, PlaneTakeoff, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { ApiError, fetchPackingPlan, fetchSavedOutfits, fetchWardrobeItems, fetchWearLogs, type PackingResponse, type SavedOutfit, type WearLog } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { seedWardrobeItems, type WardrobeItem } from "@/store/wardrobe-store";

function buildPreviewOutfits() {
  return [
    { id: 901, user_id: null, name: "奶油通勤风", occasion: "通勤", style: "轻正式", item_ids: [1, 3, 7], reasoning: "用柔和浅色把工作日穿搭做得更轻松。", ai_generated: true, created_at: new Date().toISOString() },
    { id: 902, user_id: null, name: "周末咖啡馆", occasion: "周末", style: "松弛感", item_ids: [2, 4, 8], reasoning: "用针织和轻盈下装做出轻松但不随便的状态。", ai_generated: true, created_at: new Date().toISOString() }
  ] satisfies SavedOutfit[];
}

function buildPreviewLogs(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  return [
    { id: 801, user_id: 0, outfit_id: 901, outfit_name: "奶油通勤风", item_ids: [1, 3, 7], occasion: "上班", period: "all-day", location_label: "静安办公区", feedback_note: "这套很稳，也不显得太板正。", worn_on: `${prefix}-05` },
    { id: 802, user_id: 0, outfit_id: 902, outfit_name: "周末咖啡馆", item_ids: [2, 4, 8], occasion: "周末", period: "afternoon", location_label: "安福路", feedback_note: "轻松但还是有点精致感，适合散步和见朋友。", worn_on: `${prefix}-12` },
    { id: 803, user_id: 0, outfit_id: 901, outfit_name: "轻柔会议日", item_ids: [6, 3, 7], occasion: "会议", period: "morning", location_label: "陆家嘴", feedback_note: "适合需要稳重一点的早会。", worn_on: `${prefix}-18` }
  ] satisfies WearLog[];
}

function buildPreviewPacking(items: WardrobeItem[], city: string, days: number): PackingResponse {
  return {
    city,
    weather: {
      location_name: city,
      timezone: "Asia/Shanghai",
      date: new Date().toISOString().slice(0, 10),
      weather_code: 1,
      condition_label: "晴间多云",
      temperature_max: 25,
      temperature_min: 18,
      precipitation_probability_max: 12
    },
    capsule_summary: `为 ${days} 天行程准备一组轻松好搭的胶囊衣橱，优先保留通勤和步行都舒服的单品。`,
    suggestions: items.slice(0, 4).map((item, index) => ({
      item_id: item.id,
      reason: index % 2 === 0 ? "可重复组合" : "适合天气波动"
    }))
  };
}

function buildMonthGrid(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const total = Math.ceil((leading + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: total }, (_, index) => {
    const dayNumber = index - leading + 1;
    const date = new Date(year, month, dayNumber);
    const inMonth = date.getMonth() === month;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    return {
      key,
      date,
      dayNumber: date.getDate(),
      inMonth
    };
  });
}

function groupLogsByDate(logs: WearLog[]) {
  return logs.reduce<Record<string, WearLog[]>>((accumulator, log) => {
    const key = log.worn_on;
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(log);
    return accumulator;
  }, {});
}

export function OutfitDiaryDashboard() {
  const { ready, isAuthenticated } = useAuthSession();
  const [logs, setLogs] = useState<WearLog[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [packingPlan, setPackingPlan] = useState<PackingResponse | null>(null);
  const [statusText, setStatusText] = useState("正在读取整月穿搭记录...");
  const [loading, setLoading] = useState(true);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingCity, setPackingCity] = useState("上海");
  const [packingDays, setPackingDays] = useState(3);
  const [tripKind, setTripKind] = useState("轻通勤");
  const [includeCommute, setIncludeCommute] = useState(true);
  const previewMode = !isAuthenticated;

  const today = useMemo(() => new Date(), []);
  const monthGrid = useMemo(() => buildMonthGrid(today), [today]);
  const logMap = useMemo(() => groupLogsByDate(logs), [logs]);
  const defaultDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [selectedDateKey, setSelectedDateKey] = useState(defaultDateKey);

  const selectedLogs = logMap[selectedDateKey] ?? [];

  const itemMap = useMemo(() => {
    return items.reduce<Record<number, WardrobeItem>>((accumulator, item) => {
      accumulator[item.id] = item;
      return accumulator;
    }, {});
  }, [items]);

  const savedOutfitMap = useMemo(() => {
    return savedOutfits.reduce<Record<number, SavedOutfit>>((accumulator, outfit) => {
      accumulator[outfit.id] = outfit;
      return accumulator;
    }, {});
  }, [savedOutfits]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      const previewItems = seedWardrobeItems;
      const previewOutfits = buildPreviewOutfits();
      setItems(previewItems);
      setSavedOutfits(previewOutfits);
      setLogs(buildPreviewLogs(today));
      setPackingPlan(buildPreviewPacking(previewItems, "上海", 3));
      setStatusText("当前是访客预览模式，你可以先浏览整月日历、飞入详情和行李箱模式，登录后会换成你的真实穿搭日志。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [nextLogs, nextOutfits, nextItems] = await Promise.all([
          fetchWearLogs(),
          fetchSavedOutfits(),
          fetchWardrobeItems()
        ]);

        if (cancelled) {
          return;
        }

        setLogs(nextLogs);
        setSavedOutfits(nextOutfits);
        setItems(nextItems);
        setStatusText(nextLogs.length > 0 ? "本月穿搭记录已经展开，点击日期可查看当日 look 详情。" : "当前还没有穿搭日志，后面记录后会在整月日历里逐天沉淀。");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatusText(
          error instanceof ApiError && error.status === 401
            ? "登录状态失效了，请重新登录后查看穿搭日志。"
            : error instanceof Error
              ? error.message
              : "暂时无法读取穿搭日志。"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready, today]);

  async function handleGeneratePackingPlan() {
    setPackingLoading(true);

    try {
      if (previewMode) {
        const result = buildPreviewPacking(items.length > 0 ? items : seedWardrobeItems, packingCity.trim() || "上海", packingDays);
        setPackingPlan(result);
        setStatusText(`访客预览模式下，已经为 ${result.city} 模拟生成了 ${packingDays} 天的行李箱建议。`);
        return;
      }

      const result = await fetchPackingPlan({
        city: packingCity.trim() || "上海",
        days: packingDays,
        trip_kind: tripKind.trim() || "轻通勤",
        include_commute: includeCommute
      });

      setPackingPlan(result);
      setStatusText(`已根据 ${result.city} 的天气生成 ${packingDays} 天的行李箱建议。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "行李箱模式生成失败。");
    } finally {
      setPackingLoading(false);
    }
  }

  if (!ready || loading) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        {previewMode ? (
          <VisitorPreviewNotice description="你现在看到的是穿搭日志预览版。月历、飞入详情和行李箱模式都已经开放浏览，登录后会自动替换成你的真实记录。" />
        ) : null}

        <section className="section-card story-gradient rounded-[32px] p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe2d7_0%,#fff6ef_52%,#def4ea_100%)] p-3 text-[var(--ink-strong)]">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">Diary + motion detail</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">穿搭日志工作台</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{statusText}</p>
            </div>
          </div>
        </section>

        <section className="section-card rounded-[32px] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="pill mb-3">Month calendar</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">
                {today.getFullYear()} 年 {today.getMonth() + 1} 月
              </h3>
            </div>
            <div className="text-xs leading-5 text-[var(--muted)]">点击日期，右侧会以飞入动效展开当天穿搭。</div>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map((cell) => {
              const hasLog = (logMap[cell.key] ?? []).length > 0;
              const isSelected = selectedDateKey === cell.key;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.key)}
                  className={`relative min-h-24 rounded-[22px] border p-3 text-left transition ${
                    isSelected
                      ? "border-transparent bg-[linear-gradient(145deg,rgba(255,207,198,0.92),rgba(255,246,239,0.95),rgba(223,246,235,0.9))] shadow-[var(--shadow-float)]"
                      : "border-[var(--line)] bg-white/80 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  } ${cell.inMonth ? "" : "opacity-45"}`}
                >
                  <span className="text-sm font-semibold text-[var(--ink-strong)]">{cell.dayNumber}</span>
                  {hasLog ? (
                    <span className="absolute right-3 top-3 size-2 rounded-full bg-[var(--accent)]" />
                  ) : null}
                  <div className="mt-6 text-[11px] leading-4 text-[var(--muted)]">
                    {hasLog ? `${logMap[cell.key].length} 条记录` : "未记录"}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="section-card rounded-[32px] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="pill mb-3">Fly-in detail</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">{selectedDateKey}</h3>
            </div>
            <Sparkles className="size-5 text-[var(--accent)]" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDateKey}
              initial={{ opacity: 0, x: 40, y: 20, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -24, y: -8, scale: 0.98, filter: "blur(6px)" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {selectedLogs.length > 0 ? selectedLogs.map((log) => {
                const relatedOutfit = log.outfit_id ? savedOutfitMap[log.outfit_id] : null;
                const title = log.outfit_name ?? relatedOutfit?.name ?? "当日穿搭";

                return (
                  <article key={log.id} className="rounded-[26px] border border-[var(--line)] bg-white/84 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-[var(--ink-strong)]">{title}</h4>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {log.occasion ?? "日常场景"} · {log.period}
                        </p>
                      </div>
                      <span className="pill">{relatedOutfit?.style ?? "Diary look"}</span>
                    </div>

                    {log.location_label ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-3 py-2 text-xs text-[var(--ink)]">
                        <MapPin className="size-3.5" />
                        {log.location_label}
                      </div>
                    ) : null}

                    {log.feedback_note ? (
                      <p className="mt-4 rounded-[22px] bg-[var(--background-soft)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
                        {log.feedback_note}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {log.item_ids.map((itemId) => (
                        <span key={itemId} className="pill">
                          {itemMap[itemId]?.name ?? `单品 #${itemId}`}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              }) : (
                <div className="rounded-[26px] border border-dashed border-[var(--line)] bg-white/75 px-4 py-10 text-center text-sm leading-6 text-[var(--muted)]">
                  这一天暂时还没有穿搭日志。等你开始记录之后，这里会展示当天 look、地点、场景和备注。
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <section className="section-card rounded-[32px] p-5">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe4da_0%,#fff6ef_50%,#e3f7ee_100%)] p-3 text-[var(--ink-strong)]">
              <Briefcase className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">Packing mode</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">行李箱模式</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">点一下就能按城市、天数和出行场景，生成胶囊衣橱建议。</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">目的地</span>
              <input
                value={packingCity}
                onChange={(event) => setPackingCity(event.target.value)}
                className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">天数</span>
              <input
                value={packingDays}
                onChange={(event) => setPackingDays(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                min={1}
                max={14}
                className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">出行类型</span>
            <input
              value={tripKind}
              onChange={(event) => setTripKind(event.target.value)}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
            />
          </label>

          <label className="mt-4 inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/82 px-4 py-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={includeCommute}
              onChange={(event) => setIncludeCommute(event.target.checked)}
            />
            保留通勤搭配需求
          </label>

          <button
            type="button"
            onClick={() => void handleGeneratePackingPlan()}
            disabled={packingLoading}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlaneTakeoff className="size-4" />
            {packingLoading ? "生成中..." : "生成行李箱方案"}
          </button>

          {packingPlan ? (
            <div className="mt-5 space-y-4 rounded-[26px] border border-[var(--line)] bg-white/84 p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--ink-strong)]">
                  {packingPlan.city} · {packingPlan.weather.condition_label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{packingPlan.capsule_summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {packingPlan.suggestions.map((suggestion) => (
                  <span key={`${suggestion.item_id}-${suggestion.reason}`} className="pill">
                    {itemMap[suggestion.item_id]?.name ?? `单品 #${suggestion.item_id}`} · {suggestion.reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
