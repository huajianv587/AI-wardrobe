import { ExperiencePage } from "@/components/shared/ExperiencePage";

export default function ClosetAnalysisExperiencePage() {
  return (
    <ExperiencePage
      eyebrow="Closet Analysis"
      title="衣橱分析，把闲置和缺口一次看清"
      description="用数据拆解衣橱结构、色彩比例、季节覆盖和单品利用率，让每一次购买都有依据。"
      ctaHref="/closet-analysis-new"
      ctaLabel="打开衣橱分析"
      cardVariant="analysis"
      stats={[
        { value: "6", label: "核心维度" },
        { value: "82%", label: "单品利用洞察" },
        { value: "12", label: "补齐建议" },
      ]}
      highlights={[
        { title: "结构诊断", description: "自动识别上装、下装、外套、鞋包和配饰比例，标出过剩或不足分类。" },
        { title: "季节规划", description: "按温度、场景和色彩生成缺口建议，避免重复购买和长期闲置。" },
        { title: "AI 洞察", description: "将统计结果转化为可执行穿搭建议，给出下一步整理、搭配和采购策略。" },
        { title: "可视化面板", description: "用仪表盘方式呈现衣橱健康度、穿着频次和风格集中度。" },
      ]}
    />
  );
}
