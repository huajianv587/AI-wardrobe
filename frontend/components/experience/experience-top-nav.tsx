"use client";

import { NavBar } from "@/components/HeroSection/NavBar";

export function ExperienceTopNav() {
  return (
    <NavBar
      onNavigateHome={() => {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    />
  );
}
