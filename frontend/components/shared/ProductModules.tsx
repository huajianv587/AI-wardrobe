"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  CloudSun,
  Gauge,
  Layers3,
  MessageCircle,
  Palette,
  Plus,
  Search,
  Shirt,
  Sparkles,
  SunMedium,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumTag, PremiumTagGroup } from "@/components/ui/PremiumTag";
import {
  assistantPrompts,
  closetInsights,
  diaryEntries,
  modelCapabilities,
  outfitRecommendations,
  productRoutes,
  recentActivities,
  styleProfile,
  wardrobeItems,
  type ActivityItem,
  type OutfitRecommendation,
  type WardrobeItem,
} from "@/lib/v2-product-data";
import {
  CouturePanel,
  EditorialImage,
  ModelCapabilityBadge,
  routeIcon,
} from "./CoutureSystem";

const categoryLabels: Record<WardrobeItem["category"] | "all", string> = {
  all: "全部",
  tops: "上装",
  bottoms: "下装",
  dresses: "裙装",
  outerwear: "外套",
  shoes: "鞋履",
  accessories: "配饰",
};

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)] md:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-[var(--couture-muted)]">{label}</div>
    </div>
  );
}

function MatchPill({ value }: { value: number }) {
  return (
    <span className="rounded-full border border-[rgba(184,140,74,0.22)] bg-[rgba(255,248,235,0.82)] px-4 py-2 text-sm font-semibold text-[var(--couture-gold)]">
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
    assistant: MessageCircle,
  } satisfies Record<ActivityItem["type"], typeof Plus>;
  return icons[type];
}

function capabilityFor(route: string) {
  return modelCapabilities.filter((item) => item.route === route);
}

type RouteVisualVariant = "hero" | "card";

function routeVisual(href: string, variant: RouteVisualVariant = "hero") {
  const visuals: Record<string, Record<string, { src: string; alt: string; objectPosition?: string }>> = {
    hero: {
      "/wardrobe-new": {
        src: "/editorial/wardrobe-shirt-rack.jpg",
        alt: "高级衣橱单品陈列",
        objectPosition: "object-[center_45%]",
      },
      "/try-on-new": {
        src: "/editorial/look-white-dress-daylight.jpg",
        alt: "虚拟试衣工作室人像",
        objectPosition: "object-[center_24%]",
      },
      "/recommend-new": {
        src: "/editorial/look-blue-coat-city.jpg",
        alt: "AI 搭配推荐造型大片",
        objectPosition: "object-[center_22%]",
      },
      "/outfit-diary-new": {
        src: "/editorial/recommend-travel-look.jpg",
        alt: "穿搭日记旅行场景照片",
        objectPosition: "object-[center_28%]",
      },
      "/closet-analysis-new": {
        src: "/editorial/analysis-fabric-board.jpg",
        alt: "衣橱分析布料与色彩板",
        objectPosition: "object-[center_50%]",
      },
      "/style-profile-new": {
        src: "/editorial/style-color-board.jpg",
        alt: "风格档案色彩板",
        objectPosition: "object-[center_42%]",
      },
      "/assistant-new": {
        src: "/editorial/assistant-atelier-desk.jpg",
        alt: "AI 造型助手工作台",
        objectPosition: "object-[center_40%]",
      },
    },
    card: {
      "/wardrobe-new": {
        src: "/editorial/wardrobe-tailored-trousers.jpg",
        alt: "高级西裤与衣橱单品细节",
        objectPosition: "object-[center_48%]",
      },
      "/try-on-new": {
        src: "/editorial/tryon-studio-portrait.jpg",
        alt: "虚拟试衣工作室侧身人像",
        objectPosition: "object-[center_20%]",
      },
      "/recommend-new": {
        src: "/editorial/recommend-evening-look.jpg",
        alt: "晚餐聚会搭配推荐造型",
        objectPosition: "object-[center_26%]",
      },
      "/outfit-diary-new": {
        src: "/editorial/diary-cafe-look.jpg",
        alt: "周末咖啡店穿搭日记",
        objectPosition: "object-[center_34%]",
      },
      "/closet-analysis-new": {
        src: "/editorial/texture-silk-cream.jpg",
        alt: "奶油色丝绸纹理分析素材",
        objectPosition: "object-[center_50%]",
      },
      "/style-profile-new": {
        src: "/editorial/wardrobe-silk-detail.jpg",
        alt: "风格档案丝质衣物细节",
        objectPosition: "object-[center_44%]",
      },
      "/assistant-new": {
        src: "/editorial/wardrobe-accessory-detail.jpg",
        alt: "私人造型助手配饰细节",
        objectPosition: "object-[center_46%]",
      },
    },
    map: {
      "/wardrobe-new": {
        src: "/editorial/wardrobe-blazer-blue.jpg",
        alt: "雾蓝西装与衣橱陈列",
        objectPosition: "object-[center_46%]",
      },
      "/try-on-new": {
        src: "/editorial/recommend-travel-look.jpg",
        alt: "旅行场景试衣预览造型",
        objectPosition: "object-[center_28%]",
      },
      "/recommend-new": {
        src: "/editorial/atelier-red-detail.jpg",
        alt: "深红高定细节搭配灵感",
        objectPosition: "object-[center_28%]",
      },
      "/outfit-diary-new": {
        src: "/editorial/wardrobe-evening-dress.jpg",
        alt: "晚间穿搭记录礼服",
        objectPosition: "object-[center_32%]",
      },
      "/closet-analysis-new": {
        src: "/editorial/wardrobe-shoes-minimal.jpg",
        alt: "衣橱分析鞋履利用率",
        objectPosition: "object-[center_52%]",
      },
      "/style-profile-new": {
        src: "/editorial/wardrobe-silk-detail.jpg",
        alt: "风格偏好面料细节",
        objectPosition: "object-[center_44%]",
      },
      "/assistant-new": {
        src: "/editorial/assistant-atelier-desk.jpg",
        alt: "AI 造型助手工作台",
        objectPosition: "object-[center_40%]",
      },
    },
  };

  return visuals[variant][href] ?? visuals[variant]["/wardrobe-new"];
}

const pageHeroContent: Record<
  string,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    brief: string;
    stats: Array<{ value: string; label: string }>;
    primary: { href: string; label: string };
    secondary: { href: string; label: string };
  }
> = {
  "/wardrobe-new": {
    eyebrow: "Wardrobe Index / Buyer Directory",
    title: "衣橱索引室",
    subtitle: "把每件衣服变成可搜索、可推荐、可复穿的风格资产。",
    brief:
      "保留 V3 的搜索、分类、详情弹窗和添加流程，但用更大气的商品画廊表达：图片先建立质感，标签和模型状态再解释它为什么值得被穿。",
    stats: [
      { value: "128", label: "可计算单品" },
      { value: "8", label: "识别维度" },
      { value: "15", label: "复穿提醒" },
    ],
    primary: { href: "#wardrobe-workspace", label: "管理衣橱" },
    secondary: { href: "/recommend-new", label: "生成搭配" },
  },
  "/try-on-new": {
    eyebrow: "Atelier Studio / Virtual Fitting",
    title: "虚拟试衣工作室",
    subtitle: "先看上身比例、场景光线和整体氛围，再决定保存或替换。",
    brief:
      "页面被拆成输入步骤、主结果舞台和历史胶片，模拟真实试衣工作流。人像、衣物、场景和保存动作清楚分区，不再只是一块上传区域。",
    stats: [
      { value: "3s", label: "预览生成" },
      { value: "45", label: "历史试衣" },
      { value: "4", label: "场景背景" },
    ],
    primary: { href: "#tryon-workspace", label: "进入试衣" },
    secondary: { href: "/wardrobe-new", label: "选择衣物" },
  },
  "/recommend-new": {
    eyebrow: "Lookbook Board / AI Stylist",
    title: "搭配推荐看板",
    subtitle: "每套推荐都要解释场景、天气、匹配度和可替换单品。",
    brief:
      "推荐页像造型师的 lookbook board：先用主图建立风格，再用理由、天气、替换单品和反馈按钮把 AI 建议变成可执行决策。",
    stats: [
      { value: "89", label: "候选搭配" },
      { value: "98%", label: "最高匹配" },
      { value: "4", label: "场景筛选" },
    ],
    primary: { href: "#recommend-workspace", label: "查看推荐" },
    secondary: { href: "/try-on-new", label: "去试穿" },
  },
  "/outfit-diary-new": {
    eyebrow: "Style Memory / Feedback Loop",
    title: "穿搭记忆册",
    subtitle: "记录穿了什么，也记录为什么满意、何时复穿。",
    brief:
      "日记页不是简单记录列表，而是推荐系统的反馈闭环。天气、场景、心情、满意度和单品组合会回流到风格档案。",
    stats: [
      { value: "67", label: "穿搭记录" },
      { value: "4.8", label: "平均满意" },
      { value: "18", label: "连续记录" },
    ],
    primary: { href: "#diary-workspace", label: "查看日记" },
    secondary: { href: "/recommend-new", label: "生成相似搭配" },
  },
  "/closet-analysis-new": {
    eyebrow: "Closet Intelligence / Value Review",
    title: "衣橱洞察室",
    subtitle: "看清哪些衣服在创造价值，哪些只是占据空间。",
    brief:
      "分析页减少后台图表感，把利用率、闲置提醒、色彩分布和缺口建议组合成能行动的判断，帮助用户少买重复、多穿合适。",
    stats: [
      { value: "72%", label: "利用率" },
      { value: "¥18k", label: "估算价值" },
      { value: "4", label: "补充建议" },
    ],
    primary: { href: "#analysis-workspace", label: "查看洞察" },
    secondary: { href: "/wardrobe-new", label: "整理衣橱" },
  },
  "/style-profile-new": {
    eyebrow: "Style Profile / Preference Engine",
    title: "风格档案馆",
    subtitle: "把模糊的喜欢，沉淀成 AI 能使用的推荐规则。",
    brief:
      "风格页像一份高级造型问卷：标签、色彩、体型、场景权重和推荐调参分区编辑，让 AI 真正理解用户，而不是只贴标签。",
    stats: [
      { value: "12", label: "风格标签" },
      { value: "5", label: "场景权重" },
      { value: "4", label: "推荐参数" },
    ],
    primary: { href: "#profile-workspace", label: "编辑档案" },
    secondary: { href: "/assistant-new", label: "问造型助手" },
  },
  "/assistant-new": {
    eyebrow: "Private Stylist / LLM Assistant",
    title: "AI 造型顾问台",
    subtitle: "把一句自然语言问题，转成试衣、推荐、日记或分析动作。",
    brief:
      "助手页承接 LLM 能力，但不做普通聊天窗口。它带着天气、衣橱、档案和最近反馈回答问题，并把建议导向具体功能页。",
    stats: [
      { value: "4", label: "快捷问题" },
      { value: "7", label: "可跳转功能" },
      { value: "1", label: "上下文工作台" },
    ],
    primary: { href: "#assistant-workspace", label: "开始提问" },
    secondary: { href: "/dashboard-new", label: "回到今日" },
  },
};

