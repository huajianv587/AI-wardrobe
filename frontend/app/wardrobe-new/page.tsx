import { AppShell } from "@/components/shared/AppShell";
import { ProductPageHero, ProductWorkflowRibbon, WardrobeGrid } from "@/components/shared/ProductModules";

export default function WardrobePage() {
  return (
    <AppShell activePath="/wardrobe-new">
      <div className="grid gap-12">
        <ProductPageHero route="/wardrobe-new" />
        <ProductWorkflowRibbon route="/wardrobe-new" />
        <section id="wardrobe-workspace" className="scroll-mt-32">
          <WardrobeGrid />
        </section>
      </div>
    </AppShell>
  );
}
