import { AppShell } from "@/components/shared/AppShell";
import { ProductPageHero, ProductWorkflowRibbon, RecommendationBoard } from "@/components/shared/ProductModules";

export default function RecommendPage() {
  return (
    <AppShell activePath="/recommend-new">
      <div className="grid gap-12">
        <ProductPageHero route="/recommend-new" />
        <ProductWorkflowRibbon route="/recommend-new" />
        <section id="recommend-workspace" className="scroll-mt-32">
          <RecommendationBoard />
        </section>
      </div>
    </AppShell>
  );
}