const productWorkflowContent: Record<
  string,
  {
    eyebrow: string;
    title: string;
    summary: string;
    steps: Array<{ step: string; title: string; body: string; href?: string; cta?: string }>;
  }
> = {
  "/wardrobe-new": {
    eyebrow: "Wardrobe Flow",
    title: "从上传到复穿，衣橱管理只保留三件核心事。",
    summary: "页面不把所有功能一次性铺开，而是让用户顺着建档、校准、进入搭配链路完成管理。",
    steps: [
      { step: "01", title: "上传并识别", body: "上传商品图、衣架图或穿搭图，AI 先识别类别、颜色、材质和季节。", href: "#wardrobe-workspace", cta: "开始建档" },
      { step: "02", title: "搜索与校准", body: "用分类、品牌、颜色和标签快速定位单品，必要时打开详情弹窗修正档案。" },
      { step: "03", title: "进入推荐链路", body: "从单品直接进入搭配推荐或试衣，让衣橱不是库存，而是可复穿资产。", href: "/recommend-new", cta: "查看搭配" },
    ],
  },
  "/try-on-new": {
    eyebrow: "Try-On Flow",
    title: "试衣页像一个轻量工作室，而不是单个上传框。",
    summary: "输入、人像、单品、场景和结果被分开处理，用户每一步都知道当前在做什么。",
    steps: [
      { step: "01", title: "准备输入", body: "上传人像，选择衣橱单品，确认场景背景和光线条件。", href: "#tryon-workspace", cta: "进入工作台" },
      { step: "02", title: "生成预览", body: "虚拟试衣模型把人像、单品和场景组合成大幅结果舞台。" },
      { step: "03", title: "保存反馈", body: "满意的结果可以保存到日记，作为之后推荐和风格档案的反馈。", href: "/outfit-diary-new", cta: "保存到日记" },
    ],
  },
  "/recommend-new": {
    eyebrow: "Recommendation Flow",
    title: "推荐不是给答案，而是给可解释的造型选择。",
    summary: "每套推荐都保留场景、天气、匹配理由、替换单品和反馈动作，避免空泛的 AI 推荐。",
    steps: [
      { step: "01", title: "选择场景", body: "在通勤、周末、聚会等场景间切换，先限定本次穿搭目标。", href: "#recommend-workspace", cta: "查看推荐" },
      { step: "02", title: "理解理由", body: "查看匹配度、天气和推荐理由，知道为什么这套适合今天。" },
      { step: "03", title: "试穿或反馈", body: "满意就去试穿，不喜欢就反馈，偏好会回到档案和助手上下文。", href: "/try-on-new", cta: "去试穿" },
    ],
  },
  "/outfit-diary-new": {
    eyebrow: "Diary Flow",
    title: "日记页负责把审美反馈沉淀下来。",
    summary: "照片、天气、场景、心情、满意度和复穿动作共同构成推荐系统的记忆层。",
    steps: [
      { step: "01", title: "记录穿搭", body: "保存当天穿搭图片和单品列表，补充天气、场景和心情。", href: "#diary-workspace", cta: "查看记录" },
      { step: "02", title: "标记满意度", body: "用分数和文字反馈告诉系统哪些组合值得复用。" },
      { step: "03", title: "生成相似搭配", body: "从高满意度记录出发，生成相似但不重复的下一套方案。", href: "/recommend-new", cta: "生成推荐" },
    ],
  },
  "/closet-analysis-new": {
    eyebrow: "Analysis Flow",
    title: "分析页只回答一个问题：衣橱下一步该怎么动。",
    summary: "数据被压缩成利用率、闲置、色彩和缺口建议，减少后台图表感，保留可执行判断。",
    steps: [
      { step: "01", title: "看健康分数", body: "先看利用率、闲置件数和估算价值，判断衣橱整体状态。", href: "#analysis-workspace", cta: "查看洞察" },
      { step: "02", title: "定位结构问题", body: "用分类比例、色彩分布和季节覆盖找到真正缺口。" },
      { step: "03", title: "回到行动", body: "把闲置提醒送回衣橱，把缺口送到推荐和助手。", href: "/wardrobe-new", cta: "整理衣橱" },
    ],
  },
  "/style-profile-new": {
    eyebrow: "Profile Flow",
    title: "风格档案是推荐系统的审美中枢。",
    summary: "用户不是填写表单，而是在维护 AI 的个人上下文：偏好、禁忌、场景权重和推荐参数。",
    steps: [
      { step: "01", title: "确认风格标签", body: "把通勤优雅、低饱和、舒适优先等偏好量化成权重。", href: "#profile-workspace", cta: "编辑档案" },
      { step: "02", title: "校准身体与场景", body: "维护体型信息、材质禁忌和不同生活场景的穿搭权重。" },
      { step: "03", title: "影响推荐", body: "档案会直接影响推荐、助手回复和试衣场景选择。", href: "/assistant-new", cta: "问助手" },
    ],
  },
  "/assistant-new": {
    eyebrow: "Assistant Flow",
    title: "助手页把自然语言转成具体功能动作。",
    summary: "它不只是聊天窗口，而是带着天气、衣橱、档案和日记反馈进行造型决策。",
    steps: [
      { step: "01", title: "提出场景问题", body: "例如开会、约会、旅行、复盘本周穿搭，让助手先理解目标。", href: "#assistant-workspace", cta: "开始提问" },
      { step: "02", title: "读取上下文", body: "助手结合天气、衣橱摘要、风格档案和近期反馈生成建议。" },
      { step: "03", title: "跳到对应页面", body: "每条建议都能继续去推荐、试穿、日记、分析或档案页完成。", href: "/dashboard-new", cta: "回到总控" },
    ],
  },
};

export function ProductPageHero({ route }: { route: string }) {
  const content = pageHeroContent[route];
  const routeMeta = productRoutes.find((item) => item.href === route);
  const visual = routeVisual(route, "hero");
  const Icon = routeIcon(route);
  const caps = capabilityFor(route).slice(0, 3);

  if (!content || !routeMeta) return null;

  return (
    <CouturePanel className="couture-page-hero p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="relative flex min-h-[480px] flex-col justify-between px-5 py-7 md:px-9 md:py-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--couture-ink)] text-[var(--couture-bg)] shadow-[var(--couture-shadow-soft)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-[rgba(184,140,74,0.22)] bg-[rgba(255,247,232,0.75)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">
                {content.eyebrow}
              </span>
            </div>
            <h1 className="mt-8 max-w-3xl text-balance text-[clamp(34px,4.2vw,56px)] font-semibold leading-[1.05] tracking-normal text-[var(--couture-ink)]">
              {content.title}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--couture-ink)] md:text-xl">
              {content.subtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--couture-muted)]">{content.brief}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {content.stats.map((stat) => (
                <div key={stat.label} className="rounded-[26px] border border-[var(--couture-line)] bg-white/50 px-5 py-4">
                  <div className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">{stat.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--couture-soft)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={content.primary.href} className="couture-solid-button">
              {content.primary.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={content.secondary.href} className="couture-line-button">
              {content.secondary.label}
            </Link>
          </div>
        </div>

        <div className="couture-page-hero-frame">
          <EditorialImage
            src={visual.src}
            alt={visual.alt}
            priority
            className="h-full min-h-[440px] rounded-[36px] md:min-h-[560px]"
            imageClassName={visual.objectPosition ?? ""}
            fallbackLabel={routeMeta.label}
            sizes="(min-width: 1280px) 48vw, 100vw"
          />
          <div className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/76 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-muted)] backdrop-blur-xl">
            {routeMeta.eyebrow}
          </div>
          <div className="absolute bottom-5 left-5 right-5 rounded-[28px] border border-white/70 bg-[rgba(255,252,247,0.78)] p-4 shadow-[0_18px_56px_rgba(35,25,32,0.14)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">
                  Model Layer
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--couture-muted)]">
                  {caps.length ? caps.map((cap) => cap.model).join(" / ") : "workflow / mock data"}
                </p>
              </div>
              <span className="rounded-full bg-[var(--couture-ink)] px-4 py-2 text-xs font-semibold text-[var(--couture-bg)]">
                {routeMeta.stat}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CouturePanel>
  );
}

