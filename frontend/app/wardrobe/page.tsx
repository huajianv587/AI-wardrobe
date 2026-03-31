import { WardrobeWorkspace } from "@/components/wardrobe/wardrobe-workspace";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function WardrobePage() {
  return (
    <AppShell title="Digital Wardrobe" subtitle="Browse, search, upload, edit, and sync pieces so the recommender can reason over a wardrobe that actually exists.">
      <SceneSection index={0} accent="peach" sticker="Your quiet closet">
        <SectionHeading eyebrow="Wardrobe" title="Real item flow, now with cloud backup and AI cleanup" description="This workspace talks to FastAPI first, keeps a graceful local fallback, backs assets up to Supabase when configured, and can call a real cleanup service or fall back to the local placeholder flow." />
      </SceneSection>
      <SceneSection index={1} accent="mint" sticker="Touch-friendly flow">
        <WardrobeWorkspace />
      </SceneSection>
    </AppShell>
  );
}
