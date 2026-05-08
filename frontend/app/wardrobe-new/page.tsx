import { FunctionalPage, type FunctionalPageConfig } from "@/components/shared/FunctionalPage";

const config: FunctionalPageConfig = {
  route: "/wardrobe-new",
  eyebrow: "我的衣橱",
  title: "把所有单品变成可搜索的精品店",
  description: "拍照上传后，AI 自动识别类别、颜色、季节和适用场景。",
  primaryAction: "上传新衣物",
  secondaryAction: "批量整理",
  productTitle: "衣橱管理界面",
  productSubtitle: "Smart closet inventory",
  productVariant: "wardrobe",
  tags: ["上衣", "外套", "裙装", "鞋履", "配饰"],
  stats: [
    { value: "128", label: "衣物总数" },
    { value: "24", label: "智能标签" },
    { value: "15", label: "闲置提醒" },
    { value: "8", label: "新入库" },
  ],
  panels: [
    { title: "自动分类", body: "上传后自动识别单品类型，不再手动建目录。", meta: "Classify" },
    { title: "快速筛选", body: "按颜色、季节、场景和风格标签快速定位。", meta: "Filter" },
    { title: "利用率提醒", body: "找出被遗忘的衣服，并加入今日搭配推荐。", meta: "Reuse" },
  ],
};

export default function WardrobePage() {
  return <FunctionalPage config={config} />;
}
