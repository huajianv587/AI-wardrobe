"use client";

import Link from "next/link";
import { MetricsBar } from "./MetricsBar";
import { PageShell } from "./PageShell";
import { SectionHeading } from "./SectionHeading";
import { VersionBadge } from "./VersionBadge";
import { FeatureWorkflowMock, LandingProductPreview } from "./ProductModules";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    badge: "衣橱建档",
    title: "先把衣服变成可搜索资产",
    description:
      "保留 V3 衣橱页的搜索、分类筛选、单品详情和上传入口，但放进新版明亮、柔和、产品化的工作台里。",
    href: "/wardrobe-new",
    type: "wardrobe" as const,
    direction: "right",
  },
  {
    badge: "今日穿搭",
    title: "每天打开就是一套可执行方案",
    description:
      "Dashboard 不再只是展示卡片，而是呈现天气、匹配度、推荐理由、快捷入口和最近活动，像 V3 一样有真实工作流。",
    href: "/dashboard-new",
    type: "recommend" as const,
    direction: "left",
  },
  {
    badge: "虚拟试衣",
    title: "穿上它，再决定买不买",
    description:
      "上传人像和衣物后预览上身效果，切换场景背景，并把试衣结果保存到日记或推荐反馈。",
    href: "/try-on-new",
    type: "tryon" as const,
    direction: "right",
  },
  {
    badge: "衣橱复盘",
    title: "少买重复单品，多穿真正适合的衣服",
    description:
      "把分类比例、闲置提醒、色彩偏好和缺口建议转化成行动，而不是只给一组漂亮数字。",
    href: "/closet-analysis-new",
    type: "analysis" as const,
    direction: "left",
  },
  {
    badge: "风格档案",
    title: "让 AI 记住你的偏好和禁忌",
    description:
      "维护风格标签、色彩偏好、体型信息和场景权重，让搭配推荐越来越像私人造型顾问。",
    href: "/style-profile-new",
    type: "profile" as const,
    direction: "right",
  },
];

const testimonials = [
  {
    name: "小美",
    role: "产品经理",
    quote:
      "我最需要的是每天直接能穿的方案，而不是一堆灵感图。新版工作台把天气、会议和衣橱状态都算进去了。",
  },
  {
    name: "Luna",
    role: "时尚买手",
    quote:
      "衣橱页有搜索、筛选和详情后才像真正的产品。新版保留了 V3 的功能密度，但视觉更轻、更亮。",
  },
  {
    name: "安安",
    role: "研究生",
    quote:
      "试衣、推荐、日记、风格档案串起来后，系统知道我为什么喜欢某套搭配，而不是随机给几张图。",
  },
];

function RevealFeature({ feature }: { feature: (typeof features)[number] }) {
  const ref = useScrollReveal();
  const media = <FeatureWorkflowMock type={feature.type} />;
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
        href={feature.href}
        className="mt-8 inline-flex text-sm font-semibold text-[#8d60e8] hover:text-[var(--text-primary)]"
      >
        打开功能 →
      </Link>
    </div>
  );

  return (
    <section
      ref={ref}
      id={feature === features[0] ? "features" : undefined}
      className="reveal-on-scroll mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:px-8"
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
            <VersionBadge tone="new">NEW · 明亮 V2 + V3 功能密度</VersionBadge>
          </div>
          <h1 className="mx-auto max-w-5xl text-balance text-[clamp(52px,7vw,88px)] font-semibold leading-[0.95] tracking-[-0.055em] text-[var(--text-primary)]">
            你的 AI 私人造型顾问
            <span className="block bg-[image:var(--gradient-brand-text)] bg-clip-text text-transparent">
              让每件衣服
            </span>
            <span className="block">都物尽其用</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-pretty text-lg leading-8 text-[var(--text-secondary)] md:text-xl">
            上传衣橱、AI 搭配推荐、虚拟试穿、穿搭复盘，把每天“不知道穿什么”变成一个可执行的产品工作流。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PremiumButton size="lg" onClick={() => { window.location.href = "/dashboard-new"; }}>
              免费开始
            </PremiumButton>
            <Link
              href="/wardrobe-new"
              className="rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-white/72 px-10 py-4 text-lg font-semibold text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              查看产品工作台 →
            </Link>
          </div>
          <p className="mt-7 text-sm text-[var(--text-muted)]">
            已有 10,000+ 用户重新爱上穿搭 · App Store 4.9 星
          </p>
          <LandingProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8">
        <MetricsBar />
      </section>

      {features.map((feature) => (
        <RevealFeature key={feature.title} feature={feature} />
      ))}

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <SectionHeading
          align="center"
          eyebrow="用户反馈"
          title="不是更漂亮的空壳，而是每天能用的衣橱系统"
          description="新版主线保留 V3 的功能密度，同时把视觉切成更明亮、柔和、接近真实消费级产品的界面。"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="rounded-[var(--radius-xl)] border border-white/80 bg-white/76 p-7 shadow-[var(--shadow-card)] backdrop-blur-2xl"
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
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-white/80 bg-white/78 p-10 text-center shadow-[var(--shadow-glow)] backdrop-blur-2xl md:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(200,168,255,0.25),transparent_70%)]" />
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
