import { TryOnStudio } from "@/components/avatar-3d/try-on-studio";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function TryOnPage() {
  return (
    <AppShell title="Try-On Studio" subtitle="A 2.5D avatar workspace for compositing looks now, with room to plug in generated try-on imagery later.">
      <SceneSection index={0} accent="sky" sticker="Magnetic studio">
        <SectionHeading eyebrow="2.5D MVP" title="Lower complexity, still expressive" description="This stage gives us a clean interaction surface for look composition without forcing full 3D cloth simulation in the first phase." />
      </SceneSection>
      <SceneSection index={1} accent="peach" sticker="Drag with feeling">
        <TryOnStudio />
      </SceneSection>
    </AppShell>
  );
}
