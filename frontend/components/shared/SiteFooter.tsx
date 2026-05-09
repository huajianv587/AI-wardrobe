import Link from "next/link";
import { productRoutes } from "@/lib/v2-product-data";

const legalLinks = [
  { href: "/privacy", label: "隐私" },
  { href: "/terms", label: "条款" },
  { href: "/ui-demo", label: "组件演示" },
  { href: "/v3", label: "V3 实验版" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--couture-line)] bg-[rgba(255,252,247,0.76)] px-5 py-14 text-[var(--couture-muted)] backdrop-blur-2xl">
      <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1.35fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 text-[var(--couture-ink)]">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--couture-ink)] text-xs font-black tracking-[0.16em] text-[var(--couture-bg)]">
              AI
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.28em]">AI Wardrobe</span>
              <span className="block text-xs uppercase tracking-[0.2em] text-[var(--couture-muted)]">
                Couture Studio
              </span>
            </span>
          </Link>
          <p className="mt-6 max-w-md text-sm leading-7">
            用 AI 管理衣橱、生成搭配、虚拟试衣和复盘风格，让每件衣服成为可搜索、可复穿、可进化的个人资产。
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--couture-ink)]">Product</h3>
          <div className="mt-5 grid gap-3 text-sm">
            {productRoutes.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--couture-ink)]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--couture-ink)]">Studio</h3>
          <div className="mt-5 grid gap-3 text-sm">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--couture-ink)]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-[1240px] text-xs uppercase tracking-[0.22em] text-[var(--couture-soft)]">
        2026 AI Wardrobe / Private Academic Prototype
      </div>
    </footer>
  );
}
