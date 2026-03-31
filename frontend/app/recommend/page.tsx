import { RecommendationPanel } from "@/components/outfit/recommendation-panel";
import { AppShell } from "@/components/ui/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export default function RecommendationPage() {
  return (
    <AppShell title="AI Styling Agent" subtitle="Scene-aware outfit generation designed around the Router 鈫?Retriever 鈫?Stylist 鈫?Verifier workflow.">
      <SectionHeading eyebrow="Recommendations" title="Prompt by occasion, mood, weather, or desired impression" description="The frontend is already shaped around your future LangGraph agent. Once the backend LLM is ready, the same UI can stream real results with minimal redesign." />
      <RecommendationPanel />
    </AppShell>
  );
}