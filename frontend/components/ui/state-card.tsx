"use client";

import { LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";

import { StoryCluster } from "@/components/ui/story-cluster";

type StateVariant = "loading" | "empty" | "error";

interface StateCardProps {
  variant: StateVariant;
  title: string;
  description: string;
}

const variantMap = {
  loading: {
    icon: LoaderCircle,
    badge: "正在准备中",
    iconClass: "animate-spin",
    emoji: "云",
    tone: "sky" as const,
    chips: ["稍等一下", "正在预热", "马上就好"],
  },
  empty: {
    icon: Sparkles,
    badge: "留一块柔软的空白",
    iconClass: "",
    emoji: "空",
    tone: "peach" as const,
    chips: ["随时开始", "等你填满", "先轻轻放下"],
  },
  error: {
    icon: TriangleAlert,
    badge: "出现了一个小波动",
    iconClass: "",
    emoji: "错",
    tone: "lilac" as const,
    chips: ["可以重试", "内容没丢", "先稳住"],
  },
} satisfies Record<
  StateVariant,
  { icon: React.ComponentType<{ className?: string }>; badge: string; iconClass: string; emoji: string; tone: "sky" | "peach" | "lilac"; chips: string[] }
>;

export function StateCard({ variant, title, description }: StateCardProps) {
  const config = variantMap[variant];
  const Icon = config.icon;

  return (
    <section className="section-card playful-empty rounded-[30px] p-6 text-center">
      <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-[22px] bg-white/92 shadow-[var(--shadow-soft)]">
        <Icon className={`size-7 text-[var(--accent)] ${config.iconClass}`.trim()} />
      </div>
      <div className="mb-2 flex justify-center">
        <StoryCluster emoji={config.emoji} tone={config.tone} chips={config.chips} title={config.badge} compact />
      </div>
      <div className="pill mb-4">{config.badge}</div>
      <h3 className="text-xl font-semibold text-[var(--ink-strong)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">{description}</p>
    </section>
  );
}
