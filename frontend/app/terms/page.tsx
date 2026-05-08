import { LegalPage } from "@/components/shared/LegalPage";

const sections = [
  {
    heading: "服务范围",
    body: "AI Wardrobe 提供衣橱管理、AI 搭配推荐、虚拟试衣、风格档案和相关演示体验。具体功能可能随产品迭代调整。",
  },
  {
    heading: "账号责任",
    body: "你需要保证注册信息真实有效，并对账号下的上传内容和操作负责。请勿上传侵犯他人权益、违法或不适合用于试衣生成的素材。",
  },
  {
    heading: "生成内容",
    body: "AI 生成的搭配建议和试衣结果仅作为参考，不构成专业造型、健康或消费建议。你应根据实际场景自行判断使用结果。",
  },
  {
    heading: "服务变更",
    body: "我们可能为安全、合规或产品质量原因调整、暂停或终止部分功能。重大变更会在合理范围内通过页面或产品内通知说明。",
  },
];

export default function TermsPage() {
  return <LegalPage title="服务条款" updatedAt="2026-05-08" sections={sections} />;
}
