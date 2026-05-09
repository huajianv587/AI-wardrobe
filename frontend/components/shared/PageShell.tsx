import type { ReactNode } from "react";
import { CoutureShell } from "./CoutureSystem";

type PageShellProps = {
  children: ReactNode;
  showFooter?: boolean;
  showNav?: boolean;
  className?: string;
};

export function PageShell({ children, showFooter = true, showNav = true, className = "" }: PageShellProps) {
  return (
    <CoutureShell navVariant="landing" showFooter={showFooter} showNav={showNav} className={className}>
      {children}
    </CoutureShell>
  );
}
