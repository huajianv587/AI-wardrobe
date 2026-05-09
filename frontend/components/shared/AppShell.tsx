import type { ReactNode } from "react";
import { ProductShell } from "./CoutureSystem";

type AppShellProps = {
  children: ReactNode;
  activePath?: string;
};

export function AppShell({ children, activePath }: AppShellProps) {
  return <ProductShell activePath={activePath}>{children}</ProductShell>;
}
