import { AppShell } from "@/components/shared/AppShell";
import { TryOnStudioPanel } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function TryOnPage() {
  return (
    <AppShell activePath="/try-on-new">
      <div className="grid gap-8">
        <SectionHeading
          eyebrow="虚拟试衣"
          title="上传一张照片，3 秒看到上身效果"
          description="左侧完成图片和单品输入，右侧即时预览试衣结果、历史版本和场景背景。"
        />
        <TryOnStudioPanel />
      </div>
    </AppShell>
  );
}
