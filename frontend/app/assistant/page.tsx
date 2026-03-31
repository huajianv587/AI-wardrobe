import { AssistantDashboard } from "@/components/assistant/assistant-dashboard";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AssistantPage() {
  return (
    <AppShell title="Personal Assistant" subtitle="Weather-aware planning, low-thought outfit mode, wardrobe gap insight, style memory, and gentle care reminders in one place.">
      <SceneSection index={0} accent="mint" sticker="Feels like it knows you">
        <SectionHeading
          eyebrow="Assistant"
          title="让软件看起来像是真的懂你，而不是只会吐一套搭配"
          description="这一页把天气、地点、日程、风格画像、衣物记忆卡、提醒和反馈回流串成闭环，也为后续小程序和 App 复用同一套智能逻辑。"
        />
      </SceneSection>
      <SceneSection index={1} accent="sky" sticker="Soft planning loop">
        <AssistantDashboard />
      </SceneSection>
    </AppShell>
  );
}
