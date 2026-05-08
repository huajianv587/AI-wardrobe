import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { VersionBadge } from "./VersionBadge";

type AppShellProps = {
  children: ReactNode;
  activePath?: string;
};

const lightThemeVars = {
  "--bg-base": "#f8f7ff",
  "--bg-surface": "rgba(255,255,255,0.92)",
  "--bg-elevated": "#ffffff",
  "--bg-glass": "rgba(255,255,255,0.72)",
  "--bg-glass-hover": "rgba(255,255,255,0.88)",
  "--brand-blue": "#5d63ff",
  "--brand-purple": "#8d60e8",
  "--brand-pink": "#e86ca6",
  "--brand-gold": "#b9892a",
  "--gradient-brand-text": "linear-gradient(135deg,#21172f 0%,#8d60e8 55%,#e86ca6 100%)",
  "--text-primary": "#171322",
  "--text-secondary": "#625f76",
  "--text-muted": "#918ca5",
  "--text-inverse": "#ffffff",
  "--border-subtle": "rgba(87,72,125,0.08)",
  "--border-default": "rgba(87,72,125,0.13)",
  "--border-strong": "rgba(87,72,125,0.22)",
  "--border-brand": "rgba(196,139,255,0.34)",
  "--shadow-card": "0 18px 50px rgba(84,62,120,0.10)",
  "--shadow-float": "0 30px 90px rgba(85,66,120,0.18), 0 0 44px rgba(200,168,255,0.16)",
  "--shadow-glow": "0 18px 60px rgba(200,168,255,0.20)",
} as CSSProperties;

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
    <div
      style={lightThemeVars}
      className="min-h-screen bg-[radial-gradient(circle_at_14%_0%,rgba(240,160,192,0.24),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(200,168,255,0.28),transparent_36%),linear-gradient(180deg,#fffaff_0%,#f8f7ff_48%,#ffffff_100%)] text-[var(--text-primary)]"
    >
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[var(--border-subtle)] bg-white/82 p-5 shadow-[18px_0_60px_rgba(84,62,120,0.08)] backdrop-blur-2xl lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c8a8ff,#f0a0c0)] text-sm font-black text-white shadow-[0_14px_32px_rgba(200,168,255,0.38)]">
            AI
          </span>
          <span className="font-semibold text-[#241a35]">AI Wardrobe</span>
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
                    ? "border border-white/80 bg-[linear-gradient(135deg,rgba(200,168,255,0.25),rgba(240,160,192,0.22))] text-[#2b1d47] shadow-[0_12px_28px_rgba(140,94,180,0.12)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-white/70 hover:text-[var(--text-primary)]"
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
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white/72 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-[var(--text-primary)]">高级穿搭档案</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              8 个场景偏好 · 128 件衣物同步 · 今日推荐已生成
            </p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-white/86 px-4 py-3 shadow-[0_10px_32px_rgba(84,62,120,0.08)] backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold text-[var(--text-primary)]">
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
                  ? "bg-[linear-gradient(135deg,#c8a8ff,#f0a0c0)] font-semibold text-white"
                  : "border border-[var(--border-default)] bg-white/70 text-[var(--text-secondary)]"
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
