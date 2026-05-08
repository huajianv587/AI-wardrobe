import { AppShell } from "@/components/shared/AppShell";
import { WardrobeGrid } from "@/components/shared/ProductModules";
import { SectionHeading } from "@/components/shared/SectionHeading";

export default function WardrobePage() {
  return (
    <AppShell activePath="/wardrobe-new">
      <div className="grid gap-10">
        <SectionHeading
          eyebrow="我的衣橱"
          title="把所有单品变成可搜索的精品店"
          description="保留 V3 的搜索、分类、单品详情和上传流程，用更轻、更有呼吸感的画廊布局呈现。"
        />
        <WardrobeGrid />
      </div>
    </AppShell>
  );
}
