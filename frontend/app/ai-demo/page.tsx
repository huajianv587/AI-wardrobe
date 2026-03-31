import { AiDemoConsole } from "@/components/ai/ai-demo-console";
import { AppShell } from "@/components/ui/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export default function AiDemoPage() {
  return (
    <AppShell title="AI Demo Lab" subtitle="Prototype every model path behind one API layer now, then swap in your own trained workers as they arrive.">
      <SectionHeading eyebrow="API-first" title="One product surface, many future model adapters" description="This demo page treats each model slot as an API contract first, so recommendation, cutout, classification, try-on, super-resolution, product rendering, and 3D preparation can all be upgraded independently later." />
      <AiDemoConsole />
    </AppShell>
  );
}
