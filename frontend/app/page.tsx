import Link from "next/link";
import { ArrowRight, Cloud, Database, ScanFace, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

const capabilityCards = [
  { title: "Digital Wardrobe", description: "Categorize clothes, keep searchable metadata, and prepare each item for styling workflows.", accent: "var(--accent-soft)" },
  { title: "2.5D Try-On", description: "Preview layered looks with a lightweight avatar stage before high-cost image generation is wired in.", accent: "var(--accent-lilac)" },
  { title: "AI Outfit Agent", description: "Router 鈫?Retriever 鈫?Stylist 鈫?Verifier mirrors the LangGraph workflow from your product design.", accent: "var(--accent-mint)" }
];

const quickLinks = [
  { href: "/wardrobe", label: "Open wardrobe", icon: Sparkles },
  { href: "/recommend", label: "Generate outfit", icon: Wand2 },
  { href: "/try-on", label: "Enter try-on studio", icon: ScanFace }
];

export default function HomePage() {
  return (
    <AppShell title="AI Wardrobe" subtitle="A local-first styling assistant for wardrobe memory, 2.5D try-on, and AI recommendation.">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="section-card relative overflow-hidden rounded-[36px] p-6 md:p-8">
          <div className="hero-glow absolute inset-0 opacity-75" />
          <div className="relative">
            <div className="pill mb-4">Phase 1 MVP scaffold</div>
            <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)] md:text-6xl">Turn wardrobe chaos into a calm daily styling flow.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">The current build already separates wardrobe browsing, AI recommendation, and try-on preview so we can move from architecture into real product iteration without waiting for every model to be fully trained.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]">
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="section-card rounded-[30px] p-5">
            <div className="pill mb-4"><Database className="size-4" />Storage strategy</div>
            <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Local first, cloud when ready</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">SQLite handles offline-friendly metadata first. Supabase and object storage are reserved for sync, auth, and backup once the base experience feels right.</p>
          </article>

          <article className="section-card rounded-[30px] p-5">
            <div className="pill mb-4"><Cloud className="size-4" />Model handoff</div>
            <h3 className="text-xl font-semibold text-[var(--ink-strong)]">Checkpoint-ready structure</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your future Qwen, OOTDiffusion, and image model artifacts can be dropped into `model_training/` without reworking the repository layout.</p>
          </article>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading eyebrow="Core modules" title="The MVP now mirrors your product plan" description="We start from the features that unblock user value fastest: wardrobe memory, AI suggestions, and a try-on stage that can evolve into a richer avatar pipeline." />

        <div className="grid gap-4 lg:grid-cols-3">
          {capabilityCards.map((card) => (
            <article key={card.title} className="section-card rounded-[30px] p-5">
              <div className="mb-5 h-32 rounded-[24px]" style={{ background: `linear-gradient(140deg, ${card.accent} 0%, rgba(255,255,255,0.96) 100%)` }} />
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="section-card rounded-[32px] p-6">
          <SectionHeading eyebrow="Architecture" title="Five-layer system design" description="Frontend, API gateway, business services, AI services, and data storage remain clearly separated so we can scale each track independently." />
          <div className="space-y-3">
            {["Frontend: Next.js web and future Taro mini program", "Gateway: FastAPI APIs and nginx routing", "Business: user, wardrobe, outfit, and sync logic", "AI: cleanup, classifier, recommendation, try-on, and avatar services", "Data: SQLite local-first + Supabase sync + S3-compatible assets"].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-4 text-sm text-[var(--ink)]">{item}</div>
            ))}
          </div>
        </article>

        <article className="section-card rounded-[32px] p-6">
          <SectionHeading eyebrow="Phase 1" title="What we can build next" description="The codebase is prepared for the first end-to-end loop: add an item, browse the wardrobe, request a recommendation, and preview a look." />
          <div className="space-y-3">
            {["Connect login page to Supabase Auth", "Upload clothing photos and call image cleanup service", "Persist wardrobe CRUD into SQLite and sync selectively", "Call backend recommendation endpoint from the styling workspace", "Replace heuristic output with your trained checkpoint", "Add generated try-on images beside the avatar stage"].map((step) => (
              <div key={step} className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
                <span className="text-sm text-[var(--ink)]">{step}</span>
                <ArrowRight className="size-4 text-[var(--accent)]" />
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}