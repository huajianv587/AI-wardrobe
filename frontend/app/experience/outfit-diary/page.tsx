"use client";

import { EmbeddedRouteFrame } from "@/components/embedded-route-frame";

import styles from "./page.module.css";

export default function ExperienceOutfitDiaryPage() {
  return (
    <div className={styles.page}>
      <EmbeddedRouteFrame
        src="/outfit-diary"
        title="穿搭日记"
        testId="experience-outfit-diary-frame"
      />
    </div>
  );
}
