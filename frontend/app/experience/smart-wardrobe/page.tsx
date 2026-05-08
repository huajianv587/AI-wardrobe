import { ExperiencePage } from "@/components/shared/ExperiencePage";

export default function SmartWardrobeExperiencePage() {
  return (
    <ExperiencePage
      eyebrow="Smart Wardrobe"
      title="智能衣橱，把衣服变成可搜索资产"
      description="拍照上传后由 AI 自动分类、识别颜色材质并生成标签，让查找、搭配和管理都变快。"
      ctaHref="/wardrobe-new"
      ctaLabel="管理我的衣橱"
      cardVariant="wardrobe"
      stats={[
        { value: "50+", label: "自动标签" },
        { value: "3 秒", label: "单品录入" },
        { value: "98%", label: "分类准确率" },
      ]}
      highlights={[
        { title: "自动建档", description: "识别单品类型、主色、材质和季节，减少手动录入时间。" },
        { title: "多维筛选", description: "按颜色、场景、季节、品牌和使用频次快速定位任意衣物。" },
        { title: "组合推荐", description: "每件单品都能关联可搭配的上下装、外套、鞋包和配饰。" },
        { title: "维护提醒", description: "对清洗、保养和长期闲置单品给出提醒，提升衣橱利用率。" },
      ]}
    />
  );
}
