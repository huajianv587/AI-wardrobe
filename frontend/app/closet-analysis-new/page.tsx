import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/closet-analysis-new",
  eyebrow: "衣橱分析",
  title: "看清衣橱价值，也看清真正缺什么",
  description: "用数据展示利用率、色彩结构、季节覆盖和购买建议。",
  primaryAction: "生成分析",
  secondaryAction: "导出报告",
  productTitle: "衣橱洞察报告",
  productSubtitle: "Closet intelligence",
  productVariant: "analysis",
  tags: ["利用率", "色彩分布", "季节覆盖", "闲置提醒"],
  stats: [
    { value: "72%", label: "衣橱利用率" },
    { value: "¥18k", label: "估算价值" },
    { value: "15", label: "闲置单品" },
    { value: "4", label: "购买建议" },
  ],
  panels: [
    { title: "数据图表", body: "用可视化展示类别占比、色彩偏好和季节分布。", meta: "Charts" },
    { title: "AI 洞察", body: "把数据翻译成具体建议，不只显示数字。", meta: "Insight" },
    { title: "购买建议", body: "推荐真正补齐衣橱缺口的单品，减少冲动消费。", meta: "Buy less" },
  ],
};

export default function ClosetAnalysisPage() {
  return <FunctionalPage config={config} />;
}
