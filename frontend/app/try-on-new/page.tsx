import { AppShell } from "@/components/shared/AppShell";
import { TryOnStudioPanel } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function TryOnPage() {
  return (
    <AppShell activePath="/try-on-new">
      <div className="grid gap-10">
        <SectionHeading
          eyebrow="虚拟试衣"
          title="上传一张照片，3 秒看见上身效果"
          description="左侧完成图片、单品和场景输入，右侧保留大幅试衣结果，让视觉判断更直接。"
        />
        <TryOnStudioPanel />
      </div>
    </AppShell>
  );
}
