import { AssistantDashboard } from "@/components/assistant/assistant-dashboard";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryPostcard } from "@/components/ui/story-postcard";

export default function AssistantPage() {
  return (
    <AppShell title="Personal Assistant" subtitle="Weather-aware planning, low-thought outfit mode, wardrobe gap insight, style memory, and gentle care reminders in one place.">
      <SceneSection index={0} accent="mint" sticker="Feels like it knows you">
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <SectionHeading
            eyebrow="Assistant"
            title="让软件看起来像是真的懂你，而不是只会吐一套搭配"
            description="这一页把天气、地点、日程、风格画像、衣物记忆卡、提醒和反馈回流串成闭环，也为后续小程序和 App 复用同一套智能逻辑。"
          />
          <div className="flex justify-start xl:justify-end">
            <StoryPostcard
              emoji="☁️"
              eyebrow="assistant cue"
              title="Good recommendations sound warm before they sound smart."
              description="Tiny narrative touches help the product feel less like a tool and more like a wardrobe companion that actually notices patterns."
              chips={["gentle copy", "weather-aware", "memory-backed"]}
              tone="mint"
              compact
            />
          </div>
        </div>
      </SceneSection>
      <SceneSection index={1} accent="sky" sticker="Soft planning loop">
        <AssistantDashboard />
      </SceneSection>
    </AppShell>
  );
}
