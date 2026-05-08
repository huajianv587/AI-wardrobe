import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/recommend-new",
  eyebrow: "搭配推荐",
  title: "让 AI 解释每一套搭配为什么适合你",
  description: "根据你的风格偏好、场景、天气和已有单品生成可执行搭配。",
  primaryAction: "生成推荐",
  secondaryAction: "调整偏好",
  productTitle: "AI 搭配推荐",
  productSubtitle: "DeepSeek styling planner",
  productVariant: "dashboard",
  tags: ["通勤", "约会", "休闲", "运动", "派对"],
  stats: [
    { value: "89", label: "推荐方案" },
    { value: "6", label: "今日可穿" },
    { value: "98%", label: "满意度" },
    { value: "12", label: "收藏搭配" },
  ],
  panels: [
    { title: "推荐理由", body: "每套搭配都解释色彩、廓形和场景适配逻辑。", meta: "Reasoning" },
    { title: "偏好设置", body: "可调节正式度、舒适度、亮色占比和露肤程度。", meta: "Preference" },
    { title: "一键试穿", body: "推荐结果可直接进入虚拟试衣，快速验证效果。", meta: "Try-on" },
  ],
};

export default function RecommendPage() {
  return <FunctionalPage config={config} />;
}
