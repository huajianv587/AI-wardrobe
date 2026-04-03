import { Eye, LockOpen } from "lucide-react";

interface VisitorPreviewNoticeProps {
  title?: string;
  description: string;
}

export function VisitorPreviewNotice({
  title = "访客预览模式",
  description
}: VisitorPreviewNoticeProps) {
  return (
    <section className="section-card rounded-[30px] border border-[rgba(255,154,123,0.16)] bg-[linear-gradient(135deg,rgba(255,244,236,0.92),rgba(255,255,255,0.92),rgba(223,246,235,0.85))] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-[22px] bg-white/90 p-3 text-[var(--ink-strong)] shadow-[var(--shadow-soft)]">
            <Eye className="size-5" />
          </div>
          <div>
            <div className="pill mb-3">
              <LockOpen className="size-4" />
              {title}
            </div>
            <p className="text-sm leading-6 text-[var(--ink)]">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
