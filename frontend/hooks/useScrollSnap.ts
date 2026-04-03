"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollSnap(sectionCount: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>(Array.from({ length: sectionCount }, () => null));
  const [activeSection, setActiveSection] = useState(0);

  const setSectionRef = (index: number) => (node: HTMLElement | null) => {
    sectionRefs.current[index] = node;
  };

  const scrollToSection = (index: number) => {
    const target = sectionRefs.current[index];

    if (!target) {
      return;
    }

    setActiveSection(index);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };

  useEffect(() => {
    const sections = sectionRefs.current.filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const nextIndex = sections.findIndex((section) => section === visibleEntry.target);

        if (nextIndex >= 0) {
          setActiveSection(nextIndex);
        }
      },
      {
        root: containerRef.current ?? null,
        threshold: [0.3, 0.5, 0.72],
        rootMargin: "0px 0px -10% 0px"
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [sectionCount]);

  return {
    activeSection,
    containerRef,
    scrollToSection,
    setSectionRef
  };
}