export function ProductWorkflowRibbon({ route }: { route: string }) {
  const content = productWorkflowContent[route];
  const routeMeta = productRoutes.find((item) => item.href === route);
  const caps = capabilityFor(route).slice(0, 3);

  if (!content || !routeMeta) return null;

  return (
    <CouturePanel className="couture-workflow-ribbon p-5 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.38fr_1fr] lg:items-stretch">
        <div className="flex flex-col justify-between rounded-[30px] border border-[var(--couture-line)] bg-white/48 p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">
              {content.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-[1.12] tracking-normal text-[var(--couture-ink)] md:text-3xl">
              {content.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--couture-muted)]">{content.summary}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {caps.length ? (
              caps.map((capability) => (
                <span
                  key={capability.id}
                  className="rounded-full border border-[var(--couture-line)] bg-white/62 px-3 py-1 text-xs font-semibold text-[var(--couture-muted)]"
                >
                  {capability.model}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-[var(--couture-line)] bg-white/62 px-3 py-1 text-xs font-semibold text-[var(--couture-muted)]">
                V2 workflow
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {content.steps.map((item) => (
            <div key={item.step} className="couture-workflow-step">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--couture-gold)]">
                  {item.step}
                </span>
                <span className="h-px flex-1 bg-[var(--couture-line)]" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{item.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-[var(--couture-muted)]">{item.body}</p>
              {item.href && item.cta ? (
                <Link href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="mt-5 inline-flex text-sm font-semibold text-[var(--couture-soft)]">自动衔接</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </CouturePanel>
  );
}

export function DashboardJourneyRail() {
  const stages = [
    {
      label: "今日决策",
      title: "先看今天最该穿什么",
      body: "天气、衣橱状态、近期反馈共同决定今日造型建议。",
      href: "/recommend-new",
      route: "/recommend-new",
    },
    {
      label: "进入工作室",
      title: "再进入独立功能页执行",
      body: "试衣、衣橱、日记、分析和助手各自成页，避免首页拥挤。",
      href: "/try-on-new",
      route: "/try-on-new",
    },
    {
      label: "反馈回流",
      title: "最后把选择写回系统",
      body: "保存日记、更新档案、生成洞察，让下一次推荐更准确。",
      href: "/outfit-diary-new",
      route: "/outfit-diary-new",
    },
  ];

  return (
    <section className="couture-dashboard-journey">
      <div className="grid gap-5 lg:grid-cols-[0.36fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--couture-gold)]">
            Product Rhythm
          </p>
          <h2 className="mt-4 text-2xl font-semibold leading-[1.12] tracking-normal text-[var(--couture-ink)] md:text-3xl">
            首页只负责把一天的造型流程排清楚。
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--couture-muted)]">
            这里不是完整功能堆叠，而是从今日建议进入对应工作室，再把反馈回流到档案和推荐。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {stages.map((stage, index) => {
            const Icon = routeIcon(stage.route);
            return (
              <Link key={stage.label} href={stage.href} className="couture-journey-card group">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--couture-ink)] text-[var(--couture-bg)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-soft)]">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--couture-gold)]">
                  {stage.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{stage.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--couture-muted)]">{stage.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                  进入
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function DashboardEditorialHeader() {
  const recommendation = outfitRecommendations[0];
  const primaryRoutes = productRoutes.filter((route) => route.href !== "/dashboard-new").slice(0, 4);

  return (
    <section className="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[var(--couture-gold)]">
          Product Home / Morning Brief
        </p>
        <h1 className="mt-5 max-w-4xl text-balance text-[clamp(34px,4.4vw,58px)] font-semibold leading-[1.05] tracking-normal text-[var(--couture-ink)]">
          今日造型工作台
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-[var(--couture-muted)]">
          这里是新版主线的功能首页，只做总览、导航和今日决策。完整衣橱管理、虚拟试衣、搭配推荐、日记、分析、档案和助手都进入独立页面。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {primaryRoutes.map((route) => {
            const Icon = routeIcon(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--couture-line)] bg-white/54 px-4 py-2 text-sm font-semibold text-[var(--couture-muted)] transition hover:bg-white hover:text-[var(--couture-ink)]"
              >
                <Icon className="h-4 w-4 text-[var(--couture-red)]" />
                {route.label}
              </Link>
            );
          })}
        </div>
      </div>

      <CouturePanel className="p-5">
        <div className="rounded-[30px] bg-[var(--couture-ink)] p-5 text-[var(--couture-bg)]">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(251,246,238,0.64)]">
              <CalendarDays className="h-4 w-4" />
              May 09
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[rgba(251,246,238,0.78)]">
              早间简报
            </span>
          </div>
          <h2 className="mt-8 text-2xl font-semibold leading-[1.08] tracking-normal">
            {recommendation.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[rgba(251,246,238,0.68)]">
            {recommendation.reason}
          </p>
          <div className="mt-7 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: CloudSun, value: "24°C", label: "天气" },
              { icon: Gauge, value: `${recommendation.matchScore}%`, label: "匹配" },
              { icon: Palette, value: "低压迫", label: "风格" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[22px] bg-white/10 px-3 py-3">
                  <Icon className="mx-auto h-4 w-4 text-[rgba(251,246,238,0.78)]" />
                  <div className="mt-2 text-sm font-semibold">{item.value}</div>
                  <div className="mt-1 text-[11px] text-[rgba(251,246,238,0.52)]">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CouturePanel>
    </section>
  );
}

export function DashboardHeroSpread() {
  const recommendation = outfitRecommendations[0];
  const dashboardHero = {
    src: "/editorial/look-white-dress-daylight.jpg",
    alt: "明亮日光下的高级白裙造型",
  };
  const supportingItems = wardrobeItems.slice(0, 4);
  const primaryRoutes = productRoutes.filter((route) => route.href !== "/dashboard-new").slice(0, 4);

  return (
    <CouturePanel className="couture-dashboard-hero-panel p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.12fr]">
        <div className="couture-dashboard-hero-copy relative order-last flex flex-col justify-between px-5 py-7 md:min-h-[560px] md:px-9 md:py-10 xl:order-first xl:min-h-[620px]">
          <div className="couture-cover-mark hidden xl:block" aria-hidden="true">
            <span>ISSUE</span>
            <strong>05.09</strong>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--couture-line)] bg-white/62 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">
                Product Home / Morning Brief
              </span>
              <MatchPill value={recommendation.matchScore} />
            </div>
            <h1 className="mt-8 text-balance text-[clamp(34px,4.4vw,60px)] font-semibold leading-[1.05] tracking-normal text-[var(--couture-ink)]">
              今日造型工作台
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--couture-muted)]">
            今天推荐「{recommendation.title}」。系统结合天气、衣橱状态和近期反馈，把可执行穿搭放在最前面，完整操作进入独立功能页完成。
            </p>

            <div className="couture-editor-note mt-7">
              <span>Stylist Note</span>
              <p>{recommendation.confidenceNote}</p>
            </div>

            <div className="mt-7 grid gap-3 rounded-[30px] border border-[var(--couture-line)] bg-white/46 p-4 sm:grid-cols-3">
              <BriefCell label="Scene" value={recommendation.occasion} />
              <BriefCell label="Focus" value="利落 / 柔光 / 低压迫" />
              <BriefCell label="Next" value="试穿后保存反馈" />
            </div>

            <div className="mt-7 grid gap-3 sm:hidden">
              <Link href="/try-on-new" className="couture-solid-button w-full">
                <Sparkles className="h-5 w-5" />
                虚拟试穿
              </Link>
              <Link href="/recommend-new" className="couture-line-button w-full">
                查看推荐理由
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-10 hidden sm:block">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/try-on-new" className="couture-solid-button">
                <Sparkles className="h-5 w-5" />
                虚拟试穿
              </Link>
              <Link href="/recommend-new" className="couture-line-button">
                查看推荐理由
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-4">
              {primaryRoutes.map((route) => {
                const Icon = routeIcon(route.href);
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="group rounded-full border border-[var(--couture-line)] bg-white/46 px-4 py-3 transition hover:bg-white hover:shadow-[var(--couture-shadow-soft)]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Icon className="h-4 w-4 text-[var(--couture-red)]" />
                      <span className="text-sm font-semibold text-[var(--couture-ink)]">{route.shortLabel}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="couture-dashboard-hero-visual relative order-first min-h-[360px] overflow-hidden rounded-[34px] bg-[var(--couture-paper-warm)] md:min-h-[560px] md:rounded-[38px] xl:order-last xl:min-h-[620px]">
          <EditorialImage
            src={dashboardHero.src}
            alt={dashboardHero.alt}
            priority
            className="h-full min-h-[360px] rounded-[34px] md:min-h-[560px] md:rounded-[38px] xl:min-h-[620px]"
            imageClassName="object-[center_22%]"
            fallbackLabel={recommendation.title}
          />
          <div className="absolute left-5 top-5 max-w-[calc(100%-2.5rem)] rounded-full border border-white/70 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-muted)] backdrop-blur-xl sm:left-6 sm:top-6">
            Editorial Pick
          </div>
          <div className="absolute left-5 top-20 rounded-full bg-[var(--couture-ink)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--couture-shadow-soft)] sm:left-auto sm:right-6 sm:top-6">
            {recommendation.weather}
          </div>
          <div className="couture-hero-reason-card hidden sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
              AI Styling Reason
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--couture-muted)]">{recommendation.reason}</p>
          </div>
          <div className="absolute bottom-5 left-5 right-5 rounded-[26px] border border-white/70 bg-[rgba(255,252,247,0.78)] p-4 shadow-[0_18px_56px_rgba(35,25,32,0.14)] backdrop-blur-xl sm:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">Today Look</p>
            <p className="mt-2 text-lg font-semibold tracking-normal text-[var(--couture-ink)]">
              {recommendation.title}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--couture-muted)]">
              <span>{recommendation.weather}</span>
              <span>{recommendation.matchScore}% 匹配</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 hidden gap-3 sm:grid sm:grid-cols-4">
            {supportingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-white/70 bg-[rgba(255,252,247,0.78)] p-3 shadow-[0_18px_56px_rgba(35,25,32,0.14)] backdrop-blur-xl"
              >
                <EditorialImage
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  className="aspect-[4/3] rounded-[18px]"
                  fallbackLabel={item.name}
                  sizes="160px"
                />
                <p className="mt-3 truncate text-xs font-semibold text-[var(--couture-ink)]">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CouturePanel>
  );
}

export function NextActionBoard() {
  const actions = [
    {
      href: "/try-on-new",
      step: "01",
      title: "先试穿今日套装",
      body: "把推荐搭配放进试衣工作室，确认上身比例和场景光线。",
      stat: "3 秒预览",
      image: "/editorial/diary-office-look.jpg",
      alt: "虚拟试衣工作室人像预览",
      imageClassName: "object-[center_20%]",
    },
    {
      href: "/wardrobe-new",
      step: "02",
      title: "补全衣橱标签",
      body: "优先处理最近新增单品，让推荐系统读懂材质、季节和场景。",
      stat: "128 件单品",
      image: "/editorial/wardrobe-shoes-minimal.jpg",
      alt: "西裤与衣橱单品细节",
      imageClassName: "object-[center_48%]",
    },
    {
      href: "/assistant-new",
      step: "03",
      title: "问私人造型助手",
      body: "把会议、约会、旅行等具体场景交给助手，生成可执行建议。",
      stat: "4 个快捷问题",
      image: "/editorial/analysis-fabric-board.jpg",
      alt: "香槟色丝绸质感工作台背景",
      imageClassName: "object-[center_50%]",
    },
  ];

  return (
    <section className="couture-action-board">
      <div className="grid gap-7 lg:grid-cols-[0.42fr_1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
            Next Best Actions
          </p>
          <h2 className="mt-4 text-balance text-[clamp(28px,3vw,42px)] font-semibold leading-[1.06] tracking-normal text-[var(--couture-ink)]">
            今天只需要完成三件事。
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-[var(--couture-muted)]">
            Dashboard 不展开完整功能，只把最值得点击的下一步放在这里，保证首页有决策感，也不破坏呼吸感。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = routeIcon(action.href);
            return (
              <Link key={action.href} href={action.href} className="couture-action-card group">
                <EditorialImage
                  src={action.image}
                  alt={action.alt}
                  className="aspect-[5/4] rounded-[26px]"
                  imageClassName={action.imageClassName}
                  fallbackLabel={action.title}
                  sizes="(min-width: 1024px) 22vw, 100vw"
                />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
                      {action.step} / {action.stat}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">
                      {action.title}
                    </h3>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--couture-ink)] text-[var(--couture-bg)] shadow-[var(--couture-shadow-soft)]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--couture-muted)]">{action.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                  进入页面
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BriefCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--couture-soft)]">
        {label}
      </span>
      <span className="mt-2 block text-sm font-semibold leading-5 text-[var(--couture-ink)]">{value}</span>
    </div>
  );
}

