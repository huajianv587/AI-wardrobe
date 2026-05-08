"use client";

import { FeatureSection } from "@/components/FeatureSection";
import { HeroSection } from "@/components/HeroSection";
import { WardrobeSection } from "@/components/WardrobeSection";
import { CustomCursor } from "@/components/shared/CustomCursor";
import { V3Banner } from "@/components/shared/V3Banner";
import { useOutfit } from "@/hooks/useOutfit";
import { useScrollSnap } from "@/hooks/useScrollSnap";

export default function Home() {
  const { containerRef, setSectionRef, scrollToSection } = useScrollSnap(3);
  const {
    activeAction,
    filteredItems,
    quickActions,
    selectedCategory,
    selectedItem,
    applyQuickAction,
    selectCategory,
    selectItem
  } = useOutfit();

  const handleVideoNav = () => {
    scrollToSection(0);
  };

  const handleStartTryOn = () => {
    scrollToSection(1);
  };

  return (
    <>
      <CustomCursor />
      <V3Banner />
      <main className="relative pt-11">
        <section ref={setSectionRef(0)} className="scroll-section" aria-label="云衣橱品牌展示">
          <HeroSection
            onNavigateHome={handleVideoNav}
            onStartTryOn={handleStartTryOn}
            scrollContainerRef={containerRef}
          />
        </section>
        <section ref={setSectionRef(1)} className="scroll-section" aria-label="云衣橱数字衣橱">
          <WardrobeSection
            activeAction={activeAction}
            filteredItems={filteredItems}
            onApplyQuickAction={applyQuickAction}
            onSelectCategory={selectCategory}
            onSelectItem={selectItem}
            quickActions={quickActions}
            scrollContainerRef={containerRef}
            selectedCategory={selectedCategory}
            selectedItem={selectedItem}
          />
        </section>
        <section ref={setSectionRef(2)} className="scroll-section" aria-label="云衣橱功能规划">
          <FeatureSection />
        </section>
      </main>
    </>
  );
}
