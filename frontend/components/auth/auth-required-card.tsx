import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { StoryCluster } from "@/components/ui/story-cluster";

interface AuthRequiredCardProps {
  title: string;
  description: string;
}

export function AuthRequiredCard({ title, description }: AuthRequiredCardProps) {
  return (
    <section className="section-card playful-empty rounded-[32px] p-6">
      <div className="floating-orb mx-auto mb-3 flex size-[4.5rem] items-center justify-center rounded-[26px] bg-white/92 shadow-[var(--shadow-soft)]">
        <LockKeyhole className="size-7 text-[var(--accent)]" />
      </div>
      <div className="mb-2 flex justify-center">
        <StoryCluster emoji="🔐" title="safe closet" chips={["private looks", "gentle sync", "just for you"]} tone="peach" compact />
      </div>
      <div className="pill mb-4">Private space</div>
      <h3 className="text-2xl font-semibold text-[var(--ink-strong)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
      >
        前往登录页
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