export function TodayOutfitPanel() {
  const recommendation = outfitRecommendations[0];
  const supportingItems = wardrobeItems.slice(0, 3);

  return (
    <CouturePanel className="p-4 md:p-5">
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="flex min-h-[500px] flex-col justify-between px-5 py-8 pb-24 md:min-h-[540px] md:px-9 md:py-10 xl:min-h-[560px] xl:pb-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--couture-line)] bg-white/62 px-4 py-2 text-sm text-[var(--couture-muted)]">
                <SunMedium className="h-4 w-4 text-[var(--couture-gold)]" />
                {recommendation.weather}
              </span>
              <MatchPill value={recommendation.matchScore} />
            </div>
            <div className="mt-8 grid gap-3 rounded-[28px] border border-[var(--couture-line)] bg-white/42 p-4 text-sm text-[var(--couture-muted)] sm:grid-cols-3">
              <div>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-[var(--couture-soft)]">Scene</span>
                <span className="mt-1 block font-semibold text-[var(--couture-ink)]">{recommendation.occasion}</span>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-[var(--couture-soft)]">Focus</span>
                <span className="mt-1 block font-semibold text-[var(--couture-ink)]">利落 / 柔光 / 低压迫</span>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-[0.22em] text-[var(--couture-soft)]">Next</span>
                <span className="mt-1 block font-semibold text-[var(--couture-ink)]">试穿后保存反馈</span>
              </div>
            </div>
            <p className="mt-12 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
              Today Look
            </p>
            <h2 className="mt-5 max-w-xl text-balance text-[32px] font-semibold leading-[1.06] tracking-normal text-[var(--couture-ink)] md:text-4xl md:leading-[1.04]">
              {recommendation.title}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--couture-muted)] md:text-[17px]">{recommendation.reason}</p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--couture-soft)]">
              {recommendation.confidenceNote}
            </p>
          </div>

          <div className="mt-10">
            <PremiumTagGroup>
              {recommendation.items.slice(0, 4).map((item, index) => (
                <PremiumTag key={item} color={index % 2 === 0 ? "orange" : "purple"}>
                  {item}
                </PremiumTag>
              ))}
            </PremiumTagGroup>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PremiumButton
                size="lg"
                icon={<Sparkles className="h-5 w-5" />}
                onClick={() => {
                  window.location.href = "/try-on-new";
                }}
              >
                虚拟试穿这套
              </PremiumButton>
              <Link href="/outfit-diary-new" className="couture-line-button">
                保存到日记
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-[38px] bg-[var(--couture-paper-warm)]">
          <EditorialImage
            src={recommendation.heroImageUrl}
            alt={recommendation.imageAlt}
            priority
            className="h-full min-h-[560px] rounded-[38px]"
            imageClassName="object-[center_16%]"
            fallbackLabel={recommendation.title}
          />
          <div className="absolute left-6 top-6 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-muted)] backdrop-blur-xl">
            Editorial Pick
          </div>
          <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
            {supportingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[26px] border border-white/70 bg-[rgba(255,252,247,0.78)] p-3 shadow-[0_18px_56px_rgba(35,25,32,0.14)] backdrop-blur-xl"
              >
                <EditorialImage
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  className="aspect-[4/3] rounded-[20px]"
                  fallbackLabel={item.name}
                  sizes="160px"
                />
                <p className="mt-3 truncate text-sm font-semibold text-[var(--couture-ink)]">{item.name}</p>
                <p className="mt-1 text-xs text-[var(--couture-muted)]">{item.lastWorn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CouturePanel>
  );
}

