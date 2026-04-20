"use client";

import { EmbeddedRouteFrame } from "@/components/embedded-route-frame";

import styles from "./page.module.css";

export default function ExperienceStyleProfilePage() {
  return (
    <div className={styles.page}>
      <EmbeddedRouteFrame
        src="/style-profile"
        title="风格画像"
        testId="experience-style-profile-frame"
      />
    </div>
  );
}

