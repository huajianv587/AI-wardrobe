import { ExperienceTemplateFrame } from "@/components/experience/template-frame";
import { loadExperienceTemplate } from "@/lib/experience-template";

export default async function ClosetAnalysisPage() {
  const html = await loadExperienceTemplate("closet-analysis.html");

  return <ExperienceTemplateFrame html={html} title="衣橱分析" />;
}
