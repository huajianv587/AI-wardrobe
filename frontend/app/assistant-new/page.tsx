import { AppShell } from "@/components/shared/AppShell";
import { AssistantWorkspace, ProductPageHero, ProductWorkflowRibbon } from "@/components/shared/ProductModules";

export default function AssistantNewPage() {
  return (
    <AppShell activePath="/assistant-new">
      <div className="grid gap-12">
        <ProductPageHero route="/assistant-new" />
        <ProductWorkflowRibbon route="/assistant-new" />
        <section id="assistant-workspace" className="scroll-mt-32">
          <AssistantWorkspace />
        </section>
      </div>
    </AppShell>
  );
}
