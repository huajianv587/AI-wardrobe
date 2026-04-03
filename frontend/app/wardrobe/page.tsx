import { ExperienceTemplateFrame } from "@/components/experience/template-frame";
import { loadExperienceTemplate } from "@/lib/experience-template";

export default async function WardrobePage() {
  const html = await loadExperienceTemplate("wardrobe-management.html");
  return <ExperienceTemplateFrame html={html} title="衣橱管理" />;
}