export function DashboardStats() {
  const stats = [
    { value: "6 套", label: "今日可穿推荐", note: "已按天气和场景筛过" },
    { value: "98%", label: "最高匹配度", note: "来自近期反馈权重" },
    { value: "45 次", label: "累计试衣", note: "可继续复用历史结果" },
    { value: "15 件", label: "闲置提醒", note: "等待重新进入搭配" },
  ];

  return (
    <section className="couture-runway-strip">
      <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
        <div className="border-b border-[var(--couture-line)] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <div className="inline-flex rounded-full border border-[rgba(184,140,74,0.2)] bg-[rgba(255,247,232,0.7)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--couture-gold)]">
            Runway Status
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-normal text-[var(--couture-ink)] md:text-3xl">
            今日造型信号
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-[var(--couture-muted)]">
            只保留会影响今天决策的指标，让首页保持轻盈，把完整操作留给独立功能页。
          </p>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="couture-runway-metric"
            >
              <div className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)] md:text-3xl">
                {item.value}
              </div>
              <div className="mt-3 text-sm font-semibold text-[var(--couture-ink)]">{item.label}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--couture-soft)]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuickActionGrid() {
  const routes = productRoutes.filter((route) => route.href !== "/dashboard-new");
  const workflow = [
    { href: "/wardrobe-new", step: "01", title: "建档衣橱", body: "上传、识别、分类，建立可计算的单品库。" },
    { href: "/try-on-new", step: "02", title: "虚拟试衣", body: "把今日候选搭配放进试衣工作室预览。" },
    { href: "/recommend-new", step: "03", title: "生成推荐", body: "结合天气、场景、偏好输出可解释搭配。" },
    { href: "/outfit-diary-new", step: "04", title: "反馈进化", body: "保存穿搭反馈，反哺分析、档案和助手。" },
  ];

  return (
    <CouturePanel className="p-4 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
        <div className="flex min-h-[300px] flex-col justify-between rounded-[32px] border border-[var(--couture-line)] bg-[rgba(255,252,247,0.58)] p-6 md:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
              Atelier Index
            </p>
            <h2 className="mt-5 max-w-xl text-[clamp(28px,3vw,40px)] font-semibold leading-[1.08] tracking-normal text-[var(--couture-ink)]">
              七个独立工作室，
              <br />
              从今日决策进入完整流程。
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--couture-muted)]">
              今日页只做总览和决策。衣橱、试衣、推荐、日记、分析、档案与助手都进入各自页面，保留呼吸感，也让每个模型能力有清楚边界。
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["7", "独立功能"],
              ["0", "页面挤压"],
              ["AI", "贯穿流程"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[24px] bg-white/62 px-4 py-4">
                <div className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">{value}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--couture-soft)]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden rounded-[32px]">
          <div className="absolute inset-0">
            <EditorialImage
              src="/editorial/landing-couture-runway.jpg"
              alt="丝绸纹理与香槟色高定质感"
              className="h-full rounded-[32px]"
              fallbackLabel="Atelier Index"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,20,28,0.72),rgba(24,20,28,0.28)_54%,rgba(255,252,247,0.16))]" />
          <div className="relative z-10 flex min-h-[300px] flex-col justify-start p-5 md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgba(251,246,238,0.62)]">
              Couture Flow
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {workflow.map((item) => {
                const Icon = routeIcon(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-[24px] border border-white/14 bg-white/10 p-4 text-[var(--couture-bg)] backdrop-blur-xl transition hover:bg-white/16"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[rgba(251,246,238,0.52)]">
                        {item.step}
                      </span>
                      <Icon className="h-4 w-4 text-[rgba(251,246,238,0.76)]" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold tracking-normal">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[rgba(251,246,238,0.66)]">{item.body}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="couture-command-grid mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {routes.map((route, index) => {
          const Icon = routeIcon(route.href);
          const visual = routeVisual(route.href, "card");
          return (
            <Link key={route.href} href={route.href} className="couture-command-tile group">
              <EditorialImage
                src={visual.src}
                alt={visual.alt}
                className="aspect-[4/3] rounded-[26px]"
                imageClassName={visual.objectPosition ?? ""}
                fallbackLabel={route.label}
                sizes="(min-width: 1280px) 26vw, (min-width: 640px) 44vw, 100vw"
              />
              <div className="mt-5 flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--couture-paper)] text-[var(--couture-red)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--couture-soft)]">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
                {route.eyebrow}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">
                {route.label}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--couture-muted)]">{route.description}</p>
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--couture-line)] pt-5">
                <span className="text-sm font-semibold text-[var(--couture-gold)]">{route.stat}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                  打开{route.label}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </CouturePanel>
  );
}

export function RecentActivityFeed() {
  const [leadActivity, ...restActivities] = recentActivities;
  const LeadIcon = activityIcon(leadActivity.type);

  return (
    <CouturePanel className="p-5 md:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">Style Ledger</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">最近造型记录</h2>
        </div>
        <span className="rounded-full border border-[var(--couture-line)] bg-white/62 px-4 py-2 text-sm text-[var(--couture-muted)]">
          实时同步
        </span>
      </div>

      <div className="rounded-[30px] bg-[var(--couture-ink)] p-5 text-[var(--couture-bg)]">
        <div className="flex items-start justify-between gap-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10">
            <LeadIcon className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[rgba(251,246,238,0.66)]">
            {leadActivity.time}
          </span>
        </div>
        <h3 className="mt-6 text-2xl font-semibold tracking-normal">{leadActivity.title}</h3>
        <p className="mt-3 text-sm leading-7 text-[rgba(251,246,238,0.68)]">{leadActivity.item}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {restActivities.map((activity) => {
          const Icon = activityIcon(activity.type);
          return (
            <div
              key={activity.id}
              className="flex items-center gap-4 rounded-[24px] border border-[var(--couture-line)] bg-white/50 px-4 py-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--couture-paper)] text-[var(--couture-violet)] shadow-[var(--couture-shadow-soft)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-[var(--couture-ink)]">{activity.title}</p>
                  <span className="whitespace-nowrap text-xs text-[var(--couture-soft)]">{activity.time}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--couture-muted)]">{activity.item}</p>
              </div>
            </div>
          );
        })}
      </div>
    </CouturePanel>
  );
}

export function ModelStatusSummary() {
  const readyCount = modelCapabilities.filter((capability) => capability.status === "ready").length;
  const trainingCount = modelCapabilities.filter((capability) => capability.status === "training").length;
  const mockCount = modelCapabilities.filter((capability) => capability.status === "mock").length;
  const featuredCapabilities = modelCapabilities;
  const modelGroups = [
    {
      label: "试衣生成",
      models: "OOTDiffusion / TripoSR",
      note: "人像建模、衣物贴合、姿态与场景合成。",
    },
    {
      label: "识别理解",
      models: "CLIP / Qwen-VL",
      note: "识别类别、颜色、材质、风格语义与搭配线索。",
    },
    {
      label: "图片处理",
      models: "BiRefNet / RealESRGAN / ControlNet",
      note: "抠图、超分、商品光线与背景生成。",
    },
    {
      label: "推荐记忆",
      models: "Qwen / LLM / feedback-memory",
      note: "生成理由、吸收反馈，并更新风格权重。",
    },
  ] as const;

  return (
    <CouturePanel className="p-5 md:p-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">AI Atelier Layer</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">模型能力中枢</h2>
        </div>
        <Link href="/assistant-new" className="couture-text-link">
          去助手页
        </Link>
      </div>

      <div className="grid gap-5">
        <div className="rounded-[30px] border border-[var(--couture-line)] bg-white/52 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            {modelGroups.map((group) => (
              <div
                key={group.label}
                className="rounded-[24px] border border-[var(--couture-line)] bg-[rgba(255,252,247,0.72)] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--couture-gold)]">
                    {group.label}
                  </span>
                  <span className="text-xs font-semibold text-[var(--couture-violet)]">{group.models}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--couture-muted)]">{group.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[0.42fr_0.58fr]">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                [readyCount, "Ready"],
                [trainingCount, "Training"],
                [mockCount, "Mock"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[20px] bg-[var(--couture-paper)] px-3 py-4">
                  <div className="text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--couture-soft)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-[24px] border border-[var(--couture-line)] bg-[rgba(255,252,247,0.72)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--couture-gold)]">
                Pipeline
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--couture-muted)]">
                输入图片 → 识别补全 → 试衣生成 → 推荐解释 → 日记反馈 → 风格权重更新。
              </p>
            </div>
          </div>
        </div>

        <div className="couture-model-capability-grid grid gap-3 md:grid-cols-2">
          {featuredCapabilities.map((capability) => (
            <ModelCapabilityBadge key={capability.id} capability={capability} />
          ))}
        </div>
        <details className="couture-mobile-summary-details">
          <summary>展开全部模型能力</summary>
          <div className="mt-3 grid gap-3">
            {featuredCapabilities.map((capability) => (
              <ModelCapabilityBadge key={capability.id} capability={capability} />
            ))}
          </div>
        </details>
      </div>
    </CouturePanel>
  );
}

