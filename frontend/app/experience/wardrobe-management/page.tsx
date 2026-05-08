import { ExperiencePage } from "@/components/shared/ExperiencePage";

export default function WardrobeManagementExperiencePage() {
  return (
    <ExperiencePage
      eyebrow="Wardrobe Management"
      title="衣橱管理，从上传到搭配一步到位"
      description="把衣物录入、分类、筛选、维护和搭配推荐放到同一个工作台里，减少每天做决定的成本。"
      ctaHref="/wardrobe-new"
      ctaLabel="进入衣橱工作台"
      cardVariant="wardrobe"
      stats={[
        { value: "100%", label: "衣物数字化" },
        { value: "12", label: "管理分类" },
        { value: "3 秒", label: "AI 搜索" },
      ]}
      highlights={[
        { title: "批量上传", description: "支持快速录入单品并自动生成初始标签，适合第一次整理衣橱。" },
        { title: "清晰筛选", description: "以类别、颜色、场景和季节筛选，找到衣服不再依赖记忆。" },
        { title: "搭配联动", description: "衣物管理直接连到试衣和推荐，单品录入后马上参与搭配生成。" },
        { title: "衣橱复盘", description: "用穿着频次和闲置天数帮助你决定保留、修补、捐赠或补买。" },
      ]}
    />
  );
}
