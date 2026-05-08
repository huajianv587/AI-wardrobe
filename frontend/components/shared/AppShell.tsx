import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Heart,
  Home,
  Layers3,
  Shirt,
  Sparkles,
  UserRound,
} from "lucide-react";
import { SiteFooter } from "./SiteFooter";
import { VersionBadge } from "./VersionBadge";

type AppShellProps = {
  children: ReactNode;
  activePath?: string;
};

const lightThemeVars = {
  "--bg-base": "#fbf8f3",
  "--bg-surface": "rgba(255,255,255,0.90)",
  "--bg-elevated": "#ffffff",
  "--bg-glass": "rgba(255,255,255,0.66)",
  "--bg-glass-hover": "rgba(255,255,255,0.88)",
  "--brand-blue": "#5d63ff",
  "--brand-purple": "#8d60e8",
  "--brand-pink": "#df6f9f",
  "--brand-gold": "#b9892a",
  "--gradient-brand-text": "linear-gradient(135deg,#21172f 0%,#7e5bd6 55%,#d86f9d 100%)",
  "--text-primary": "#171322",
  "--text-secondary": "#625f76",
  "--text-muted": "#918ca5",
  "--text-inverse": "#ffffff",
  "--border-subtle": "rgba(116,86,128,0.08)",
  "--border-default": "rgba(116,86,128,0.13)",
  "--border-strong": "rgba(116,86,128,0.22)",
  "--border-brand": "rgba(196,139,255,0.34)",
  "--shadow-card": "0 24px 70px rgba(84,62,120,0.10)",
  "--shadow-float": "0 34px 110px rgba(85,66,120,0.18), 0 0 54px rgba(218,170,210,0.16)",
  "--shadow-glow": "0 28px 90px rgba(218,170,210,0.20)",
} as CSSProperties;

const menu = [
  { href: "/dashboard-new", label: "今日", icon: Home },
  { href: "/wardrobe-new", label: "衣橱", icon: Shirt },
  { href: "/try-on-new", label: "试衣", icon: Sparkles },
  { href: "/recommend-new", label: "推荐", icon: Heart },
  { href: "/outfit-diary-new", label: "日记", icon: CalendarDays },
  { href: "/closet-analysis-new", label: "分析", icon: BarChart3 },
  { href: "/style-profile-new", label: "档案", icon: UserRound },
];

export function AppShell({ children, activePath }: AppShellProps) {
  return (
    <div
      style={lightThemeVars}
      className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(240,160,192,0.22),transparent_34%),radial-gradient(circle_at_90%_4%,rgba(200,168,255,0.28),transparent_34%),linear-gradient(180deg,#fffaf5_0%,#fbf8f3_46%,#ffffff_100%)] text-[var(--text-primary)]"
    >
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-48 border-r border-[var(--border-subtle)] bg-white/62 px-4 py-6 shadow-[18px_0_70px_rgba(84,62,120,0.06)] backdrop-blur-2xl lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-1">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#d6a8f6,#df8fb7)] text-sm font-black text-white shadow-[0_16px_34px_rgba(200,168,255,0.36)]">
            AI
          </span>
          <span className="font-semibold text-[#241a35]">Wardrobe</span>
        </Link>

        <nav className="mt-10 grid gap-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "border border-white/90 bg-white text-[#2b1d47] shadow-[0_14px_34px_rgba(140,94,180,0.12)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-white/68 hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[var(--brand-purple)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-4">
          <VersionBadge href="/v3" tone="v3">
            V3 实验版
          </VersionBadge>
          <div className="rounded-[26px] border border-white/70 bg-white/68 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Layers3 className="h-4 w-4 text-[var(--brand-purple)]" />
              穿搭档案
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              128 件衣物 · 今日推荐已生成
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
                  ? "bg-[linear-gradient(135deg,#d6a8f6,#df8fb7)] font-semibold text-white"
                  : "border border-[var(--border-default)] bg-white/70 text-[var(--text-secondary)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-h-screen lg:pl-48">
        <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8 lg:py-12">{children}</div>
        <SiteFooter />
      </main>
    </div>
  );
}
