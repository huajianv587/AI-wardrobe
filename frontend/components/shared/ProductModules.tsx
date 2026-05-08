"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shirt,
  Sparkles,
  Upload,
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

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] shadow-[var(--shadow-card)] backdrop-blur-2xl ${className}`}>
      {children}
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="bg-[var(--gradient-brand-text)] bg-clip-text text-3xl font-semibold text-transparent">
        {value}
      </div>
      <div className="mt-2 text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function MatchPill({ value }: { value: number }) {
  return (
    <span className="rounded-[var(--radius-pill)] border border-[var(--border-brand)] bg-[rgba(200,168,255,0.12)] px-3 py-1 text-sm font-semibold text-[var(--brand-purple)]">
      {value}% 匹配
    </span>
  );
}

export function TodayOutfitPanel() {
  const recommendation = outfitRecommendations[0];

  return (
    <GlassPanel className="overflow-hidden p-6 md:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-[var(--radius-pill)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              {recommendation.weather}
            </span>
            <MatchPill value={recommendation.matchScore} />
          </div>
          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {recommendation.title}
          </h2>
          <p className="mt-4 max-w-2xl leading-8 text-[var(--text-secondary)]">
            {recommendation.reason}
          </p>
          <PremiumTagGroup className="mt-7">
            {recommendation.items.map((item, index) => (
              <PremiumTag key={item} color={index % 2 === 0 ? "pink" : "purple"}>
                {item}
              </PremiumTag>
            ))}
          </PremiumTagGroup>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/try-on-new">
              <PremiumButton size="lg" icon={<Sparkles className="h-5 w-5" />}>
                虚拟试穿这套
              </PremiumButton>
            </Link>
            <Link href="/outfit-diary-new">
              <PremiumButton size="lg" variant="ghost">
                保存到日记
              </PremiumButton>
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="grid grid-cols-2 gap-3">
            {wardrobeItems.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-4">
                <div className={`grid aspect-square place-items-center rounded-[var(--radius-md)] bg-gradient-to-br ${item.palette} text-5xl`}>
                  {item.image}
                </div>
                <p className="mt-3 truncate text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{item.lastWorn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

export function QuickActionGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--border-brand)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{action.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{action.description}</p>
            </div>
            <span className="rounded-[var(--radius-pill)] bg-[var(--bg-glass-hover)] px-3 py-1 text-xs font-semibold text-[var(--brand-purple)]">
              {action.stat}
            </span>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-purple)]">
            打开功能 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function RecentActivityFeed() {
  return (
    <GlassPanel className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">最近活动</h2>
        <span className="text-sm text-[var(--text-muted)]">实时同步</span>
      </div>
      <div className="grid gap-3">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--bg-glass-hover)] text-sm font-bold text-[var(--brand-purple)]">
              {activity.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{activity.title}</p>
              <p className="truncate text-sm text-[var(--text-secondary)]">{activity.item}</p>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{activity.time}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <MiniStat value="6 套" label="今日可穿推荐" />
      <MiniStat value="98%" label="最高匹配度" />
      <MiniStat value="45 次" label="累计试衣" />
      <MiniStat value="15 件" label="闲置提醒" />
    </div>
  );
}

export function WardrobeGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WardrobeItem["category"] | "all">("all");
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const categories = useMemo(() => ["all", ...Array.from(new Set(wardrobeItems.map((item) => item.category)))] as Array<WardrobeItem["category"] | "all">, []);
  const filteredItems = wardrobeItems.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const text = `${item.name} ${item.brand} ${item.color} ${item.tags.join(" ")}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });

  return (
    <div className="grid gap-6">
      <GlassPanel className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索衣物、品牌、颜色、标签"
              className="min-h-12 w-full rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--bg-surface)] pl-12 pr-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-brand)]"
            />
          </label>
          <PremiumButton icon={<Plus className="h-5 w-5" />} onClick={() => setShowAdd(true)}>
            上传新衣物
          </PremiumButton>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "border-[var(--border-brand)] bg-[rgba(200,168,255,0.16)] text-[var(--brand-purple)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]"
              }`}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      </GlassPanel>

      {filteredItems.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="group rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--border-brand)]"
            >
              <div className={`grid aspect-square place-items-center rounded-[var(--radius-lg)] bg-gradient-to-br ${item.palette} text-7xl shadow-[var(--shadow-glow)]`}>
                {item.image}
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{item.brand} · {item.color} · {item.season}</p>
                </div>
                <span className="rounded-full bg-[var(--bg-glass-hover)] px-2 py-1 text-xs text-[var(--brand-purple)]">
                  {item.usageCount} 次
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <GlassPanel className="p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-[var(--brand-purple)]" />
          <h3 className="mt-4 text-2xl font-semibold">没有找到匹配衣物</h3>
          <p className="mt-3 text-[var(--text-secondary)]">换一个关键词，或直接上传新单品让 AI 建档。</p>
        </GlassPanel>
      )}

      {selectedItem ? (
        <ItemDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}
      {showAdd ? <AddItemDialog onClose={() => setShowAdd(false)} /> : null}
    </div>
  );
}

function DialogShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-float)]">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-[var(--border-default)] px-3 py-1 text-sm text-[var(--text-secondary)]"
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
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <div className={`grid aspect-square place-items-center rounded-[var(--radius-lg)] bg-gradient-to-br ${item.palette} text-7xl`}>
          {item.image}
        </div>
        <div>
          <h2 className="text-3xl font-semibold">{item.name}</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{item.brand} · {item.color} · {item.season}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat value={`${item.usageCount}`} label="穿着次数" />
            <MiniStat value={item.lastWorn} label="最近穿着" />
          </div>
          <PremiumTagGroup className="mt-5">
            {item.tags.map((tag) => (
              <PremiumTag key={tag} color="purple">{tag}</PremiumTag>
            ))}
          </PremiumTagGroup>
          <div className="mt-6 flex flex-wrap gap-3">
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
      <h2 className="text-3xl font-semibold">上传新衣物</h2>
      <p className="mt-2 text-[var(--text-secondary)]">AI 会自动识别类别、颜色、季节和可搭配场景。</p>
      <div className="mt-6 grid gap-4">
        <div className="grid min-h-36 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-brand)] bg-[rgba(200,168,255,0.08)] text-center">
          <div>
            <Upload className="mx-auto h-8 w-8 text-[var(--brand-purple)]" />
            <p className="mt-3 font-semibold">拖入图片或点击上传</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">支持人台图、平铺图、商品图</p>
          </div>
        </div>
        <input className="min-h-12 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 outline-none focus:border-[var(--border-brand)]" placeholder="衣物名称，例如：奶油白衬衫" />
        <PremiumButton onClick={onClose}>保存并自动打标</PremiumButton>
      </div>
    </DialogShell>
  );
}

export function TryOnStudioPanel() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-semibold">上传区</h2>
        <div className="mt-5 grid gap-4">
          {["上传人像照片", "选择衣橱单品"].map((label, index) => (
            <div key={label} className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-brand)] bg-[rgba(200,168,255,0.08)] p-6">
              <Upload className="h-7 w-7 text-[var(--brand-purple)]" />
              <p className="mt-4 font-semibold">{label}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{index === 0 ? "建议正面站姿、光线均匀" : "可从衣橱直接选择，也可上传商品图"}</p>
            </div>
          ))}
          <PremiumButton fullWidth icon={<Sparkles className="h-5 w-5" />}>生成试衣结果</PremiumButton>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">试衣预览</h2>
          <span className="text-sm text-[var(--text-muted)]">平均 3 秒生成</span>
        </div>
        <div className="mt-5 grid min-h-[420px] place-items-center rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[radial-gradient(circle_at_50%_0%,rgba(200,168,255,0.18),transparent_55%),var(--bg-surface)]">
          <div className="text-center">
            <div className="text-8xl">👗</div>
            <h3 className="mt-5 text-3xl font-semibold">雾蓝外套 + 奶油白衬衫</h3>
            <p className="mt-3 text-[var(--text-secondary)]">背景：城市通勤 · 轮廓贴合度 92%</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {["城市通勤", "咖啡店", "海边日落", "极简影棚"].map((scene) => (
            <span key={scene} className="rounded-[var(--radius-pill)] border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              {scene}
            </span>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

export function RecommendationBoard() {
  const [active, setActive] = useState("全部");
  const tabs = ["全部", "通勤", "周末", "约会"];
  const visible = active === "全部" ? outfitRecommendations : outfitRecommendations.filter((item) => item.scenario.includes(active) || item.title.includes(active));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-[var(--radius-pill)] border px-5 py-2 text-sm font-semibold ${
              active === tab ? "border-[var(--border-brand)] bg-[rgba(200,168,255,0.16)] text-[var(--brand-purple)]" : "border-[var(--border-default)] text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {visible.map((item) => (
          <RecommendationCard key={item.id} recommendation={item} />
        ))}
      </div>
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-semibold">偏好设置</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {["正式度", "舒适度", "亮色占比", "复穿优先"].map((label, index) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span>{[72, 88, 36, 64][index]}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-surface)]">
                <div className="h-full rounded-full bg-[var(--gradient-button)]" style={{ width: `${[72, 88, 36, 64][index]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: OutfitRecommendation }) {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[var(--text-muted)]">{recommendation.scenario}</span>
        <MatchPill value={recommendation.matchScore} />
      </div>
      <h3 className="mt-5 text-2xl font-semibold">{recommendation.title}</h3>
      <p className="mt-3 min-h-24 leading-7 text-[var(--text-secondary)]">{recommendation.reason}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {recommendation.items.map((item) => (
          <span key={item} className="rounded-full border border-[var(--border-default)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {item}
          </span>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <PremiumButton size="sm">试穿</PremiumButton>
        <PremiumButton size="sm" variant="ghost">替换单品</PremiumButton>
      </div>
    </GlassPanel>
  );
}

export function DiaryTimeline() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        {diaryEntries.map((entry) => (
          <GlassPanel key={entry.date} className="p-6">
            <div className="grid gap-5 md:grid-cols-[120px_1fr_auto] md:items-center">
              <div className="grid aspect-square place-items-center rounded-[var(--radius-lg)] bg-[var(--bg-surface)] text-5xl">📸</div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{entry.date} · {entry.weather}</p>
                <h3 className="mt-2 text-2xl font-semibold">{entry.title}</h3>
                <p className="mt-2 text-[var(--text-secondary)]">心情：{entry.mood} · 单品：{entry.items.join("、")}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-[var(--brand-purple)]">{entry.rating}</div>
                <PremiumButton size="sm" variant="ghost">复穿</PremiumButton>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-semibold">本月复盘</h2>
        <div className="mt-5 grid gap-4">
          <MiniStat value="18 天" label="连续记录" />
          <MiniStat value="4.8" label="平均满意度" />
          <MiniStat value="5 个" label="高频场景" />
        </div>
        <div className="mt-6">
          <PremiumButton fullWidth>记录今日穿搭</PremiumButton>
        </div>
      </GlassPanel>
    </div>
  );
}

export function ClosetInsightDashboard() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat value="72%" label="衣橱利用率" />
        <MiniStat value="¥18k" label="估算价值" />
        <MiniStat value="15 件" label="闲置单品" />
        <MiniStat value="4 条" label="购买建议" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <GlassPanel className="p-6">
          <h2 className="text-2xl font-semibold">分类比例</h2>
          <div className="mt-6 grid gap-5">
            {closetInsights.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-[var(--text-muted)]">{item.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-[var(--bg-surface)]">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel className="p-6">
          <h2 className="text-2xl font-semibold">AI 洞察</h2>
          <div className="mt-5 grid gap-4">
            {[
              "轻薄外套偏少，早晚温差场景缺少过渡层。",
              "低饱和色系占比高，可以补一件更有焦点的配饰。",
              "灰色针织开衫已闲置 34 天，建议加入周末搭配。",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-purple)]" />
                <p className="leading-7 text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <PremiumButton fullWidth>生成完整分析报告</PremiumButton>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

export function StyleProfileEditor() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-semibold">风格标签</h2>
        <div className="mt-6 grid gap-5">
          {styleProfile.tags.map((tag) => (
            <div key={tag.name}>
              <div className="mb-2 flex justify-between text-sm">
                <span>{tag.name}</span>
                <span className="text-[var(--brand-purple)]">{tag.score}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--bg-surface)]">
                <div className="h-full rounded-full bg-[var(--gradient-button)]" style={{ width: `${tag.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
      <GlassPanel className="p-6">
        <h2 className="text-2xl font-semibold">色彩偏好</h2>
        <div className="mt-6 grid gap-4">
          {styleProfile.colorPreferences.map((color) => (
            <div key={color.name} className="flex items-center gap-4">
              <span className="h-10 w-10 rounded-2xl border border-[var(--border-default)]" style={{ background: color.color }} />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span>{color.name}</span>
                  <span className="text-[var(--text-muted)]">{color.percent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--bg-surface)]">
                  <div className="h-full rounded-full bg-[var(--brand-purple)]" style={{ width: `${color.percent}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
      <GlassPanel className="p-6 xl:col-span-2">
        <h2 className="text-2xl font-semibold">体型与场景规则</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <h3 className="font-semibold">体型信息</h3>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)]">
              {styleProfile.bodyNotes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <h3 className="font-semibold">场景偏好</h3>
            <div className="mt-4 grid gap-3">
              {styleProfile.scenarioPreferences.map((item) => (
                <div key={item.scenario} className="flex items-center justify-between gap-4 text-sm">
                  <span>{item.scenario}</span>
                  <span className="text-[var(--text-muted)]">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <PremiumButton>更新风格档案</PremiumButton>
          <PremiumButton variant="ghost">查看推荐权重</PremiumButton>
        </div>
      </GlassPanel>
    </div>
  );
}

export function LandingProductPreview() {
  return (
    <div className="mx-auto mt-16 grid max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <TodayOutfitPanel />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <QuickActionGrid />
        <RecentActivityFeed />
      </div>
    </div>
  );
}

export function FeatureWorkflowMock({ type }: { type: "wardrobe" | "tryon" | "recommend" | "analysis" | "profile" }) {
  const map = {
    wardrobe: { icon: Shirt, title: "衣橱管理", body: "搜索、筛选、详情弹窗和上传入口都在同一个工作台里。", stat: "128 件单品" },
    tryon: { icon: Sparkles, title: "虚拟试衣", body: "上传人像和衣物后，预览上身效果并切换场景背景。", stat: "3 秒生成" },
    recommend: { icon: RefreshCw, title: "搭配推荐", body: "每套推荐都有匹配理由、可替换单品和一键试穿。", stat: "98% 匹配" },
    analysis: { icon: BarChart3, title: "衣橱分析", body: "把分类比例、闲置提醒、缺口建议转化为行动。", stat: "15 件提醒" },
    profile: { icon: Filter, title: "风格档案", body: "维护风格标签、色彩偏好、体型信息和场景权重。", stat: "12 个标签" },
  }[type];
  const Icon = map.icon;

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gradient-button)] text-white">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-muted)]">{map.stat}</p>
          <h3 className="text-2xl font-semibold">{map.title}</h3>
        </div>
      </div>
      <p className="mt-5 leading-8 text-[var(--text-secondary)]">{map.body}</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {wardrobeItems.slice(0, 3).map((item) => (
          <div key={item.id} className={`grid aspect-square place-items-center rounded-[var(--radius-lg)] bg-gradient-to-br ${item.palette} text-4xl`}>
            {item.image}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
