import { TryOnStudio } from "@/components/avatar-3d/try-on-studio";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryPostcard } from "@/components/ui/story-postcard";

export default function TryOnPage() {
  return (
    <AppShell title="Try-On Studio" subtitle="A 2.5D avatar workspace for compositing looks now, with room to plug in generated try-on imagery later.">
      <SceneSection index={0} accent="sky" sticker="Magnetic studio">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <SectionHeading eyebrow="2.5D MVP" title="Lower complexity, still expressive" description="This stage gives us a clean interaction surface for look composition without forcing full 3D cloth simulation in the first phase." />
          <div className="flex justify-start xl:justify-end">
            <StoryPostcard
              emoji="🧲"
              eyebrow="gesture note"
              title="The stage should feel like it wants the garment."
              description="That means a visible magnetic field, better momentum, and a little moment of delight when a piece clicks into place."
              chips={["snap-in", "soft inertia", "visual pull"]}
              tone="sky"
              compact
            />
          </div>
        </div>
      </SceneSection>
      <SceneSection index={1} accent="peach" sticker="Drag with feeling">
        <TryOnStudio />
      </SceneSection>
    </AppShell>
  );
}
