import { ExperiencePage } from "@/components/shared/ExperiencePage";

export default function OutfitDiaryExperiencePage() {
  return (
    <ExperiencePage
      eyebrow="Outfit Diary"
      title="穿搭日记，记录真正适合你的选择"
      description="把每天的穿搭、天气、场景和反馈沉淀成风格记忆，帮助 AI 越用越懂你。"
      ctaHref="/outfit-diary-new"
      ctaLabel="查看穿搭日记"
      stats={[
        { value: "365", label: "年度穿搭记录" },
        { value: "4.9", label: "风格满意度" },
        { value: "18", label: "高频场景" },
      ]}
      highlights={[
        { title: "时间线记录", description: "按日期保存照片、单品、心情与场景，回看每一次搭配判断。" },
        { title: "风格复盘", description: "自动找出最常穿、最满意和最少使用的组合，为推荐提供反馈。" },
        { title: "场景标签", description: "通勤、约会、旅行、会议等场景被结构化记录，方便快速复用。" },
        { title: "复穿提醒", description: "当相似天气或日程出现时，AI 会推荐曾经表现稳定的搭配。" },
      ]}
    />
  );
}
