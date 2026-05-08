import { ArrowRight, Palette, Sparkles, Wand2 } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumTag, PremiumTagGroup } from "@/components/ui/PremiumTag";
import { PageShell } from "./PageShell";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";

type DemoGalleryProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const tokenSwatches = [
  { name: "Base", value: "var(--bg-base)" },
  { name: "Surface", value: "var(--bg-surface)" },
  { name: "Blue", value: "var(--brand-blue)" },
  { name: "Purple", value: "var(--brand-purple)" },
  { name: "Pink", value: "var(--brand-pink)" },
  { name: "Gold", value: "var(--brand-gold)" },
];

export function DemoGallery({ eyebrow, title, description }: DemoGalleryProps) {
  return (
    <PageShell>
      <main className="px-6 pb-24 pt-32 md:px-8">
        <section className="mx-auto max-w-6xl">
          <SectionHeading eyebrow={eyebrow} title={title} description={description} align="center" />

          <div className="mt-14 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-6 backdrop-blur-2xl md:p-8">
              <div className="flex items-center gap-3 text-[var(--brand-purple)]">
                <Wand2 className="h-5 w-5" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">PremiumButton</h2>
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <PremiumButton>免费开始</PremiumButton>
                <PremiumButton variant="secondary">生成搭配</PremiumButton>
                <PremiumButton variant="outline">查看演示</PremiumButton>
                <PremiumButton variant="ghost">稍后再看</PremiumButton>
                <PremiumButton variant="glow-inner" icon={<Sparkles className="h-4 w-4" />}>
                  AI 试衣
                </PremiumButton>
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-6 backdrop-blur-2xl md:p-8">
              <div className="flex items-center gap-3 text-[var(--brand-purple)]">
                <Palette className="h-5 w-5" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">PremiumTag</h2>
              </div>
              <PremiumTagGroup className="mt-6">
                <PremiumTag selected color="pink">通勤</PremiumTag>
                <PremiumTag color="purple">约会</PremiumTag>
                <PremiumTag color="blue">旅行</PremiumTag>
                <PremiumTag color="green">极简</PremiumTag>
                <PremiumTag color="orange">复古</PremiumTag>
              </PremiumTagGroup>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-6 backdrop-blur-2xl md:p-8">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Color Tokens</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {tokenSwatches.map((token) => (
                  <div key={token.name} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                    <div className="h-20 rounded-[var(--radius-md)] border border-[var(--border-subtle)]" style={{ background: token.value }} />
                    <p className="mt-3 text-sm font-semibold">{token.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{token.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-4 backdrop-blur-2xl md:p-6">
              <ProductCard
                title="组件展示"
                subtitle="Design system preview"
                badge="Gallery"
                variant="analysis"
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
                    <span>共享卡片、渐变按钮、胶囊标签与滚动动效均来自新版设计系统。</span>
                    <PremiumButton size="sm" variant="ghost" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                      进入产品
                    </PremiumButton>
                  </div>
                }
              />
            </section>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
