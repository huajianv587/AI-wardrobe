import { LegalPage } from "@/components/shared/LegalPage";

const sections = [
  {
    heading: "我们收集的信息",
    body: "AI Wardrobe 会收集你主动提供的账号信息、衣橱图片、穿搭偏好与试衣记录，用于生成个性化搭配、管理衣橱和改进产品体验。",
  },
  {
    heading: "信息如何使用",
    body: "我们仅在提供核心功能、保障账号安全、分析产品质量和响应你的支持请求时使用这些信息。衣橱与试衣数据不会被出售给第三方。",
  },
  {
    heading: "数据控制",
    body: "你可以随时更新个人资料、删除衣物记录或请求导出账号数据。涉及模型生成的临时素材会按产品策略进行清理。",
  },
  {
    heading: "安全与联系",
    body: "我们使用访问控制、传输加密和最小化数据处理原则保护你的信息。如需删除账号或咨询隐私问题，请通过产品内支持入口联系我们。",
  },
];

export default function PrivacyPage() {
  return <LegalPage title="隐私政策" updatedAt="2026-05-08" sections={sections} />;
}