export function WardrobeGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WardrobeItem["category"] | "all">("all");
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(wardrobeItems.map((item) => item.category)))] as Array<
      WardrobeItem["category"] | "all"
    >,
    []
  );
  const filteredItems = wardrobeItems.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const text = `${item.name} ${item.brand} ${item.color} ${item.tags.join(" ")}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });

  return (
    <div className="grid gap-8">
      <CouturePanel className="p-6 md:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--couture-soft)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索衣物、品牌、颜色、标签"
              className="min-h-14 w-full rounded-full border border-[var(--couture-line)] bg-white/68 pl-14 pr-5 text-[var(--couture-ink)] outline-none transition placeholder:text-[var(--couture-soft)] focus:border-[var(--couture-red)] focus:bg-white"
            />
          </label>
          <PremiumButton icon={<Plus className="h-5 w-5" />} onClick={() => setShowAdd(true)}>
            上传新衣物
          </PremiumButton>
        </div>
        <div className="couture-category-strip mt-6 flex flex-wrap gap-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                category === item
                  ? "border-[var(--couture-red)] bg-[rgba(143,31,50,0.08)] text-[var(--couture-red)]"
                  : "border-[var(--couture-line)] bg-white/54 text-[var(--couture-muted)] hover:bg-white"
              }`}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      </CouturePanel>

      {filteredItems.length ? (
        <div className="couture-gallery-grid grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className={`group text-left ${index === 0 ? "xl:col-span-2" : ""}`}
            >
              <CouturePanel className="h-full p-4">
                <EditorialImage
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  className={`${index === 0 ? "aspect-[16/9]" : "aspect-[4/5]"} rounded-[30px]`}
                  fallbackLabel={item.name}
                />
                <div className="p-2 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold tracking-normal text-[var(--couture-ink)]">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--couture-muted)]">
                        {item.brand} / {item.color} / {item.season}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(255,248,235,0.82)] px-3 py-1 text-xs font-semibold text-[var(--couture-gold)]">
                      {item.usageCount} 次
                    </span>
                  </div>
                  <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--couture-muted)]">{item.fitNote}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--couture-line)] bg-white/56 px-3 py-1 text-xs text-[var(--couture-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </CouturePanel>
            </button>
          ))}
        </div>
      ) : (
        <CouturePanel className="p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-[var(--couture-violet)]" />
          <h3 className="mt-4 text-2xl font-semibold text-[var(--couture-ink)]">没有找到匹配衣物</h3>
          <p className="mt-3 text-[var(--couture-muted)]">换一个关键词，或直接上传新单品让 AI 建档。</p>
        </CouturePanel>
      )}

      <CapabilityStrip route="/wardrobe-new" />
      {selectedItem ? <ItemDialog item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
      {showAdd ? <AddItemDialog onClose={() => setShowAdd(false)} /> : null}
    </div>
  );
}

function DialogShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#2a1830]/24 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[36px] border border-white/80 bg-[var(--couture-paper)] p-6 shadow-[var(--couture-shadow-deep)] md:p-8">
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭弹窗"
          className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-[var(--couture-line)] bg-white/80 text-[var(--couture-muted)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: WardrobeItem; onClose: () => void }) {
  return (
    <DialogShell onClose={onClose}>
      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <EditorialImage
          src={item.imageUrl}
          alt={item.imageAlt}
          className="aspect-[4/5] rounded-[30px]"
          fallbackLabel={item.name}
        />
        <div className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">
            {categoryLabels[item.category]}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--couture-ink)]">{item.name}</h2>
          <p className="mt-3 text-[var(--couture-muted)]">
            {item.brand} / {item.color} / {item.season} / {item.material}
          </p>
          <p className="mt-5 leading-8 text-[var(--couture-muted)]">{item.fitNote}</p>
          <div className="mt-6 grid grid-cols-2 gap-5">
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
            <Link href="/recommend-new" className="couture-line-button">
              查看搭配
            </Link>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

function AddItemDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell onClose={onClose}>
      <h2 className="text-3xl font-semibold tracking-normal text-[var(--couture-ink)]">上传新衣物</h2>
      <p className="mt-3 max-w-xl text-[var(--couture-muted)]">
        AI 会自动识别类别、颜色、季节和可搭配场景，先生成一个可编辑的衣物档案。
      </p>
      <div className="mt-8 grid gap-5">
        <div className="grid min-h-44 place-items-center rounded-[30px] border border-dashed border-[var(--couture-red)] bg-[rgba(143,31,50,0.05)] text-center">
          <div>
            <Upload className="mx-auto h-8 w-8 text-[var(--couture-red)]" />
            <p className="mt-3 font-semibold text-[var(--couture-ink)]">拖入图片或点击上传</p>
            <p className="mt-1 text-sm text-[var(--couture-muted)]">支持人台图、平铺图、商品图</p>
          </div>
        </div>
        <input
          className="min-h-14 rounded-full border border-[var(--couture-line)] bg-white/80 px-5 outline-none focus:border-[var(--couture-red)]"
          placeholder="衣物名称，例如：奶油白真丝衬衫"
        />
        <PremiumButton onClick={onClose}>保存并自动打标</PremiumButton>
      </div>
    </DialogShell>
  );
}

export function TryOnStudioPanel() {
  const look = outfitRecommendations[2];

  return (
    <div className="couture-tryon-studio grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
      <CouturePanel className="p-7 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">Atelier Studio</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--couture-ink)]">试衣工作室</h2>
        <div className="mt-8 grid gap-4">
          {[
            { title: "上传人像照片", body: "建议正面站姿、光线均匀，系统会保留身体比例。", icon: Camera },
            { title: "选择衣橱单品", body: "从衣橱选择，也可以上传商品图做快速预览。", icon: Shirt },
            { title: "切换场景背景", body: "通勤、晚餐、旅行等场景可快速切换。", icon: Layers3 },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-[28px] border border-[var(--couture-line)] bg-white/54 p-5">
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--couture-paper)] text-[var(--couture-violet)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--couture-gold)]">Step {index + 1}</p>
                    <h3 className="mt-1 font-semibold text-[var(--couture-ink)]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--couture-muted)]">{step.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <PremiumButton fullWidth icon={<Wand2 className="h-5 w-5" />}>
            生成试衣结果
          </PremiumButton>
        </div>
      </CouturePanel>

      <CouturePanel className="p-4">
        <div className="grid gap-0 md:grid-cols-[1fr_260px]">
          <EditorialImage
            src="/editorial/tryon-studio-portrait.jpg"
            alt="虚拟试衣工作室人物造型"
            className="min-h-[580px] rounded-[32px]"
            imageClassName="object-[center_14%]"
            fallbackLabel={look.title}
          />
          <div className="flex flex-col justify-between p-6">
            <div>
              <p className="text-sm text-[var(--couture-muted)]">平均 3 秒生成</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">{look.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--couture-muted)]">{look.reason}</p>
            </div>
            <div className="mt-8 grid gap-3">
              {["城市通勤", "晚餐约会", "海边日落", "极简影棚"].map((scene) => (
                <button
                  key={scene}
                  type="button"
                  className="rounded-full border border-[var(--couture-line)] bg-white/56 px-4 py-2 text-left text-sm text-[var(--couture-muted)] hover:bg-white"
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CouturePanel>
      <Filmstrip />
      <CapabilityStrip route="/try-on-new" />
    </div>
  );
}

function Filmstrip() {
  return (
    <CouturePanel className="p-5 xl:col-span-2">
      <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-normal text-[var(--couture-ink)]">历史试衣</h3>
        <Link href="/outfit-diary-new" className="couture-text-link">
          保存到日记
        </Link>
      </div>
      <div className="couture-fit-grid grid gap-4 sm:grid-cols-3">
        {outfitRecommendations.map((item) => (
          <div key={item.id} className="rounded-[26px] bg-white/44 p-3">
            <EditorialImage
              src={item.heroImageUrl}
              alt={item.imageAlt}
              className="aspect-[4/3] rounded-[22px]"
              fallbackLabel={item.title}
            />
            <p className="mt-3 text-sm font-semibold text-[var(--couture-ink)]">{item.title}</p>
          </div>
        ))}
      </div>
    </CouturePanel>
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
      <div className="couture-category-strip flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-full border px-5 py-2.5 text-sm font-semibold ${
              active === tab
                ? "border-[var(--couture-red)] bg-[rgba(143,31,50,0.08)] text-[var(--couture-red)]"
                : "border-[var(--couture-line)] bg-white/54 text-[var(--couture-muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="couture-recommendation-grid grid gap-7 lg:grid-cols-2">
        {visible.map((item) => (
          <RecommendationCard key={item.id} recommendation={item} />
        ))}
      </div>
      <PreferenceWeights />
      <CapabilityStrip route="/recommend-new" />
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: OutfitRecommendation }) {
  return (
    <CouturePanel as="article" className="p-4">
      <EditorialImage
        src={recommendation.heroImageUrl}
        alt={recommendation.imageAlt}
        className="aspect-[16/11] rounded-[30px]"
        imageClassName="object-[center_16%]"
        fallbackLabel={recommendation.title}
      />
      <div className="p-4 pt-7 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--couture-muted)]">{recommendation.occasion}</span>
          <MatchPill value={recommendation.matchScore} />
        </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">
          {recommendation.title}
        </h3>
        <p className="couture-desktop-copy mt-4 leading-8 text-[var(--couture-muted)]">{recommendation.reason}</p>
        <p className="couture-desktop-copy mt-3 text-sm leading-6 text-[var(--couture-soft)]">{recommendation.confidenceNote}</p>
        <details className="couture-mobile-summary-details mt-4">
          <summary>查看匹配理由</summary>
          <p className="mt-3 leading-7 text-[var(--couture-muted)]">{recommendation.reason}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--couture-soft)]">{recommendation.confidenceNote}</p>
        </details>
        <div className="mt-6 flex flex-wrap gap-2">
          {recommendation.items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--couture-line)] bg-white/56 px-3 py-1 text-xs text-[var(--couture-muted)]"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <PremiumButton size="sm">试穿</PremiumButton>
          <Link href="/wardrobe-new" className="couture-line-button !min-h-10 !px-4 !py-2 !text-sm">
            替换单品
          </Link>
          <Link href="/outfit-diary-new" className="couture-line-button !min-h-10 !px-4 !py-2 !text-sm">
            加入日记
          </Link>
        </div>
      </div>
    </CouturePanel>
  );
}

