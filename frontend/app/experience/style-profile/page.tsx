import { ExperiencePage } from "@/components/shared/ExperiencePage";

export default function StyleProfileExperiencePage() {
  return (
    <ExperiencePage
      eyebrow="Style Profile"
      title="风格档案，让推荐真正属于你"
      description="把颜色偏好、版型偏好、体型信息和生活场景统一成一个可学习的个人风格模型。"
      ctaHref="/style-profile-new"
      ctaLabel="完善风格档案"
      stats={[
        { value: "24", label: "风格标签" },
        { value: "8", label: "核心场景" },
        { value: "1:1", label: "私人偏好模型" },
      ]}
      highlights={[
        { title: "偏好画像", description: "记录喜欢和不喜欢的颜色、版型、材质和搭配语气。" },
        { title: "体型适配", description: "结合身高、比例和穿着目标，过滤不适合的搭配建议。" },
        { title: "动态学习", description: "根据试穿反馈、日记记录和收藏行为持续更新推荐权重。" },
        { title: "场景优先", description: "让工作、通勤、旅行、派对等场景拥有不同的搭配策略。" },
      ]}
    />
  );
}
