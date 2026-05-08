import { AppShell } from "@/components/shared/AppShell";
import { StyleProfileEditor } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function StyleProfilePage() {
  return (
    <AppShell activePath="/style-profile-new">
      <div className="grid gap-8">
        <SectionHeading
          eyebrow="风格档案"
          title="把模糊的喜欢，变成可计算的风格规则"
          description="维护风格标签、色彩偏好、体型信息和场景权重，让推荐不只是好看，而是适合你。"
        />
        <StyleProfileEditor />
      </div>
    </AppShell>
  );
}
