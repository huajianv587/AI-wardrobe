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
  { label: "匹配度", value: "98%", tone: "from-[#3139fb] to-[#c8a8ff]" },
  { label: "试穿速度", value: "3 秒", tone: "from-[#e8c87a] to-[#f0a0c0]" },
];

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
      className={`group relative overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.92)] p-3 text-[var(--text-inverse)] shadow-[var(--shadow-float)] transition duration-700 ease-out hover:[transform:perspective(1200px)_rotateX(0deg)] md:[transform:perspective(1200px)_rotateX(3deg)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(49,57,251,0.16),transparent_42%)]" />
      <div className="relative overflow-hidden rounded-[22px] border border-black/5 bg-white">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff6b6b]" />
            <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
            <span className="h-3 w-3 rounded-full bg-[#06d6a0]" />
          </div>
          <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-black/5 bg-[#f7f8ff] p-5 lg:block">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-black/40">
              Wardrobe
            </div>
            <div className="mt-5 space-y-2">
              {["今日穿搭", "虚拟试衣", "衣橱管理", "风格档案"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === 0 ? "bg-[#3139fb] text-white" : "bg-white text-black/60"
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
                <p className="text-sm font-medium text-black/45">{subtitle}</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-black">
                  {title}
                </h3>
              </div>
              <div className="rounded-full bg-[#eff2ff] px-4 py-2 text-sm font-semibold text-[#3139fb]">
                4.9 ★
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {items.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-black/5 bg-[#f7f8ff] p-4">
                  <div
                    className={`mb-8 h-24 rounded-[18px] bg-gradient-to-br ${
                      item.tone ?? "from-[#c8a8ff] to-[#3139fb]"
                    } opacity-90`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-black">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[22px] border border-black/5 bg-[#111324] p-4 text-white">
              {variant === "tryon" ? (
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div>
                    <p className="text-sm text-white/50">AI Try-on Result</p>
                    <p className="mt-2 text-2xl font-semibold">雾蓝西装 + 奶白长裙</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 text-center text-3xl">👗</div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/50">Next best outfit</p>
                    <p className="mt-2 text-2xl font-semibold">今天穿得轻松，也足够正式</p>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
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
