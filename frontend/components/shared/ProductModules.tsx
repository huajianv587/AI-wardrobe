"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Filter,
  Heart,
  ImageIcon,
  Layers3,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Shirt,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumTag, PremiumTagGroup } from "@/components/ui/PremiumTag";
import {
  closetInsights,
  diaryEntries,
  outfitRecommendations,
  quickActions,
  recentActivities,
  styleProfile,
  wardrobeItems,
  type ActivityItem,
  type OutfitRecommendation,
  type WardrobeItem,
} from "@/lib/v2-product-data";

const categoryLabels: Record<WardrobeItem["category"] | "all", string> = {
  all: "全部",
  tops: "上装",
  bottoms: "下装",
  dresses: "裙装",
  outerwear: "外套",
  shoes: "鞋履",
  accessories: "配饰",
};

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[36px] border border-white/80 bg-white/74 shadow-[var(--shadow-card)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function ImageFrame({
  src,
  alt,
  className = "",
  imageClassName = "",
  fallbackLabel = "AI Wardrobe",
}: {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(!src);

  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(135deg,#f7eee6,#efe7ff)] ${className}`}
    >
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center p-6 text-center text-[var(--text-muted)]">
          <div>
            <ImageIcon className="mx-auto h-8 w-8 text-[var(--brand-purple)]" />
            <p className="mt-3 text-sm font-semibold">{fallbackLabel}</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_42%,rgba(22,14,32,0.20)_100%)]" />
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="text-2xl font-semibold tracking-[-0.03em] text-[var(--brand-purple)] md:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function MatchPill({ value }: { value: number }) {
  return (
    <span className="rounded-[var(--radius-pill)] border border-[var(--border-brand)] bg-[#f5ecff] px-4 py-2 text-sm font-semibold text-[var(--brand-purple)]">
      {value}% 匹配
    </span>
  );
}

function activityIcon(type: ActivityItem["type"]) {
  const icons = {
    upload: Plus,
    save: CheckCircle2,
    "try-on": Sparkles,
    analysis: BarChart3,
  } satisfies Record<ActivityItem["type"], typeof Plus>;
  return icons[type];
}

function actionIcon(href: string) {
  if (href.includes("wardrobe")) return Shirt;
  if (href.includes("try-on")) return Sparkles;
  if (href.includes("recommend")) return Heart;
  if (href.includes("diary")) return CalendarDays;
  if (href.includes("analysis")) return BarChart3;
  return Palette;
}

export function TodayOutfitPanel() {
  const recommendation = outfitRecommendations[0];
  const supportingItems = wardrobeItems.slice(0, 4);

  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-0 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="min-h-[560px] p-7 md:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-[var(--radius-pill)] bg-[#fff7ed] px-4 py-2 text-sm text-[var(--text-secondary)]">
                {recommendation.weather}
              </span>
              <MatchPill value={recommendation.matchScore} />
            </div>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--brand-gold)]">
              Today Look
            </p>
            <h2 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] md:text-6xl">
              {recommendation.title}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-9 text-[var(--text-secondary)]">
              {recommendation.reason}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
              {recommendation.confidenceNote}
            </p>
            <PremiumTagGroup className="mt-8">
              {recommendation.items.map((item, index) => (
                <PremiumTag key={item} color={index % 2 === 0 ? "pink" : "purple"}>
                  {item}
                </PremiumTag>
              ))}
            </PremiumTagGroup>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PremiumButton
              size="lg"
              icon={<Sparkles className="h-5 w-5" />}
              onClick={() => {
                window.location.href = "/try-on-new";
              }}
            >
              虚拟试穿这套
            </PremiumButton>
            <PremiumButton
              size="lg"
              variant="ghost"
              onClick={() => {
                window.location.href = "/outfit-diary-new";
              }}
            >
              保存到日记
            </PremiumButton>
          </div>
        </div>

        <div className="relative min-h-[560px] border-t border-[var(--border-subtle)] bg-[#fbf4ee] p-5 md:p-7 xl:border-l xl:border-t-0">
          <ImageFrame
            src={recommendation.heroImageUrl}
            alt={recommendation.imageAlt}
            className="h-full min-h-[420px] rounded-[32px]"
            imageClassName="object-[center_18%]"
            fallbackLabel={recommendation.title}
          />
          <div className="absolute bottom-8 left-8 right-8 grid gap-3 sm:grid-cols-2">
            {supportingItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-white/70 bg-white/78 p-3 shadow-[0_18px_50px_rgba(65,45,80,0.14)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <ImageFrame
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    className="h-16 w-16 shrink-0 rounded-2xl"
                    fallbackLabel={item.name}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{item.lastWorn}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function DashboardStats() {
  return (
    <Panel className="px-6 py-5 md:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric value="6 套" label="今日可穿推荐" />
        <Metric value="98%" label="最高匹配度" />
        <Metric value="45 次" label="累计试衣" />
        <Metric value="15 件" label="闲置提醒" />
      </div>
    </Panel>
  );
}

export function QuickActionGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {quickActions.map((action) => {
        const Icon = actionIcon(action.href);
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-[32px] border border-white/80 bg-white/76 p-6 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5ecff] text-[var(--brand-purple)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
                {action.stat}
              </span>
            </div>
            <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">{action.title}</h3>
            <p className="mt-3 min-h-12 leading-7 text-[var(--text-secondary)]">
              {action.description}
            </p>
            <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-purple)]">
              打开功能 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function RecentActivityFeed() {
  return (
    <Panel className="p-7 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand-gold)]">
            Timeline
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">最近活动</h2>
        </div>
        <span className="rounded-full bg-[#f8f1ea] px-4 py-2 text-sm text-[var(--text-muted)]">
          实时同步
        </span>
      </div>
      <div className="relative grid gap-0">
        <div className="absolute bottom-8 left-5 top-8 w-px bg-[var(--border-default)]" />
        {recentActivities.map((activity) => {
          const Icon = activityIcon(activity.type);
          return (
            <div key={activity.id} className="relative flex gap-5 py-4">
              <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white bg-[#f5ecff] text-[var(--brand-purple)] shadow-[var(--shadow-card)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 rounded-[24px] bg-white/58 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{activity.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{activity.item}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function WardrobeGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WardrobeItem["category"] | "all">("all");
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(wardrobeItems.map((item) => item.category)))] as Array<WardrobeItem["category"] | "all">,
    []
  );
  const filteredItems = wardrobeItems.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const text = `${item.name} ${item.brand} ${item.color} ${item.tags.join(" ")}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });

  return (
    <div className="grid gap-8">
      <Panel className="p-6 md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索衣物、品牌、颜色、标签"
              className="min-h-14 w-full rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-white/76 pl-14 pr-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-brand)] focus:bg-white"
            />
          </label>
          <PremiumButton icon={<Plus className="h-5 w-5" />} onClick={() => setShowAdd(true)}>
            上传新衣物
          </PremiumButton>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-[var(--radius-pill)] border px-5 py-2.5 text-sm font-semibold transition ${
                category === item
                  ? "border-[var(--border-brand)] bg-[#f5ecff] text-[var(--brand-purple)]"
                  : "border-[var(--border-default)] bg-white/60 text-[var(--text-secondary)] hover:bg-white"
              }`}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      </Panel>

      {filteredItems.length ? (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="group rounded-[34px] border border-white/80 bg-white/74 p-4 text-left shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:bg-white"
            >
              <ImageFrame
                src={item.imageUrl}
                alt={item.imageAlt}
                className="aspect-[4/5] rounded-[28px]"
                fallbackLabel={item.name}
              />
              <div className="p-2 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl font-semibold tracking-[-0.03em]">{item.name}</h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {item.brand} · {item.color} · {item.season}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f8f1ea] px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
                    {item.usageCount} 次
                  </span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">{item.fitNote}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border-default)] bg-white/70 px-3 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Panel className="p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-[var(--brand-purple)]" />
          <h3 className="mt-4 text-2xl font-semibold">没有找到匹配衣物</h3>
          <p className="mt-3 text-[var(--text-secondary)]">换一个关键词，或直接上传新单品让 AI 建档。</p>
        </Panel>
      )}

      {selectedItem ? <ItemDialog item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
      {showAdd ? <AddItemDialog onClose={() => setShowAdd(false)} /> : null}
    </div>
  );
}

function DialogShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#2a1830]/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl rounded-[36px] border border-white/80 bg-white p-6 shadow-[var(--shadow-float)] md:p-8">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-[var(--border-default)] bg-white/80 px-3 py-1 text-sm text-[var(--text-secondary)]"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: WardrobeItem; onClose: () => void }) {
  return (
    <DialogShell onClose={onClose}>
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <ImageFrame
          src={item.imageUrl}
          alt={item.imageAlt}
          className="aspect-[4/5] rounded-[28px]"
          fallbackLabel={item.name}
        />
        <div className="pr-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand-gold)]">
            {item.category}
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{item.name}</h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            {item.brand} · {item.color} · {item.season} · {item.material}
          </p>
          <p className="mt-5 leading-8 text-[var(--text-secondary)]">{item.fitNote}</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Metric value={`${item.usageCount}`} label="穿着次数" />
            <Metric value={item.lastWorn} label="最近穿着" />
          </div>
          <PremiumTagGroup className="mt-7">
            {item.tags.map((tag) => (
              <PremiumTag key={tag} color="purple">
                {tag}
              </PremiumTag>
            ))}
          </PremiumTagGroup>
          <div className="mt-8 flex flex-wrap gap-3">
            <PremiumButton>加入今日搭配</PremiumButton>
            <PremiumButton variant="ghost">编辑信息</PremiumButton>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function AddItemDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell onClose={onClose}>
      <h2 className="text-4xl font-semibold tracking-[-0.04em]">上传新衣物</h2>
      <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
        AI 会自动识别类别、颜色、季节和可搭配场景，先生成一个可编辑的衣物档案。
      </p>
      <div className="mt-8 grid gap-5">
        <div className="grid min-h-44 place-items-center rounded-[30px] border border-dashed border-[var(--border-brand)] bg-[#f8f1ff] text-center">
          <div>
            <Upload className="mx-auto h-8 w-8 text-[var(--brand-purple)]" />
            <p className="mt-3 font-semibold">拖入图片或点击上传</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">支持人台图、平铺图、商品图</p>
          </div>
        </div>
        <input
          className="min-h-14 rounded-full border border-[var(--border-default)] bg-white/80 px-5 outline-none focus:border-[var(--border-brand)]"
          placeholder="衣物名称，例如：奶油白衬衫"
        />
        <PremiumButton onClick={onClose}>保存并自动打标</PremiumButton>
      </div>
    </DialogShell>
  );
}

export function TryOnStudioPanel() {
  const look = outfitRecommendations[2];

  return (
    <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
      <Panel className="p-7 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand-gold)]">
          Studio
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">试衣工作室</h2>
        <div className="mt-8 grid gap-4">
          {[
            { title: "上传人像照片", body: "建议正面站姿、光线均匀。", icon: Camera },
            { title: "选择衣橱单品", body: "从衣橱选择，也可以上传商品图。", icon: Shirt },
            { title: "选择场景背景", body: "通勤、晚餐、旅行等场景可快速切换。", icon: Layers3 },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-[28px] border border-[var(--border-default)] bg-white/68 p-5">
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f5ecff] text-[var(--brand-purple)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--brand-gold)]">Step {index + 1}</p>
                    <h3 className="mt-1 font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <PremiumButton fullWidth icon={<Wand2 className="h-5 w-5" />}>
            生成试衣结果
          </PremiumButton>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1fr_240px]">
          <ImageFrame
            src={look.heroImageUrl}
            alt={look.imageAlt}
            className="min-h-[560px]"
            imageClassName="object-[center_18%]"
            fallbackLabel={look.title}
          />
          <div className="flex flex-col justify-between border-t border-[var(--border-subtle)] p-6 md:border-l md:border-t-0">
            <div>
              <p className="text-sm text-[var(--text-muted)]">平均 3 秒生成</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{look.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{look.reason}</p>
            </div>
            <div className="mt-8 grid gap-3">
              {["城市通勤", "晚餐约会", "海边日落", "极简影棚"].map((scene) => (
                <button
                  key={scene}
                  type="button"
                  className="rounded-full border border-[var(--border-default)] bg-white/70 px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-white"
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function RecommendationBoard() {
  const [active, setActive] = useState("全部");
  const tabs = ["全部", "通勤", "周末", "聚会"];
  const visible =
    active === "全部"
      ? outfitRecommendations
      : outfitRecommendations.filter((item) => item.scenario.includes(active) || item.title.includes(active));

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-[var(--radius-pill)] border px-5 py-2.5 text-sm font-semibold ${
              active === tab
                ? "border-[var(--border-brand)] bg-[#f5ecff] text-[var(--brand-purple)]"
                : "border-[var(--border-default)] bg-white/64 text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="grid gap-7 lg:grid-cols-2">
        {visible.map((item) => (
          <RecommendationCard key={item.id} recommendation={item} />
        ))}
      </div>
      <Panel className="p-7 md:p-8">
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">偏好权重</h2>
        <div className="mt-7 grid gap-6 md:grid-cols-4">
          {["正式度", "舒适度", "亮色占比", "复穿优先"].map((label, index) => (
            <div key={label}>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span>{[72, 88, 36, 64][index]}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#f3ece5]">
                <div
                  className="h-full rounded-full bg-[var(--gradient-button)]"
                  style={{ width: `${[72, 88, 36, 64][index]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: OutfitRecommendation }) {
  return (
    <Panel className="overflow-hidden">
      <ImageFrame
        src={recommendation.heroImageUrl}
        alt={recommendation.imageAlt}
        className="aspect-[16/11]"
        imageClassName="object-[center_18%]"
        fallbackLabel={recommendation.title}
      />
      <div className="p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-muted)]">{recommendation.occasion}</span>
          <MatchPill value={recommendation.matchScore} />
        </div>
        <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{recommendation.title}</h3>
        <p className="mt-4 leading-8 text-[var(--text-secondary)]">{recommendation.reason}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{recommendation.confidenceNote}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {recommendation.items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--border-default)] bg-white/70 px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-7 flex gap-3">
          <PremiumButton size="sm">试穿</PremiumButton>
          <PremiumButton size="sm" variant="ghost">
            替换单品
          </PremiumButton>
        </div>
      </div>
    </Panel>
  );
}

export function DiaryTimeline() {
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="grid gap-7">
        {diaryEntries.map((entry) => (
          <Panel key={entry.date} className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[260px_1fr]">
              <ImageFrame
                src={entry.imageUrl}
                alt={entry.imageAlt}
                className="aspect-[4/5] md:aspect-auto"
                fallbackLabel={entry.title}
              />
              <div className="p-7 md:p-8">
                <p className="text-sm text-[var(--text-muted)]">
                  {entry.date} · {entry.weather}
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{entry.title}</h3>
                <p className="mt-4 text-[var(--text-secondary)]">
                  心情：{entry.mood} · 单品：{entry.items.join("、")}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-semibold text-[var(--brand-purple)]">{entry.rating}</span>
                  <span className="text-sm text-[var(--text-muted)]">满意度</span>
                  <PremiumButton size="sm" variant="ghost">
                    复穿
                  </PremiumButton>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="p-7 md:p-8">
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">本月复盘</h2>
        <div className="mt-7 grid gap-6">
          <Metric value="18 天" label="连续记录" />
          <Metric value="4.8" label="平均满意度" />
          <Metric value="5 个" label="高频场景" />
        </div>
        <div className="mt-8">
          <PremiumButton fullWidth>记录今日穿搭</PremiumButton>
        </div>
      </Panel>
    </div>
  );
}

export function ClosetInsightDashboard() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-5 md:grid-cols-4">
        <Panel className="p-6"><Metric value="72%" label="衣橱利用率" /></Panel>
        <Panel className="p-6"><Metric value="¥18k" label="估算价值" /></Panel>
        <Panel className="p-6"><Metric value="15 件" label="闲置单品" /></Panel>
        <Panel className="p-6"><Metric value="4 条" label="购买建议" /></Panel>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <Panel className="p-7 md:p-8">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">分类比例</h2>
          <div className="mt-8 grid gap-6">
            {closetInsights.map((item) => (
              <div key={item.label}>
                <div className="mb-3 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-[var(--text-muted)]">{item.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-[#f3ece5]">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-7 md:p-8">
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">AI 洞察</h2>
          <div className="mt-7 grid gap-4">
            {[
              "轻薄外套偏少，早晚温差场景缺少过渡层。",
              "低饱和色系占比高，可以补一件更有焦点的配饰。",
              "灰色针织开衫已闲置 34 天，建议加入周末搭配。",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[26px] bg-white/64 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-purple)]" />
                <p className="leading-7 text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <PremiumButton fullWidth>生成完整分析报告</PremiumButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function StyleProfileEditor() {
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
      <Panel className="p-7 md:p-8">
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">风格标签</h2>
        <div className="mt-8 grid gap-6">
          {styleProfile.tags.map((tag) => (
            <div key={tag.name}>
              <div className="mb-3 flex justify-between text-sm">
                <span>{tag.name}</span>
                <span className="text-[var(--brand-purple)]">{tag.score}%</span>
              </div>
              <div className="h-3 rounded-full bg-[#f3ece5]">
                <div className="h-full rounded-full bg-[var(--gradient-button)]" style={{ width: `${tag.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-7 md:p-8">
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">色彩偏好</h2>
        <div className="mt-8 grid gap-5">
          {styleProfile.colorPreferences.map((color) => (
            <div key={color.name} className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl border border-[var(--border-default)]" style={{ background: color.color }} />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{color.name}</span>
                  <span className="text-[var(--text-muted)]">{color.percent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#f3ece5]">
                  <div className="h-full rounded-full bg-[var(--brand-purple)]" style={{ width: `${color.percent}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-7 md:p-8 xl:col-span-2">
        <h2 className="text-3xl font-semibold tracking-[-0.04em]">体型与场景规则</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[30px] bg-white/64 p-6">
            <h3 className="font-semibold">体型信息</h3>
            <ul className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)]">
              {styleProfile.bodyNotes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[30px] bg-white/64 p-6">
            <h3 className="font-semibold">场景偏好</h3>
            <div className="mt-5 grid gap-4">
              {styleProfile.scenarioPreferences.map((item) => (
                <div key={item.scenario} className="flex items-center justify-between gap-4 text-sm">
                  <span>{item.scenario}</span>
                  <span className="text-[var(--text-muted)]">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PremiumButton>更新风格档案</PremiumButton>
          <PremiumButton variant="ghost">查看推荐权重</PremiumButton>
        </div>
      </Panel>
    </div>
  );
}

export function LandingProductPreview() {
  return (
    <div className="mx-auto mt-16 max-w-6xl">
      <TodayOutfitPanel />
    </div>
  );
}

export function FeatureWorkflowMock({ type }: { type: "wardrobe" | "tryon" | "recommend" | "analysis" | "profile" }) {
  const map = {
    wardrobe: {
      icon: Shirt,
      title: "衣橱管理",
      body: "搜索、筛选、详情弹窗和上传入口都在同一个工作台里。",
      stat: "128 件单品",
      image: wardrobeItems[0].imageUrl,
      alt: wardrobeItems[0].imageAlt,
    },
    tryon: {
      icon: Sparkles,
      title: "虚拟试衣",
      body: "上传人像和衣物后，预览上身效果并切换场景背景。",
      stat: "3 秒生成",
      image: outfitRecommendations[2].heroImageUrl,
      alt: outfitRecommendations[2].imageAlt,
    },
    recommend: {
      icon: RefreshCw,
      title: "搭配推荐",
      body: "每套推荐都有匹配理由、可替换单品和一键试穿。",
      stat: "98% 匹配",
      image: outfitRecommendations[0].heroImageUrl,
      alt: outfitRecommendations[0].imageAlt,
    },
    analysis: {
      icon: BarChart3,
      title: "衣橱分析",
      body: "把分类比例、闲置提醒、缺口建议转化为行动。",
      stat: "15 件提醒",
      image: wardrobeItems[7].imageUrl,
      alt: wardrobeItems[7].imageAlt,
    },
    profile: {
      icon: Filter,
      title: "风格档案",
      body: "维护风格标签、色彩偏好、体型信息和场景权重。",
      stat: "12 个标签",
      image: outfitRecommendations[1].heroImageUrl,
      alt: outfitRecommendations[1].imageAlt,
    },
  }[type];
  const Icon = map.icon;

  return (
    <Panel className="overflow-hidden">
      <ImageFrame src={map.image} alt={map.alt} className="aspect-[4/3]" fallbackLabel={map.title} />
      <div className="p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5ecff] text-[var(--brand-purple)]">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-muted)]">{map.stat}</p>
            <h3 className="text-2xl font-semibold">{map.title}</h3>
          </div>
        </div>
        <p className="mt-5 leading-8 text-[var(--text-secondary)]">{map.body}</p>
      </div>
    </Panel>
  );
}
