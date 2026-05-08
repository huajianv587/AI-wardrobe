import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/style-profile-new",
  eyebrow: "风格档案",
  title: "把模糊的喜欢，变成可计算的风格语言",
  description: "持续学习你的颜色、廓形、场景和舒适度偏好，形成私人造型规则。",
  primaryAction: "更新档案",
  secondaryAction: "查看标签",
  productTitle: "个人风格画像",
  productSubtitle: "Style profile graph",
  productVariant: "analysis",
  tags: ["优雅", "通勤", "低饱和", "利落", "舒适"],
  stats: [
    { value: "42%", label: "优雅指数" },
    { value: "38%", label: "休闲指数" },
    { value: "12", label: "核心标签" },
    { value: "6", label: "禁忌规则" },
  ],
  panels: [
    { title: "风格标签", body: "把日常选择沉淀成可解释的标签体系。", meta: "Tags" },
    { title: "色彩偏好", body: "自动识别你常穿、适合和需要补足的颜色。", meta: "Palette" },
    { title: "体型信息", body: "结合版型和试衣反馈，形成更稳定的搭配判断。", meta: "Fit" },
  ],
};

export default function StyleProfilePage() {
  return <FunctionalPage config={config} />;
}
