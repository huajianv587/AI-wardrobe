import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/outfit-diary-new",
  eyebrow: "穿搭日记",
  title: "记录每天穿什么，也记录为什么喜欢",
  description: "把试衣、搭配、天气和心情保存成时间线，形成长期风格档案。",
  primaryAction: "记录今日穿搭",
  secondaryAction: "查看时间线",
  productTitle: "穿搭时间线",
  productSubtitle: "Outfit memory system",
  productVariant: "dashboard",
  tags: ["日历", "心情", "天气", "场景", "收藏"],
  stats: [
    { value: "67", label: "日记记录" },
    { value: "18", label: "连续打卡" },
    { value: "5", label: "常用场景" },
    { value: "9", label: "高赞搭配" },
  ],
  panels: [
    { title: "时间线", body: "按日期回看穿搭，快速复用高满意度方案。", meta: "Timeline" },
    { title: "情绪标签", body: "记录穿着时的状态，帮助 AI 学习你的真实偏好。", meta: "Mood" },
    { title: "月度总结", body: "自动总结最常穿色系、场景和闲置趋势。", meta: "Summary" },
  ],
};

export default function OutfitDiaryPage() {
  return <FunctionalPage config={config} />;
}
