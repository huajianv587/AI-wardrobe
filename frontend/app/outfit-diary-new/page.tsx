import { AppShell } from "@/components/shared/AppShell";
import { DiaryTimeline, ProductPageHero, ProductWorkflowRibbon } from "@/components/shared/ProductModules";

export default function OutfitDiaryPage() {
  return (
    <AppShell activePath="/outfit-diary-new">
      <div className="grid gap-12">
        <ProductPageHero route="/outfit-diary-new" />
        <ProductWorkflowRibbon route="/outfit-diary-new" />
        <section id="diary-workspace" className="scroll-mt-32">
          <DiaryTimeline />
        </section>
      </div>
    </AppShell>
  );
}
