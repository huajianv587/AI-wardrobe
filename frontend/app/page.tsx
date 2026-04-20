"use client";

import { useRouter } from "next/navigation";

import { FeatureSection } from "@/components/FeatureSection";
import { HeroSection } from "@/components/HeroSection";
import { WardrobeSection } from "@/components/WardrobeSection";
import { CustomCursor } from "@/components/shared/CustomCursor";
import { useOutfit } from "@/hooks/useOutfit";
import { useScrollSnap } from "@/hooks/useScrollSnap";
import { useWardrobeStore } from "@/store/wardrobe-store";

const TRY_ON_FOCUS_KEY = "wenwen:try-on-focus";

export default function Home() {
  const router = useRouter();
  const { containerRef, setSectionRef, scrollToSection } = useScrollSnap(3);
  const setTryOnItems = useWardrobeStore((state) => state.setTryOnItems);
  const {
    activeAction,
    dataMode,
    filteredItems,
    quickActions,
    selectedCategory,
    selectedItem,
    statusText,
    effectiveWardrobeItems,
    buildStarterLookIds,
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

  const handleSetLook = () => {
    const starterIds = buildStarterLookIds(effectiveWardrobeItems, selectedItem?.sourceItemId ?? null);
    if (starterIds.length > 0) {
      setTryOnItems(starterIds);
      try {
        window.localStorage.setItem(
          TRY_ON_FOCUS_KEY,
          JSON.stringify({
            itemIds: starterIds,
            at: new Date().toISOString()
          })
        );
      } catch {
        // Ignore storage write failures and keep SPA state only.
      }
    }

    router.push("/try-on");
  };

  return (
    <>
      <CustomCursor />
      <main className="relative">
        <section ref={setSectionRef(0)} className="scroll-section" aria-label="首页首屏">
          <HeroSection
            onNavigateHome={handleVideoNav}
            onStartTryOn={handleStartTryOn}
            scrollContainerRef={containerRef}
          />
        </section>
        <section ref={setSectionRef(1)} className="scroll-section" aria-label="首页衣橱预览">
          <WardrobeSection
            activeAction={activeAction}
            dataMode={dataMode}
            filteredItems={filteredItems}
            onApplyQuickAction={applyQuickAction}
            onSelectCategory={selectCategory}
            onSelectItem={selectItem}
            onSetLook={handleSetLook}
            quickActions={quickActions}
            scrollContainerRef={containerRef}
            selectedCategory={selectedCategory}
            selectedItem={selectedItem}
            statusText={statusText}
          />
        </section>
        <section ref={setSectionRef(2)} className="scroll-section" aria-label="首页功能展示">
          <FeatureSection />
        </section>
      </main>
    </>
  );
}
