import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PageShell } from "./PageShell";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";

type ExperiencePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  stats: Array<{ label: string; value: string }>;
  highlights: Array<{ title: string; description: string }>;
  cardVariant?: "dashboard" | "tryon" | "wardrobe" | "analysis";
};

export function ExperiencePage({
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel,
  stats,
  highlights,
  cardVariant = "dashboard",
}: ExperiencePageProps) {
  return (
    <PageShell>
      <main className="px-6 pb-24 pt-32 md:px-8">
        <section className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading eyebrow={eyebrow} title={title} description={description} />
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={ctaHref}>
                <PremiumButton size="lg" icon={<ArrowRight className="h-5 w-5" />} iconPosition="right">
                  {ctaLabel}
                </PremiumButton>
              </Link>
              <Link
                href="/landing-new"
                className="inline-flex min-h-14 items-center rounded-[var(--radius-pill)] border border-[var(--border-default)] px-8 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-brand)] hover:bg-[var(--bg-glass-hover)]"
              >
                返回新版首页
              </Link>
            </div>
          </div>
          <ProductCard title={title} subtitle="AI Wardrobe experience" badge="Experience" variant={cardVariant} />
        </section>

        <section className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-6 backdrop-blur-xl">
              <p className="bg-[image:var(--gradient-brand-text)] bg-clip-text text-4xl font-semibold text-transparent">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto mt-5 grid max-w-6xl gap-5 md:grid-cols-2">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-purple)]" />
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em]">{item.title}</h2>
              <p className="mt-3 leading-7 text-[var(--text-secondary)]">{item.description}</p>
            </article>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
