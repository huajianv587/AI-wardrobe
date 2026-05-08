import { AppShell } from "@/components/shared/AppShell";
import {
  DashboardStats,
  QuickActionGrid,
  RecentActivityFeed,
  TodayOutfitPanel,
} from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function DashboardPage() {
  return (
    <AppShell activePath="/dashboard-new">
      <div className="grid gap-10">
        <SectionHeading
          eyebrow="今日穿搭"
          title="今天的搭配，已经为你准备好"
          description="结合天气、日程、衣橱状态和历史反馈，AI 会把最值得穿的方案放到工作台最前面。"
        />
        <TodayOutfitPanel />
        <DashboardStats />
        <section className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <div>
            <h2 className="mb-6 text-3xl font-semibold tracking-[-0.04em]">功能入口</h2>
            <QuickActionGrid />
          </div>
          <RecentActivityFeed />
        </section>
      </div>
    </AppShell>
  );
}
