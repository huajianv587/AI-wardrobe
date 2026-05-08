import { AppShell } from "@/components/shared/AppShell";
import { DiaryTimeline } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function OutfitDiaryPage() {
  return (
    <AppShell activePath="/outfit-diary-new">
      <div className="grid gap-10">
        <SectionHeading
          eyebrow="穿搭日记"
          title="记录每天穿什么，也记录为什么喜欢"
          description="把天气、场景、心情、满意度和复穿按钮放进同一条时间线，让 AI 越用越懂你。"
        />
        <DiaryTimeline />
      </div>
    </AppShell>
  );
}
