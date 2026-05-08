import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/dashboard-new",
  eyebrow: "今日穿搭",
  title: "今天的搭配，已经为你准备好",
  description: "结合天气、日程和衣橱状态，AI 每天生成最适合你的穿搭建议。",
  primaryAction: "生成今日穿搭",
  secondaryAction: "查看试衣记录",
  productTitle: "今日穿搭工作台",
  productSubtitle: "Weather-aware styling dashboard",
  productVariant: "dashboard",
  tags: ["22°C 晴", "通勤", "舒适", "低饱和"],
  stats: [
    { value: "6 套", label: "今日推荐" },
    { value: "98%", label: "匹配度" },
    { value: "12 次", label: "本周试衣" },
    { value: "3 件", label: "闲置唤醒" },
  ],
  panels: [
    { title: "天气感知", body: "自动把温度、降雨和通勤场景纳入搭配判断。", meta: "Weather" },
    { title: "最近试衣", body: "把上次保存的试穿结果继续用于今天的推荐排序。", meta: "History" },
    { title: "衣橱利用", body: "优先激活低频单品，减少重复购买和衣橱浪费。", meta: "Insight" },
  ],
};

export default function DashboardPage() {
  return <FunctionalPage config={config} />;
}
