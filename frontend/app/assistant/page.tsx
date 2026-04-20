import { AssistantDashboard } from "@/components/assistant/assistant-dashboard";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryPostcard } from "@/components/ui/story-postcard";

export default function AssistantPage() {
  return (
    <AppShell
      title="个人助理"
      subtitle="把天气、行程、衣橱缺口、风格记忆和温柔提醒放进同一个工作台，让每天出门前的决定更轻一点。"
    >
      <SceneSection index={0} accent="mint" sticker="越用越懂你">
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <SectionHeading
            eyebrow="Assistant"
            title="让衣橱建议像真的懂你，而不是只会吐出一套搭配。"
            description="这里把天气、地点、日程、风格画像、衣物记忆卡、提醒和反馈回流串成闭环，也为后续小程序和 App 复用同一套智能逻辑留好了接口。"
          />
          <div className="flex justify-start xl:justify-end">
            <StoryPostcard
              emoji="提示"
              eyebrow="assistant cue"
              title="好的建议要先温柔，再足够聪明。"
              description="细小但自然的叙事和反馈，会让这个页面更像一位记得你习惯的衣橱搭子，而不是一台冷冰冰的工具。"
              chips={["温柔文案", "天气感知", "记忆驱动"]}
              tone="mint"
              compact
            />
          </div>
        </div>
      </SceneSection>
      <SceneSection index={1} accent="sky" sticker="柔软的计划回路">
        <AssistantDashboard />
      </SceneSection>
    </AppShell>
  );
}
