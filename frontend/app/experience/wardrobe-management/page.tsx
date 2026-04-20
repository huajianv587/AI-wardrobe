"use client";

import { EmbeddedRouteFrame } from "@/components/embedded-route-frame";

import styles from "./page.module.css";

export default function ExperienceWardrobeManagementPage() {
  return (
    <div className={styles.page}>
      <EmbeddedRouteFrame
        src="/wardrobe"
        title="衣橱管理"
        testId="experience-wardrobe-management-frame"
      />
    </div>
  );
}
