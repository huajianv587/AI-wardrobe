"use client";

import { EmbeddedRouteFrame } from "@/components/embedded-route-frame";

import styles from "./page.module.css";

export default function ExperienceSmartWardrobePage() {
  return (
    <div className={styles.page}>
      <EmbeddedRouteFrame
        src="/smart-wardrobe"
        title="智能衣橱"
        testId="experience-smart-wardrobe-frame"
      />
    </div>
  );
}
