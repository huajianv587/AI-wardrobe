import { AppShell } from "@/components/shared/AppShell";
import { ClosetInsightDashboard } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function ClosetAnalysisPage() {
  return (
    <AppShell activePath="/closet-analysis-new">
      <div className="grid gap-8">
        <SectionHeading
          eyebrow="衣橱分析"
          title="看清衣橱价值，也看清真正缺什么"
          description="把分类比例、色彩偏好、闲置提醒和购买建议转化为可执行的整理策略。"
        />
        <ClosetInsightDashboard />
      </div>
    </AppShell>
  );
}
