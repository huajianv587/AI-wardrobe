"use client";

import { EmbeddedRouteFrame } from "@/components/embedded-route-frame";

import styles from "./page.module.css";

export default function ExperienceClosetAnalysisPage() {
  return (
    <div className={styles.page}>
      <EmbeddedRouteFrame
        src="/closet-analysis"
        title="衣橱分析"
        testId="experience-closet-analysis-frame"
      />
    </div>
  );
}
