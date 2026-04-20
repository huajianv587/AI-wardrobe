import { RecommendationPanel } from "@/components/outfit/recommendation-panel";
import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryPostcard } from "@/components/ui/story-postcard";

export default function RecommendPage() {
  return (
    <AppShell
      title="搭配推荐"
      subtitle="把天气、风格偏好、衣橱结构和最近穿着记录一起考虑，给出更贴近当天状态的推荐。"
    >
      <SceneSection index={0} accent="peach" sticker="像真的懂你">
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <SectionHeading
            eyebrow="Recommendation"
            title="推荐不只是找单品，更是在帮你找到今天最想呈现出来的自己。"
            description="这里会把衣橱现状、天气条件、通勤场景和你的风格记忆放在一起，让结果既能落地，也保留一点被轻轻理解的感觉。"
          />
          <div className="flex justify-start xl:justify-end">
            <StoryPostcard
              emoji="搭"
              eyebrow="recommendation tone"
              title="建议要可执行，也要有一点情绪温度。"
              description="所以推荐结果会同时保留理由、替换方案和轻提醒，避免只给你一组冷冰冰的单品清单。"
              chips={["天气同步", "替换方案", "风格记忆"]}
              tone="peach"
              compact
            />
          </div>
        </div>
      </SceneSection>
      <SceneSection index={1} accent="butter" sticker="今天穿什么">
        <RecommendationPanel />
      </SceneSection>
    </AppShell>
  );
}
