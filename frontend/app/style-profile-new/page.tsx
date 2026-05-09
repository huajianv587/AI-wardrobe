import { AppShell } from "@/components/shared/AppShell";
import { ProductPageHero, ProductWorkflowRibbon, StyleProfileEditor } from "@/components/shared/ProductModules";

export default function StyleProfilePage() {
  return (
    <AppShell activePath="/style-profile-new">
      <div className="grid gap-12">
        <ProductPageHero route="/style-profile-new" />
        <ProductWorkflowRibbon route="/style-profile-new" />
        <section id="profile-workspace" className="scroll-mt-32">
          <StyleProfileEditor />
        </section>
      </div>
    </AppShell>
  );
}
