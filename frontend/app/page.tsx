import Link from "next/link";
import { ArrowRight, Bot, Cloud, Database, ScanFace, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

const capabilityCards = [
  { title: "Digital Wardrobe", description: "Categorize clothing, keep metadata searchable, and make each item ready for sync, styling, and future model calls.", accent: "var(--accent-soft)" },
  { title: "2.5D Try-On", description: "Use a lower-cost, emotionally warm avatar stage now, then evolve the same flow toward generated try-on imagery later.", accent: "var(--accent-lilac)" },
  { title: "API-First Model Lab", description: "Every model slot now has an API contract, so the UI survives while you gradually replace demos with self-hosted workers.", accent: "var(--accent-mint)" }
];

const quickLinks = [
  { href: "/wardrobe", label: "Open wardrobe", icon: Sparkles },
  { href: "/recommend", label: "Generate outfit", icon: Wand2 },
  { href: "/assistant", label: "Open assistant", icon: Bot },
  { href: "/try-on", label: "Enter try-on studio", icon: ScanFace },
  { href: "/ai-demo", label: "Open AI demo lab", icon: Bot }
];

const modelRoadmap = [
  { model: "Qwen2.5-7B LoRA", task: "Outfit recommendation", priority: "P1", lane: "llm-recommender" },
  { model: "BiRefNet / RMBG-2.0", task: "Garment cutout", priority: "P1", lane: "image-processor" },
  { model: "CLIP ViT-L/14", task: "Classification + tags", priority: "P2", lane: "classifier" },
  { model: "Qwen-VL-7B LoRA", task: "Attribute understanding", priority: "P2", lane: "multimodal-reader" },
  { model: "OOTDiffusion / VITON", task: "Virtual try-on", priority: "P3", lane: "virtual-tryon" },
  { model: "Real-ESRGAN", task: "Upscaling", priority: "P3", lane: "image-processor" },
  { model: "ControlNet + SD", task: "Product hero render", priority: "P4", lane: "product-renderer" },
  { model: "TripoSR / InstantMesh", task: "2.5D / 3D prep", priority: "P4", lane: "avatar-builder" }
];

export default function HomePage() {
  return (
    <AppShell title="AI Wardrobe" subtitle="A warm, API-first styling assistant for wardrobe memory, 2.5D try-on, and future self-hosted model workflows.">
      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="section-card hero-panel relative rounded-[40px] p-6 md:p-8">
          <div className="hero-glow absolute inset-0 opacity-80" />
          <div className="relative">
            <div className="pill mb-4">Inspired by calm product storytelling from Apple and polished software density from Linear</div>
            <h2 className="display-title max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[var(--ink-strong)] md:text-7xl">Make getting dressed feel gentle, personal, and delightfully organized.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)]">This build now treats every model lane as an API contract, keeps the wardrobe local-first, and wraps it all in a softer interface designed to feel closer to a loved product than an internal dashboard.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Warm editorial surface", "Local-first memory", "API demo for every model", "2.5D try-on before full 3D"].map((token) => (
                <span key={token} className="mood-chip">{token}</span>
              ))}
            </div>

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
          <article className="section-card subtle-card rounded-[30px] p-5">
            <div className="pill mb-4"><Database className="size-4" />Storage strategy</div>
            <h3 className="display-title text-2xl font-semibold text-[var(--ink-strong)]">Local first, cloud only when it helps</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">SQLite keeps the experience fast and private by default. Supabase is layered in for auth, backup, and sync visibility without forcing every interaction to wait on the network.</p>
          </article>

          <article className="section-card subtle-card rounded-[30px] p-5">
            <div className="pill mb-4"><Cloud className="size-4" />Model handoff</div>
            <h3 className="display-title text-2xl font-semibold text-[var(--ink-strong)]">Swap demos for your own workers later</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Qwen, BiRefNet, CLIP, Qwen-VL, OOTDiffusion, Real-ESRGAN, ControlNet, and 3D workers can now slot behind stable API routes instead of forcing product rewrites.</p>
          </article>

          <article className="section-card rounded-[30px] p-5">
            <div className="pill mb-4"><Bot className="size-4" />API demo map</div>
            <p className="text-sm leading-7 text-[var(--muted)]">Recommendation, cutout, classification, attribute reading, try-on, super-resolution, product rendering, and 3D prep all have a demo API lane ready now.</p>
          </article>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading eyebrow="Core modules" title="The product shape already feels coherent" description="The web app now reads less like a loose prototype and more like a gentle wardrobe companion: curated modules, warm spacing, and clearer handoff points to future models." />

        <div className="grid gap-4 lg:grid-cols-3">
          {capabilityCards.map((card) => (
            <article key={card.title} className="section-card subtle-card glow-card rounded-[32px] p-5">
              <div className="mb-5 h-32 rounded-[24px]" style={{ background: `linear-gradient(140deg, ${card.accent} 0%, rgba(255,255,255,0.96) 100%)` }} />
              <h3 className="display-title text-2xl font-semibold text-[var(--ink-strong)]">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="section-card subtle-card rounded-[34px] p-6">
          <SectionHeading eyebrow="Architecture" title="Five-layer system design" description="Frontend, API gateway, business services, AI services, and data storage still stay clearly separated, but the product now exposes that architecture in a much more understandable way." />
          <div className="space-y-3">
            {["Frontend: Next.js web and future Taro mini program", "Gateway: FastAPI APIs and nginx routing", "Business: user, wardrobe, outfit, and sync logic", "AI: cleanup, classifier, recommendation, try-on, and avatar services", "Data: SQLite local-first + Supabase sync + S3-compatible assets"].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-4 text-sm text-[var(--ink)]">{item}</div>
            ))}
          </div>
        </article>

        <article className="section-card subtle-card rounded-[34px] p-6">
          <SectionHeading eyebrow="Now runnable" title="The current demo lanes are already useful" description="The app can authenticate, manage wardrobe data, call unified AI demo APIs, check sync health, and prepare both the web UI and mini-program contracts for later self-hosted models." />
          <div className="space-y-3">
            {["Run every planned model lane through one demo API", "Use the AI lab as the stable contract for later workers", "Drag garments into the 2.5D try-on stage", "Mirror wardrobe state to Supabase when configured", "Surface account sync status in one place", "Scaffold mini-program API wrappers and page contracts"].map((step) => (
              <div key={step} className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
                <span className="text-sm text-[var(--ink)]">{step}</span>
                <ArrowRight className="size-4 text-[var(--accent)]" />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8">
        <SectionHeading eyebrow="Model lanes" title="Each training priority already has an API home" description="You can keep moving product work now, then slot each trained checkpoint into the adapter lane that already exists in the system." />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {modelRoadmap.map((item) => (
            <article key={item.model} className="section-card interactive-card rounded-[30px] p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="pill">{item.priority}</span>
                <span className="rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs text-[var(--ink)]">{item.lane}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">{item.model}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.task}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
