import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/try-on-new",
  eyebrow: "虚拟试衣",
  title: "上传一张照片，3 秒看到上身效果",
  description: "AI 试衣把人像、服装和场景合成到同一个预览里，降低购买和搭配试错成本。",
  primaryAction: "开始试衣",
  secondaryAction: "选择单品",
  productTitle: "虚拟试衣结果",
  productSubtitle: "AI try-on studio",
  productVariant: "tryon",
  tags: ["人像上传", "服装选择", "背景替换", "结果保存"],
  stats: [
    { value: "3 秒", label: "平均生成" },
    { value: "45", label: "试衣记录" },
    { value: "92%", label: "轮廓贴合" },
    { value: "4K", label: "导出海报" },
  ],
  panels: [
    { title: "上传区", body: "支持人像和衣物快速上传，自动提示图片质量。", meta: "Upload" },
    { title: "结果展示", body: "试衣结果可保存、对比和继续生成更多版本。", meta: "Preview" },
    { title: "背景增强", body: "接入抠图和背景替换，让分享图更像正式大片。", meta: "Scene" },
  ],
};

export default function TryOnPage() {
  return <FunctionalPage config={config} />;
}
