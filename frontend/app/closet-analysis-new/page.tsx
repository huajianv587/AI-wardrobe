import { AppShell } from "@/components/shared/AppShell";
import { ClosetInsightDashboard, ProductPageHero, ProductWorkflowRibbon } from "@/components/shared/ProductModules";

export default function ClosetAnalysisPage() {
  return (
    <AppShell activePath="/closet-analysis-new">
      <div className="grid gap-12">
        <ProductPageHero route="/closet-analysis-new" />
        <ProductWorkflowRibbon route="/closet-analysis-new" />
        <section id="analysis-workspace" className="scroll-mt-32">
          <ClosetInsightDashboard />
        </section>
      </div>
    </AppShell>
  );
}
