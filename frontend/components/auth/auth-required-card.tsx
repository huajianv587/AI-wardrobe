import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

interface AuthRequiredCardProps {
  title: string;
  description: string;
}

export function AuthRequiredCard({ title, description }: AuthRequiredCardProps) {
  return (
    <section className="section-card rounded-[32px] p-6">
      <div className="pill mb-4">
        <LockKeyhole className="size-4" />
        Private space
      </div>
      <h3 className="text-2xl font-semibold text-[var(--ink-strong)]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
      >
        Open account space
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