function PreferenceWeights() {
  return (
    <CouturePanel className="p-7 md:p-8">
      <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">推荐偏好权重</h2>
      <div className="mt-7 grid gap-6 md:grid-cols-4">
        {styleProfile.recommendationWeights.map((item) => (
          <div key={item.name}>
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-[var(--couture-muted)]">{item.name}</span>
              <span className="text-[var(--couture-ink)]">{item.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#eadfd2]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--couture-gold),var(--couture-red))]" style={{ width: `${item.value}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--couture-soft)]">{item.note}</p>
          </div>
        ))}
      </div>
    </CouturePanel>
  );
}

export function DiaryTimeline() {
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="grid gap-7">
        {diaryEntries.map((entry) => (
          <CouturePanel key={entry.date} className="p-4">
            <div className="grid gap-0 md:grid-cols-[300px_1fr]">
              <EditorialImage
                src={entry.imageUrl}
                alt={entry.imageAlt}
                className="aspect-[4/5] rounded-[30px] md:aspect-auto"
                fallbackLabel={entry.title}
              />
              <div className="p-4 md:p-8">
                <p className="text-sm text-[var(--couture-muted)]">
                  {entry.date} / {entry.weather} / {entry.scene}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">
                  {entry.title}
                </h3>
                <p className="mt-4 text-[var(--couture-muted)]">
                  心情：{entry.mood} / 单品：{entry.items.join("、")}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--couture-soft)]">{entry.feedback}</p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <span className="text-3xl font-semibold text-[var(--couture-red)]">{entry.rating}</span>
                  <span className="text-sm text-[var(--couture-muted)]">满意度</span>
                  <PremiumButton size="sm" variant="ghost">
                    复穿
                  </PremiumButton>
                </div>
              </div>
            </div>
          </CouturePanel>
        ))}
      </div>
      <CouturePanel className="p-7 md:p-8">
        <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">本月复盘</h2>
        <div className="mt-7 grid gap-6">
          <Metric value="18 天" label="连续记录" />
          <Metric value="4.8" label="平均满意度" />
          <Metric value="5 个" label="高频场景" />
        </div>
        <div className="mt-8">
          <PremiumButton fullWidth>记录今日穿搭</PremiumButton>
        </div>
      </CouturePanel>
      <CapabilityStrip route="/outfit-diary-new" className="xl:col-span-2" />
    </div>
  );
}

