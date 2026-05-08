"use client";

import Link from "next/link";
import { MetricsBar } from "./MetricsBar";
import { PageShell } from "./PageShell";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";
import { VersionBadge } from "./VersionBadge";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    badge: "核心功能",
    title: "穿上它，再决定买不买",
    description: "上传照片，AI 实时虚拟试穿任意服装，3 秒出结果，告别退货烦恼。",
    direction: "right",
    variant: "tryon" as const,
    items: [
      { label: "上传照片", value: "1 张", tone: "from-[#c8a8ff] to-[#3139fb]" },
      { label: "生成速度", value: "3 秒", tone: "from-[#f0a0c0] to-[#c8a8ff]" },
      { label: "试穿记录", value: "45 套", tone: "from-[#e8c87a] to-[#f0a0c0]" },
    ],
  },
  {
    badge: "智能推荐",
    title: "你的衣橱，比你更懂你",
    description: "DeepSeek AI 分析穿衣偏好，每日生成专属搭配，越用越懂你。",
    direction: "left",
    variant: "dashboard" as const,
    items: [
      { label: "偏好学习", value: "持续优化", tone: "from-[#3139fb] to-[#c8a8ff]" },
      { label: "搭配满意度", value: "98%", tone: "from-[#c8a8ff] to-[#f0a0c0]" },
      { label: "每日建议", value: "6 套", tone: "from-[#e8c87a] to-[#3139fb]" },
    ],
  },
  {
    badge: "衣橱管理",
    title: "把乱成一锅粥的衣橱，变成精品店",
    description: "拍照上传，AI 自动分类打标，随时查找任意单品。",
    direction: "right",
    variant: "wardrobe" as const,
    items: [
      { label: "单品入库", value: "128 件", tone: "from-[#f0a0c0] to-[#3139fb]" },
      { label: "自动标签", value: "24 类", tone: "from-[#c8a8ff] to-[#e8c87a]" },
      { label: "闲置提醒", value: "15 件", tone: "from-[#3139fb] to-[#c8a8ff]" },
    ],
  },
  {
    badge: "场景换背景",
    title: "随时随地，都是你的专属秀场",
    description: "AI 智能抠图，一键切换任意场景背景，分享朋友圈即刻高级。",
    direction: "left",
    variant: "analysis" as const,
    items: [
      { label: "背景模板", value: "50+", tone: "from-[#e8c87a] to-[#f0a0c0]" },
      { label: "智能抠图", value: "BiRefNet", tone: "from-[#3139fb] to-[#c8a8ff]" },
      { label: "分享海报", value: "一键生成", tone: "from-[#c8a8ff] to-[#f0a0c0]" },
    ],
  },
];

const testimonials = [
  {
    name: "小美",
    role: "产品经理",
    quote: "每天早上不用再纠结穿什么，AI 推荐会把天气、会议和我的衣橱一起考虑进去。",
  },
  {
    name: "Luna",
    role: "时尚买手",
    quote: "虚拟试衣和衣橱管理连在一起后，买衣服前会更冷静，也更容易发现已有单品的价值。",
  },
  {
    name: "安安",
    role: "研究生",
    quote: "最喜欢风格档案，系统能解释为什么这套适合我，不只是随机给几张搭配图。",
  },
];

function RevealFeature({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const ref = useScrollReveal();
  const media = (
    <ProductCard
      title={feature.title}
      subtitle={feature.badge}
      badge={`Feature 0${index + 1}`}
      variant={feature.variant}
      items={feature.items}
    />
  );
  const text = (
    <div className="max-w-xl">
      <VersionBadge>{feature.badge}</VersionBadge>
      <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)] md:text-5xl">
        {feature.title}
      </h2>
      <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
        {feature.description}
      </p>
      <Link
        href="/dashboard-new"
        className="mt-8 inline-flex text-sm font-semibold text-[var(--brand-purple)] hover:text-[var(--text-primary)]"
      >
        了解更多 →
      </Link>
    </div>
  );

  return (
    <section
      ref={ref}
      id={index === 0 ? "features" : undefined}
      className="reveal-on-scroll mx-auto grid min-h-[80vh] max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-8"
    >
      {feature.direction === "left" ? (
        <>
          {media}
          {text}
        </>
      ) : (
        <>
          {text}
          {media}
        </>
      )}
    </section>
  );
}

export function LandingExperience() {
  return (
    <PageShell>
      <section className="relative flex min-h-screen items-center px-6 pb-24 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-7xl text-center">
          <div className="mb-7 flex justify-center">
            <VersionBadge tone="new">NEW AI 虚拟试衣 · 重新定义穿衣体验</VersionBadge>
          </div>
          <h1 className="mx-auto max-w-5xl text-balance text-[clamp(52px,7vw,88px)] font-semibold leading-[0.95] tracking-[-0.055em] text-[var(--text-primary)]">
            你的 AI 私人造型顾问
            <span className="block bg-[var(--gradient-brand-text)] bg-clip-text text-transparent">
              让每件衣服
            </span>
            <span className="block">都物尽其用</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-pretty text-lg leading-8 text-[var(--text-secondary)] md:text-xl">
            上传衣橱，AI 搭配推荐，虚拟试穿，告别每天不知道穿什么的烦恼。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PremiumButton size="lg" onClick={() => { window.location.href = "/dashboard-new"; }}>
              免费开始
            </PremiumButton>
            <Link
              href="/ui-demo"
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] px-10 py-4 text-lg font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:bg-[var(--bg-glass-hover)]"
            >
              查看演示 →
            </Link>
          </div>
          <p className="mt-7 text-sm text-[var(--text-muted)]">
            已有 10,000+ 用户重新爱上穿搭 · App Store 4.9 ★
          </p>
          <ProductCard
            className="mx-auto mt-16 max-w-6xl"
            title="今日穿搭工作台"
            subtitle="AI personal styling cockpit"
            badge="AI Wardrobe"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8">
        <MetricsBar />
      </section>

      {features.map((feature, index) => (
        <RevealFeature key={feature.title} feature={feature} index={index} />
      ))}

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <SectionHeading
          align="center"
          eyebrow="用户反馈"
          title="穿搭选择，从每天的消耗变成灵感"
          description="真实用户最看重的是少纠结、少浪费，以及更清楚自己适合什么。"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-7 shadow-[var(--shadow-card)] backdrop-blur-2xl"
            >
              <p className="text-lg leading-8 text-[var(--text-primary)]">“{item.quote}”</p>
              <div className="mt-8">
                <div className="font-semibold text-[var(--text-primary)]">{item.name}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{item.role}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="px-6 py-24 md:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-[var(--border-brand)] bg-[var(--bg-glass)] p-10 text-center shadow-[var(--shadow-glow)] backdrop-blur-2xl md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(49,57,251,0.24),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
              重新爱上每天的穿搭选择
            </h2>
            <p className="mt-5 text-lg text-[var(--text-secondary)]">免费开始，无需信用卡</p>
            <div className="mt-9">
              <PremiumButton
                size="lg"
                className="px-14 py-5 text-xl"
                onClick={() => { window.location.href = "/register"; }}
              >
                立即开始
              </PremiumButton>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
