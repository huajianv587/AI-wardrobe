import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumTag, PremiumTagGroup } from "@/components/ui/PremiumTag";
import { AppShell } from "./AppShell";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";

const tagColors = ["pink", "purple", "blue", "green", "orange"] as const;

export type FunctionalPageConfig = {
  route: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
  productTitle: string;
  productSubtitle: string;
  productVariant?: "dashboard" | "tryon" | "wardrobe" | "analysis";
  tags: string[];
  stats: Array<{ value: string; label: string }>;
  panels: Array<{ title: string; body: string; meta: string }>;
};

export function FunctionalPage({ config }: { config: FunctionalPageConfig }) {
  return (
    <AppShell activePath={config.route}>
      <section className="grid gap-8 lg:grid-cols-[1fr_440px] lg:items-start">
        <div>
          <SectionHeading
            eyebrow={config.eyebrow}
            title={config.title}
            description={config.description}
          />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <PremiumButton size="lg">{config.primaryAction}</PremiumButton>
            {config.secondaryAction ? (
              <PremiumButton variant="ghost" size="lg">
                {config.secondaryAction}
              </PremiumButton>
            ) : null}
          </div>
          <PremiumTagGroup className="mt-8">
            {config.tags.map((tag, index) => (
              <PremiumTag key={tag} color={tagColors[index % tagColors.length]}>
                {tag}
              </PremiumTag>
            ))}
          </PremiumTagGroup>
        </div>
        <ProductCard
          title={config.productTitle}
          subtitle={config.productSubtitle}
          variant={config.productVariant}
          className="lg:mt-4"
        />
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        {config.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]"
          >
            <div className="bg-[var(--gradient-brand-text)] bg-clip-text text-3xl font-semibold text-transparent">
              {stat.value}
            </div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {config.panels.map((panel) => (
          <article
            key={panel.title}
            className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-purple)]">
              {panel.meta}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{panel.title}</h2>
            <p className="mt-4 leading-7 text-[var(--text-secondary)]">{panel.body}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
