import type { CSSProperties, ReactNode } from "react";
import { HeroGlow } from "./HeroGlow";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

type PageShellProps = {
  children: ReactNode;
  showFooter?: boolean;
  showNav?: boolean;
  className?: string;
  style?: CSSProperties;
};

const lightThemeVars = {
  "--bg-base": "#fbf8f3",
  "--bg-surface": "rgba(255,255,255,0.92)",
  "--bg-elevated": "#ffffff",
  "--bg-glass": "rgba(255,255,255,0.72)",
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
  "--border-subtle": "rgba(87,72,125,0.08)",
  "--border-default": "rgba(87,72,125,0.13)",
  "--border-strong": "rgba(87,72,125,0.22)",
  "--border-brand": "rgba(196,139,255,0.34)",
  "--shadow-card": "0 18px 50px rgba(84,62,120,0.10)",
  "--shadow-float": "0 30px 90px rgba(85,66,120,0.18), 0 0 44px rgba(200,168,255,0.16)",
  "--shadow-glow": "0 18px 60px rgba(200,168,255,0.20)",
} as CSSProperties;

export function PageShell({
  children,
  showFooter = true,
  showNav = true,
  className = "",
  style,
}: PageShellProps) {
  return (
    <div
      style={style ?? lightThemeVars}
      className={`relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(240,160,192,0.22),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(200,168,255,0.25),transparent_36%),linear-gradient(180deg,#fffaf5_0%,#fbf8f3_48%,#ffffff_100%)] text-[var(--text-primary)] ${className}`}
    >
      <HeroGlow />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(87,72,125,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(87,72,125,0.055)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />
      {showNav ? <SiteNav /> : null}
      <div className="relative z-10">{children}</div>
      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}
