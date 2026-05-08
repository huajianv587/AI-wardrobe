import type { ReactNode } from "react";
import { HeroGlow } from "./HeroGlow";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

type PageShellProps = {
  children: ReactNode;
  showFooter?: boolean;
  showNav?: boolean;
  className?: string;
};

export function PageShell({
  children,
  showFooter = true,
  showNav = true,
  className = "",
}: PageShellProps) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] ${className}`}>
      <HeroGlow />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />
      {showNav ? <SiteNav /> : null}
      <div className="relative z-10">{children}</div>
      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}
