"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { GlowButton } from "@/components/shared/GlowButton";
import { FEATURE_PLACEHOLDERS } from "@/lib/mockData";

export function FeatureSection() {
  const router = useRouter();
  const featureRoutes: Record<string, string> = {
    "try-on-ai": "/try-on",
    "daily-planner": "/outfit-diary",
    "style-radar": "/style-profile",
    "multi-sync": "/wardrobe"
  };

  return (
    <section
      className="feature-surface relative flex min-h-[100svh] items-start overflow-hidden px-4 py-24 md:h-screen md:items-center md:px-8 md:py-16"
      aria-label="产品功能入口"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(var(--accent-gold-rgb),0.18),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(var(--accent-rose-rgb),0.14),transparent_24%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1360px] gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="feature-panel feature-panel--hero"
        >
          <span className="feature-eyebrow">PRODUCT FLOW</span>
          <h2 className="mt-6 font-[var(--font-cormorant)] text-[clamp(3rem,6vw,5rem)] leading-[0.9] tracking-[0.04em] text-[var(--text-primary)]">
            FEATURES
          </h2>
          <p className="mt-3 text-lg tracking-[0.18em] text-[var(--text-secondary)]">真实入口 · 同一套产品流程</p>
          <p className="mt-8 max-w-[28rem] text-base leading-8 text-[var(--text-secondary)]">
            这一屏不再只是未来规划展示，而是直接把试衣、日志、风格画像和衣橱管理串到真实页面。
            页面内部仍然允许优雅降级，但入口本身现在都是可执行的。
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <GlowButton className="feature-cta" variant="filled" onClick={() => router.push("/try-on")}>
              打开试衣工作台
            </GlowButton>
            <GlowButton className="feature-cta" variant="ghost" onClick={() => router.push("/assistant")}>
              打开智能工作台
            </GlowButton>
          </div>

          <div className="mt-10 grid gap-3">
            {["真实试衣图接入", "智能场景推荐", "多端风格档案"].map((item) => (
              <div key={item} className="feature-metric" data-cursor="hover">
                <span className="feature-metric__dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {FEATURE_PLACEHOLDERS.map((feature, index) => (
            <motion.button
              key={feature.id}
              type="button"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, scale: 1.01 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.58, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="feature-panel feature-card text-left"
              data-cursor="hover"
              onClick={() => router.push(featureRoutes[feature.id] ?? "/wardrobe")}
              style={{ "--feature-accent": feature.accent } as CSSProperties}
            >
              <div className="feature-card__orb" />
              <span className="feature-card__subtitle">{feature.subtitle}</span>
              <h3 className="mt-4 font-[var(--font-cormorant)] text-[2rem] leading-[1.02] text-[var(--text-primary)]">
                {feature.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{feature.description}</p>

              {feature.id === "style-radar" ? (
                <div className="feature-radar mt-7" aria-hidden="true">
                  <span className="feature-radar__ring feature-radar__ring--outer" />
                  <span className="feature-radar__ring feature-radar__ring--inner" />
                  <span className="feature-radar__axis feature-radar__axis--vertical" />
                  <span className="feature-radar__axis feature-radar__axis--diag-a" />
                  <span className="feature-radar__axis feature-radar__axis--diag-b" />
                  <svg viewBox="0 0 140 140" className="feature-radar__shape">
                    <polygon points="70,20 110,48 94,108 44,118 28,58" />
                  </svg>
                  <span className="feature-radar__dot feature-radar__dot--top" />
                  <span className="feature-radar__dot feature-radar__dot--right" />
                  <span className="feature-radar__dot feature-radar__dot--bottom" />
                  <span className="feature-radar__dot feature-radar__dot--left" />
                  <span className="feature-radar__dot feature-radar__dot--mid" />
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-2">
                {feature.bullets.map((bullet) => (
                  <span key={bullet} className="feature-bullet">
                    {bullet}
                  </span>
                ))}
              </div>
              <div className="mt-8 text-sm tracking-[0.14em] text-[var(--text-secondary)]">进入模块 →</div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
