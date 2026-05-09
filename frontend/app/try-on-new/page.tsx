import { AppShell } from "@/components/shared/AppShell";
import { ProductPageHero, ProductWorkflowRibbon, TryOnStudioPanel } from "@/components/shared/ProductModules";

export default function TryOnPage() {
  return (
    <AppShell activePath="/try-on-new">
      <div className="grid gap-12">
        <ProductPageHero route="/try-on-new" />
        <ProductWorkflowRibbon route="/try-on-new" />
        <section id="tryon-workspace" className="scroll-mt-32">
          <TryOnStudioPanel />
        </section>
      </div>
    </AppShell>
  );
}
