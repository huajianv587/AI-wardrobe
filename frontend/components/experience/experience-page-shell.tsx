import type { ReactNode } from "react";

import { ExperienceTopNav } from "@/components/experience/experience-top-nav";

import styles from "./experience-page-shell.module.css";

interface ExperiencePageShellProps {
  children: ReactNode;
}

export function ExperiencePageShell({ children }: ExperiencePageShellProps) {
  return (
    <div className={styles.shell}>
      <ExperienceTopNav />
      <main className={styles.pageWrap}>
        <div className={styles.pageViewport}>{children}</div>
      </main>
    </div>
  );
}
