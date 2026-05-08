import Link from "next/link";

const productLinks = [
  { href: "/landing-new#features", label: "功能" },
  { href: "/ui-demo", label: "演示" },
  { href: "/privacy", label: "隐私" },
  { href: "/terms", label: "条款" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[rgba(7,8,15,0.92)] px-6 py-14 text-[var(--text-secondary)]">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 text-[var(--text-primary)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-xl text-[var(--text-inverse)]">
              AI
            </span>
            <span className="text-lg font-semibold">AI Wardrobe</span>
          </Link>
          <p className="mt-5 max-w-md leading-7">
            用 AI 管理衣橱、生成搭配、虚拟试衣，让每件衣服都物尽其用。
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            Product
          </h3>
          <div className="mt-5 grid gap-3">
            {productLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--text-primary)]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            Social
          </h3>
          <div className="mt-5 flex gap-3">
            {["WeChat", "X", "小红书"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl text-sm text-[var(--text-muted)]">
        © 2026 AI Wardrobe. All rights reserved.
      </div>
    </footer>
  );
}
