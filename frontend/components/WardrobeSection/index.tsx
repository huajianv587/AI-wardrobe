"use client";

import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import type { RefObject } from "react";
import { AvatarPanel } from "./AvatarPanel";
import { ClothingPanel } from "./ClothingPanel";
import type { ClothingCategory, ClothingItem, QuickAction } from "@/lib/mockData";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface WardrobeSectionProps {
  activeAction: QuickAction | null;
  filteredItems: ClothingItem[];
  quickActions: readonly QuickAction[];
  scrollContainerRef: RefObject<HTMLElement | null>;
  selectedCategory: ClothingCategory;
  selectedItem: ClothingItem | null;
  onApplyQuickAction: (action: QuickAction) => void;
  onSelectCategory: (category: ClothingCategory) => void;
  onSelectItem: (item: ClothingItem) => void;
}

export function WardrobeSection({
  activeAction,
  filteredItems,
  quickActions,
  scrollContainerRef,
  selectedCategory,
  selectedItem,
  onApplyQuickAction,
  onSelectCategory,
  onSelectItem
}: WardrobeSectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !rootRef.current) {
        return;
      }

      const scroller = scrollContainerRef.current ?? undefined;
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: rootRef.current,
          scroller,
          start: "top 72%",
          end: "top 18%",
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      timeline.fromTo(titleRef.current, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0);
      timeline.fromTo(".wardrobe-panel-left", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, 0.08);
      timeline.fromTo(".wardrobe-panel-right", { x: 48, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, 0.12);
    },
    { scope: rootRef, dependencies: [reducedMotion, scrollContainerRef] }
  );

  return (
    <div
      ref={rootRef}
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 18% 18%, rgba(var(--accent-gold-rgb), 0.14), transparent 24%), radial-gradient(circle at 86% 14%, rgba(var(--accent-rose-rgb), 0.16), transparent 22%), linear-gradient(180deg, rgba(var(--bg-primary-rgb), 1) 0%, rgba(var(--bg-secondary-rgb), 0.86) 100%)"
      }}
    >
      <div ref={titleRef} className="pointer-events-none absolute inset-x-0 top-4 z-20 px-4 md:top-7 md:px-8">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-[var(--font-cormorant)] text-[clamp(2.8rem,5vw,3.5rem)] leading-none tracking-[0.06em] text-[var(--text-primary)]">
              WARDROBE
            </h2>
            <p className="pl-1 text-base tracking-[0.18em] text-[rgba(var(--text-secondary-rgb),0.82)]">我的衣橱</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col pt-16 md:flex-row md:pt-0">
        <div className="wardrobe-panel-left relative h-[34vh] min-h-[280px] md:h-full md:basis-[38%] md:flex-none">
          <AvatarPanel selectedItem={selectedItem} />
        </div>

        <div className="relative hidden w-px md:block">
          <div className="soft-divider-vertical absolute inset-y-10 left-1/2 w-px -translate-x-1/2" />
        </div>

        <div className="wardrobe-panel-right min-h-0 flex-1">
          <ClothingPanel
            actions={quickActions}
            activeAction={activeAction}
            items={filteredItems}
            selectedCategory={selectedCategory}
            selectedItem={selectedItem}
            onApplyQuickAction={onApplyQuickAction}
            onSelectCategory={onSelectCategory}
            onSelectItem={onSelectItem}
          />
        </div>
      </div>
    </div>
  );
}
