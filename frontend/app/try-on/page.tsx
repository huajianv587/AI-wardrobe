import nextDynamic from "next/dynamic";

import { AppShell } from "@/components/ui/app-shell";
import { SceneSection } from "@/components/ui/scene-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryPostcard } from "@/components/ui/story-postcard";

const TryOnStudio = nextDynamic(
  () => import("@/components/avatar-3d/try-on-studio").then((module) => module.TryOnStudio),
  { ssr: false }
);

export const dynamic = "force-dynamic";

export default function TryOnPage() {
  return (
    <AppShell
      title="试衣工作台"
      subtitle="新解析出来的单品会直接同步到这里，支持全身照片舞台、2.5D 旋转预览，以及更稳定的拖拽与回退流程。"
    >
      <SceneSection index={0} accent="sky" sticker="磁吸试衣间">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <SectionHeading
            eyebrow="2.5D Stage"
            title="先把新单品直接拖上舞台，再决定今天要不要真的穿它。"
            description="这里优先服务“刚解析完成就立刻试穿看看”的链路，所以先用可旋转的 2.5D 舞台和用户全身照片贴图，保留后续接入更重试衣模型的空间。"
          />
          <div className="flex justify-start xl:justify-end">
            <StoryPostcard
              emoji="试"
              eyebrow="gesture note"
              title="舞台反馈要轻，但要让人立刻知道有没有穿上。"
              description="所以这里会保留磁吸、动量和轻微高光反馈，让新解析出来的衣服一贴上去就有“已经上身”的感觉。"
              chips={["新增优先", "磁吸拖拽", "直接上身"]}
              tone="sky"
              compact
            />
          </div>
        </div>
      </SceneSection>
      <SceneSection index={1} accent="peach" sticker="拖拽要有手感">
        <TryOnStudio />
      </SceneSection>
    </AppShell>
  );
}
