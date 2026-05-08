import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { VersionBadge } from "./VersionBadge";

type AppShellProps = {
  children: ReactNode;
  activePath?: string;
};

const menu = [
  { href: "/dashboard-new", label: "今日穿搭" },
  { href: "/wardrobe-new", label: "我的衣橱" },
  { href: "/try-on-new", label: "虚拟试衣" },
  { href: "/recommend-new", label: "搭配推荐" },
  { href: "/outfit-diary-new", label: "穿搭日记" },
  { href: "/closet-analysis-new", label: "衣橱分析" },
  { href: "/style-profile-new", label: "风格档案" },
];

export function AppShell({ children, activePath }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--text-inverse)]">
            AI
          </span>
          <span className="font-semibold">AI Wardrobe</span>
        </Link>

        <nav className="mt-9 grid gap-2">
          {menu.map((item) => {
            const active = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-[var(--text-inverse)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-4">
          <VersionBadge href="/v3" tone="v3">
            V3 实验版
          </VersionBadge>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-4">
            <p className="text-sm font-semibold">高级穿搭档案</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              8 个场景偏好 · 128 件衣物同步
            </p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[rgba(7,8,15,0.78)] px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold">
            AI Wardrobe
          </Link>
          <VersionBadge href="/v3" tone="v3">
            V3
          </VersionBadge>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${
                activePath === item.href
                  ? "bg-white text-[var(--text-inverse)]"
                  : "border border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-h-screen lg:pl-60">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:py-10">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}
