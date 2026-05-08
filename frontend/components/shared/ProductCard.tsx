import type { ReactNode } from "react";

type ProductCardItem = {
  label: string;
  value: string;
  tone?: string;
};

type ProductCardProps = {
  title?: string;
  subtitle?: string;
  badge?: string;
  items?: ProductCardItem[];
  footer?: ReactNode;
  variant?: "dashboard" | "tryon" | "wardrobe" | "analysis";
  className?: string;
};

const defaultItems: ProductCardItem[] = [
  { label: "今日推荐", value: "通勤柔光套装", tone: "from-[#c8a8ff] to-[#f0a0c0]" },
  { label: "匹配度", value: "98%", tone: "from-[#7c83ff] to-[#c8a8ff]" },
  { label: "试衣速度", value: "3 秒", tone: "from-[#e8c87a] to-[#f0a0c0]" },
];

const navItems = ["今日穿搭", "虚拟试衣", "衣橱管理", "风格档案"];

export function ProductCard({
  title = "AI Wardrobe",
  subtitle = "Personal styling workspace",
  badge = "Live Preview",
  items = defaultItems,
  footer,
  variant = "dashboard",
  className = "",
}: ProductCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-3 text-[var(--text-primary)] shadow-[var(--shadow-float)] transition duration-700 ease-out hover:[transform:perspective(1200px)_rotateX(0deg)] md:[transform:perspective(1200px)_rotateX(3deg)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(200,168,255,0.22),transparent_46%)]" />
      <div className="relative overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-white/86 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff8aa0]" />
            <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
            <span className="h-3 w-3 rounded-full bg-[#74d9b4]" />
          </div>
          <span className="rounded-full bg-[linear-gradient(135deg,#c8a8ff,#f0a0c0)] px-3 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-[var(--border-default)] bg-white/66 p-5 lg:block">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Workspace
            </div>
            <div className="mt-5 space-y-2">
              {navItems.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === 0
                      ? "bg-[linear-gradient(135deg,rgba(200,168,255,0.25),rgba(240,160,192,0.22))] font-semibold text-[#2b1d47]"
                      : "bg-white/70 text-[var(--text-secondary)]"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <main className="min-h-[360px] p-5 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{subtitle}</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {title}
                </h3>
              </div>
              <div className="rounded-full border border-[var(--border-brand)] bg-[rgba(200,168,255,0.16)] px-4 py-2 text-sm font-semibold text-[#7d4bd6]">
                4.9 星
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-[var(--border-default)] bg-white/76 p-4 shadow-[var(--shadow-card)]"
                >
                  <div
                    className={`mb-8 h-24 rounded-[18px] bg-gradient-to-br ${
                      item.tone ?? "from-[#c8a8ff] to-[#7c83ff]"
                    } opacity-90`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[22px] border border-[var(--border-default)] bg-white/72 p-4 shadow-[var(--shadow-card)]">
              {variant === "tryon" ? (
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">AI Try-on Result</p>
                    <p className="mt-2 text-2xl font-semibold">雾蓝外套 + 奶油白衬衫</p>
                  </div>
                  <div className="grid place-items-center rounded-2xl bg-[linear-gradient(135deg,rgba(200,168,255,0.28),rgba(240,160,192,0.22))] p-4 text-center text-sm font-semibold text-[#5f3aa4]">
                    试衣结果
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Next best outfit</p>
                    <p className="mt-2 text-2xl font-semibold">今天穿得轻松，也足够正式</p>
                  </div>
                  <div className="rounded-full bg-[linear-gradient(135deg,#c8a8ff,#f0a0c0)] px-4 py-2 text-sm font-semibold text-white">
                    生成搭配
                  </div>
                </div>
              )}
            </div>
            {footer ? <div className="mt-5">{footer}</div> : null}
          </main>
        </div>
      </div>
    </div>
  );
}
