import { ExperienceTemplateFrame } from "@/components/experience/template-frame";
import { loadExperienceTemplate } from "@/lib/experience-template";

export default async function OutfitDiaryPage() {
  const html = await loadExperienceTemplate("outfit-diary.html");

  return <ExperienceTemplateFrame html={html} title="穿搭日志" />;
}
