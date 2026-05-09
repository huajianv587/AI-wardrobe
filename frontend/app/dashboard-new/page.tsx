import { AppShell } from "@/components/shared/AppShell";
import {
  DashboardStats,
  DashboardHeroSpread,
  DashboardJourneyRail,
  ModelStatusSummary,
  NextActionBoard,
  ProductRouteIntro,
  QuickActionGrid,
  RecentActivityFeed,
} from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function DashboardPage() {
  return (
    <AppShell activePath="/dashboard-new">
      <div className="couture-dashboard-stack grid gap-12">
        <div className="couture-dashboard-block couture-dashboard-block-hero">
          <DashboardHeroSpread />
        </div>
        <div className="couture-dashboard-block couture-dashboard-block-journey">
          <DashboardJourneyRail />
        </div>
        <div className="couture-dashboard-block couture-dashboard-block-tasks">
          <NextActionBoard />
        </div>
        <div className="couture-dashboard-block couture-dashboard-block-stats">
          <DashboardStats />
        </div>
        <section className="couture-dashboard-block couture-dashboard-block-quick">
          <QuickActionGrid />
        </section>
        <section className="couture-dashboard-block couture-dashboard-block-map grid gap-7">
          <SectionHeading
            eyebrow="Full Product Map"
            title="按用户任务分流"
            description="导航和功能地图以衣橱试衣、搭配记忆、风格洞察、私人助手为大类。模型能力藏在流程背后，用户只需要按任务进入对应工作室。"
          />
          <ProductRouteIntro />
        </section>
        <section className="couture-dashboard-block couture-dashboard-block-activity grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
          <RecentActivityFeed />
          <ModelStatusSummary />
        </section>
      </div>
    </AppShell>
  );
}
