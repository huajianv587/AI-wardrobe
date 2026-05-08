import { AppShell } from "@/components/shared/AppShell";
import { RecommendationBoard } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function RecommendPage() {
  return (
    <AppShell activePath="/recommend-new">
      <div className="grid gap-8">
        <SectionHeading
          eyebrow="搭配推荐"
          title="让 AI 解释每一套搭配为什么适合你"
          description="推荐不再只是几张卡片，而是包含场景、天气、匹配理由、可替换单品和一键试穿。"
        />
        <RecommendationBoard />
      </div>
    </AppShell>
  );
}
