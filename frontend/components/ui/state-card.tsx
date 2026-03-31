"use client";

import { LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";

type StateVariant = "loading" | "empty" | "error";

interface StateCardProps {
  variant: StateVariant;
  title: string;
  description: string;
}

const variantMap = {
  loading: {
    icon: LoaderCircle,
    badge: "Getting things ready",
    iconClass: "animate-spin"
  },
  empty: {
    icon: Sparkles,
    badge: "A soft blank canvas",
    iconClass: ""
  },
  error: {
    icon: TriangleAlert,
    badge: "A tiny hiccup",
    iconClass: ""
  }
} satisfies Record<StateVariant, { icon: React.ComponentType<{ className?: string }>; badge: string; iconClass: string }>;

export function StateCard({ variant, title, description }: StateCardProps) {
  const config = variantMap[variant];
  const Icon = config.icon;

  return (
    <section className="section-card playful-empty rounded-[30px] p-6 text-center">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-[22px] bg-white/92 shadow-[var(--shadow-soft)]">
        <Icon className={`size-7 text-[var(--accent)] ${config.iconClass}`.trim()} />
      </div>
      <div className="pill mb-4">{config.badge}</div>
      <h3 className="text-xl font-semibold text-[var(--ink-strong)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">{description}</p>
    </section>
  );
}