export function ClosetInsightDashboard() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-5 md:grid-cols-4">
        <CouturePanel className="p-6">
          <Metric value="72%" label="衣橱利用率" />
        </CouturePanel>
        <CouturePanel className="p-6">
          <Metric value="¥18k" label="估算价值" />
        </CouturePanel>
        <CouturePanel className="p-6">
          <Metric value="15 件" label="闲置单品" />
        </CouturePanel>
        <CouturePanel className="p-6">
          <Metric value="4 条" label="补充建议" />
        </CouturePanel>
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <CouturePanel className="p-7 md:p-8">
          <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">分类比例</h2>
          <div className="mt-8 grid gap-6">
            {closetInsights.map((item) => (
              <div key={item.label}>
                <div className="mb-3 flex justify-between text-sm">
                  <span className="text-[var(--couture-ink)]">{item.label}</span>
                  <span className="text-[var(--couture-muted)]">{item.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-[#eadfd2]">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </CouturePanel>
        <CouturePanel className="p-7 md:p-8">
          <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">AI 洞察</h2>
          <div className="couture-analysis-insight-list mt-7 grid gap-4">
            {[
              "轻薄外套偏少，早晚温差场景缺少过渡层。",
              "低饱和色系占比高，可以补一件更有焦点的配饰。",
              "灰色羊绒开衫已闲置 34 天，建议加入周末搭配。",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[26px] bg-white/52 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--couture-red)]" />
                <p className="leading-7 text-[var(--couture-muted)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <PremiumButton fullWidth>生成完整分析报告</PremiumButton>
          </div>
        </CouturePanel>
      </div>
      <EditorialImage
        src="/editorial/texture-silk-cream.jpg"
        alt="布料与色彩分析板"
        className="aspect-[16/6] rounded-[38px]"
        fallbackLabel="衣橱分析素材"
      />
      <CapabilityStrip route="/closet-analysis-new" />
    </div>
  );
}

export function StyleProfileEditor() {
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
      <CouturePanel className="p-7 md:p-8">
        <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">风格标签</h2>
        <div className="mt-8 grid gap-6">
          {styleProfile.tags.map((tag) => (
            <ProgressRow key={tag.name} label={tag.name} value={tag.score} />
          ))}
        </div>
      </CouturePanel>
      <CouturePanel className="p-7 md:p-8">
        <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">色彩偏好</h2>
        <div className="mt-8 grid gap-5">
          {styleProfile.colorPreferences.map((color) => (
            <div key={color.name} className="flex items-center gap-4">
              <span
                className="h-12 w-12 rounded-2xl border border-[var(--couture-line)]"
                style={{ background: color.color }}
              />
              <div className="flex-1">
                <ProgressRow label={color.name} value={color.percent} compact />
              </div>
            </div>
          ))}
        </div>
      </CouturePanel>
      <CouturePanel className="p-7 md:p-8 xl:col-span-2">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <EditorialImage
            src="/editorial/wardrobe-silk-detail.jpg"
            alt="风格档案色彩板"
            className="min-h-[360px] rounded-[32px]"
            fallbackLabel="风格档案"
          />
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-[var(--couture-ink)]">体型与场景规则</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-[30px] bg-white/52 p-6">
                <h3 className="font-semibold text-[var(--couture-ink)]">体型信息</h3>
                <ul className="mt-5 grid gap-3 text-sm text-[var(--couture-muted)]">
                  {styleProfile.bodyNotes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[30px] bg-white/52 p-6">
                <h3 className="font-semibold text-[var(--couture-ink)]">场景偏好</h3>
                <div className="mt-5 grid gap-4">
                  {styleProfile.scenarioPreferences.map((item) => (
                    <div key={item.scenario} className="text-sm">
                      <ProgressRow label={item.scenario} value={item.weight} compact />
                      <p className="mt-2 text-xs text-[var(--couture-soft)]">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PremiumButton>更新风格档案</PremiumButton>
              <Link href="/recommend-new" className="couture-line-button">
                查看推荐权重
              </Link>
            </div>
          </div>
        </div>
      </CouturePanel>
      <CapabilityStrip route="/style-profile-new" className="xl:col-span-2" />
    </div>
  );
}

function ProgressRow({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  return (
    <div>
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-[var(--couture-ink)]">{label}</span>
        <span className="text-[var(--couture-red)]">{value}%</span>
      </div>
      <div className={`${compact ? "h-2" : "h-3"} rounded-full bg-[#eadfd2]`}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--couture-gold),var(--couture-red))]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function AssistantWorkspace() {
  const [activePrompt, setActivePrompt] = useState(assistantPrompts[0]);
  const rec = outfitRecommendations[0];

  return (
    <div className="couture-assistant-workspace grid gap-8 xl:grid-cols-[1fr_380px]">
      <CouturePanel className="p-5 md:p-7">
        <div className="grid gap-5">
          <div className="rounded-[30px] bg-white/58 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">
              Private Stylist
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--couture-ink)]">
              对话式造型顾问
            </h2>
            <p className="mt-4 max-w-2xl leading-8 text-[var(--couture-muted)]">
              助手会读取天气、衣橱、风格档案和最近反馈，把自然语言问题转成可执行的搭配、试衣或日记动作。
            </p>
          </div>
          <div className="grid gap-4">
            <ChatBubble role="user">{activePrompt}</ChatBubble>
            <ChatBubble role="assistant">
              今天建议使用「{rec.title}」。这套保留会议需要的利落度，同时用雾蓝降低压迫感。你可以先去试衣页预览上身效果，再把结果保存到日记作为反馈。
            </ChatBubble>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/try-on-new" className="couture-solid-button">
              去试穿
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/recommend-new" className="couture-line-button">
              查看推荐
            </Link>
            <Link href="/outfit-diary-new" className="couture-line-button">
              保存到日记
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {assistantPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setActivePrompt(prompt)}
                className={`rounded-[24px] border p-4 text-left text-sm leading-6 transition ${
                  activePrompt === prompt
                    ? "border-[var(--couture-red)] bg-[rgba(143,31,50,0.06)] text-[var(--couture-ink)]"
                    : "border-[var(--couture-line)] bg-white/52 text-[var(--couture-muted)] hover:bg-white"
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </CouturePanel>
      <div className="couture-assistant-context grid gap-6">
        <EditorialImage
          src="/editorial/wardrobe-accessory-detail.jpg"
          alt="私人造型顾问工作台"
          className="aspect-[4/5] rounded-[38px]"
          fallbackLabel="AI 助手"
        />
        <CouturePanel className="p-6">
          <h3 className="text-xl font-semibold tracking-normal text-[var(--couture-ink)]">当前上下文</h3>
          <div className="mt-5 grid gap-3 text-sm text-[var(--couture-muted)]">
            <ContextRow label="天气" value="24°C 晴，早晚微凉" />
            <ContextRow label="衣橱" value="128 件单品，15 件闲置提醒" />
            <ContextRow label="风格" value="通勤优雅 / 低饱和 / 舒适优先" />
            <ContextRow label="反馈" value="近 7 天平均满意度 4.8" />
          </div>
        </CouturePanel>
      </div>
      <CapabilityStrip route="/assistant-new" className="xl:col-span-2" />
    </div>
  );
}

function ChatBubble({ children, role }: { children: ReactNode; role: "user" | "assistant" }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[28px] px-5 py-4 text-sm leading-7 ${
          role === "user"
            ? "bg-[var(--couture-ink)] text-[var(--couture-bg)]"
            : "border border-[var(--couture-line)] bg-white/62 text-[var(--couture-muted)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--couture-line)] pb-3 last:border-0 last:pb-0">
      <span className="text-[var(--couture-soft)]">{label}</span>
      <span className="text-right text-[var(--couture-ink)]">{value}</span>
    </div>
  );
}

function CapabilityStrip({ route, className = "" }: { route: string; className?: string }) {
  const caps = capabilityFor(route);
  if (!caps.length) return null;

  return (
    <CouturePanel className={`p-5 ${className}`}>
      <div className="flex flex-wrap gap-3">
        {caps.map((capability) => (
          <ModelCapabilityBadge key={capability.id} capability={capability} />
        ))}
      </div>
    </CouturePanel>
  );
}

export function LandingProductPreview() {
  return (
    <div className="mx-auto mt-16 max-w-6xl">
      <CouturePanel className="p-4">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">
              Product Preview
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-[var(--couture-ink)]">
              今日造型工作台
            </h2>
            <p className="mt-5 leading-8 text-[var(--couture-muted)]">
              Dashboard 只做总览和导航：今日建议、AI 理由、功能入口和最近活动。完整操作全部进入独立功能页完成。
            </p>
            <div className="mt-7 grid grid-cols-3 gap-5 border-y border-[var(--couture-line)] py-5">
              <Metric value="128" label="衣橱" />
              <Metric value="98%" label="匹配" />
              <Metric value="7" label="功能" />
            </div>
          </div>
          <EditorialImage
            src="/editorial/look-blue-coat-city.jpg"
            alt="AI Wardrobe 今日造型城市预览"
            className="min-h-[420px] rounded-[34px]"
            imageClassName="object-[center_22%]"
            fallbackLabel="今日造型"
          />
        </div>
      </CouturePanel>
    </div>
  );
}

export function FeatureWorkflowMock({
  type,
}: {
  type: "wardrobe" | "tryon" | "recommend" | "diary" | "analysis" | "profile" | "assistant";
}) {
  const map = {
    wardrobe: {
      title: "衣橱建档",
      body: "搜索、筛选、详情弹窗和上传入口都在同一个买手店目录里。",
      stat: "128 件单品",
      image: "/editorial/wardrobe-tailored-trousers.jpg",
      alt: "西裤与衣橱单品细节",
      href: "/wardrobe-new",
    },
    tryon: {
      title: "虚拟试衣",
      body: "上传人像和衣物后预览上身效果，并切换场景背景。",
      stat: "3 秒生成",
      image: "/editorial/look-white-dress-daylight.jpg",
      alt: "日光试衣预览造型",
      href: "/try-on-new",
    },
    recommend: {
      title: "搭配推荐",
      body: "每套推荐都有匹配理由、可替换单品和一键试穿。",
      stat: "98% 匹配",
      image: "/editorial/recommend-travel-look.jpg",
      alt: "旅行场景搭配推荐",
      href: "/recommend-new",
    },
    analysis: {
      title: "衣橱分析",
      body: "把分类比例、闲置提醒、色彩偏好和缺口建议转化为行动。",
      stat: "15 件提醒",
      image: "/editorial/texture-silk-cream.jpg",
      alt: "丝绸纹理与衣橱分析素材",
      href: "/closet-analysis-new",
    },
    diary: {
      title: "穿搭日记",
      body: "照片、天气、心情、满意度和复穿按钮一起沉淀为推荐反馈。",
      stat: "67 条记录",
      image: "/editorial/diary-cafe-look.jpg",
      alt: "咖啡店穿搭日记记录",
      href: "/outfit-diary-new",
    },
    profile: {
      title: "风格档案",
      body: "维护风格标签、色彩偏好、体型信息和场景权重。",
      stat: "12 个标签",
      image: "/editorial/wardrobe-silk-detail.jpg",
      alt: "风格偏好面料细节",
      href: "/style-profile-new",
    },
    assistant: {
      title: "AI 造型助手",
      body: "把自然语言问题转成推荐、试衣、日记和分析动作。",
      stat: "4 个问题",
      image: "/editorial/wardrobe-accessory-detail.jpg",
      alt: "私人造型助手配饰细节",
      href: "/assistant-new",
    },
  }[type];
  const Icon = routeIcon(map.href);

  return (
    <CouturePanel className="p-4">
      <EditorialImage
        src={map.image}
        alt={map.alt}
        loading="eager"
        className="aspect-[4/3] rounded-[30px]"
        fallbackLabel={map.title}
      />
      <div className="p-4 pt-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--couture-paper)] text-[var(--couture-violet)]">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--couture-muted)]">{map.stat}</p>
            <h3 className="text-2xl font-semibold text-[var(--couture-ink)]">{map.title}</h3>
          </div>
        </div>
        <p className="mt-5 leading-8 text-[var(--couture-muted)]">{map.body}</p>
        <Link href={map.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
          进入页面
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </CouturePanel>
  );
}

const productExperienceGroups = [
  {
    title: "衣橱与试衣",
    eyebrow: "Build & Try",
    description: "从上传单品到一键试穿，先把衣物变成可计算资产，再进入试衣工作室判断上身效果。",
    routeHrefs: ["/wardrobe-new", "/try-on-new"],
    models: "BiRefNet / OOTDiffusion",
  },
  {
    title: "搭配与记忆",
    eyebrow: "Style Decision",
    description: "推荐页负责生成可执行搭配，日记页负责保存反馈，让系统逐步理解你的真实偏好。",
    routeHrefs: ["/recommend-new", "/outfit-diary-new"],
    models: "Qwen / feedback-memory",
  },
  {
    title: "分析与档案",
    eyebrow: "Style Intelligence",
    description: "复盘利用率、色彩、闲置单品和场景权重，帮助推荐系统少猜一点、懂你更多一点。",
    routeHrefs: ["/closet-analysis-new", "/style-profile-new"],
    models: "wardrobe-stats / preference-engine",
  },
  {
    title: "私人造型助手",
    eyebrow: "Conversation",
    description: "把自然语言问题连接到衣橱、试衣、推荐、日记和分析，不是单纯聊天，而是导向下一步操作。",
    routeHrefs: ["/assistant-new"],
    models: "assistant service / LLM",
  },
] as const;

export function ProductRouteIntro() {
  return (
    <div className="couture-route-map grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {productExperienceGroups.map((group, index) => {
        const primaryRoute = productRoutes.find((route) => route.href === group.routeHrefs[0]);
        const Icon = routeIcon(group.routeHrefs[0]);
        if (!primaryRoute) return null;

        return (
          <div key={group.title} className="couture-route-card">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-[var(--couture-line)] bg-[linear-gradient(145deg,rgba(255,252,247,0.92),rgba(241,228,210,0.72))] p-5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(184,140,74,0.15)] blur-2xl" />
              <div className="absolute bottom-0 left-0 h-px w-full bg-[linear-gradient(90deg,transparent,var(--couture-gold),transparent)]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--couture-gold)]">
                    {group.eyebrow}
                  </span>
                  <span className="text-xs font-semibold text-[var(--couture-soft)]">0{index + 1}</span>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--couture-ink)] text-[var(--couture-bg)] shadow-[var(--couture-shadow-soft)]">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--couture-ink)] text-[var(--couture-bg)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-[rgba(184,140,74,0.22)] bg-[rgba(255,247,232,0.75)] px-3 py-1 text-xs font-semibold text-[var(--couture-gold)]">
                {group.routeHrefs.length} 个入口
              </span>
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
              {group.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{group.title}</h3>
            <p className="mt-3 min-h-24 text-sm leading-7 text-[var(--couture-muted)]">{group.description}</p>
            <div className="mt-5 grid gap-2">
              {group.routeHrefs.map((href) => {
                const route = productRoutes.find((item) => item.href === href);
                if (!route) return null;
                return (
                  <Link key={href} href={href} className="couture-route-mini-link">
                    <span>{route.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--couture-line)] pt-4">
              <span className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[var(--couture-soft)]">
                {group.models}
              </span>
              <span className="text-sm font-semibold text-[var(--couture-red)]">UX Flow</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
