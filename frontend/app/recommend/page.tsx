import { RecommendationPanel } from "@/components/outfit/recommendation-panel";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function RecommendationPage() {
  return (
    <AppShell title="AI Styling Agent" subtitle="Scene-aware outfit generation designed around the Router -> Retriever -> Stylist -> Verifier workflow.">
      <SceneSection index={0} accent="lilac" sticker="Understands your vibe">
        <SectionHeading eyebrow="Recommendations" title="Prompt by occasion, mood, weather, or desired impression" description="The frontend is already shaped around your future LangGraph agent. Once the backend LLM is ready, the same UI can stream real results with minimal redesign." />
      </SceneSection>
      <SceneSection index={1} accent="peach" sticker="Feedback-aware">
        <RecommendationPanel />
      </SceneSection>
    </AppShell>
  );
}
