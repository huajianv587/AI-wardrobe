import { ExperienceTemplateFrame } from "@/components/experience/template-frame";
import { loadExperienceTemplate } from "@/lib/experience-template";

export default async function SmartWardrobePage() {
  const html = await loadExperienceTemplate("smart-wardrobe.html");
  return <ExperienceTemplateFrame html={html} title="智能衣物" />;
}
