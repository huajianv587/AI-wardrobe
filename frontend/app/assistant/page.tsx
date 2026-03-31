import { AssistantDashboard } from "@/components/assistant/assistant-dashboard";
import { AppShell } from "@/components/ui/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AssistantPage() {
  return (
    <AppShell title="Personal Assistant" subtitle="Weather-aware planning, low-thought outfit mode, wardrobe gap insight, style memory, and gentle care reminders in one place.">
      <SectionHeading
        eyebrow="Assistant"
        title="让软件看起来像是真的懂你，而不是只会吐一套搭配"
        description="这一页把天气、地点、日程、风格画像、衣物记忆卡、提醒和反馈回流串成闭环，也为后续小程序和 App 复用同一套智能逻辑。"
      />
      <AssistantDashboard />
    </AppShell>
  );
}
