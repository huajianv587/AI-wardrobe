import Link from "next/link";
import type { ReactNode } from "react";

type VersionBadgeProps = {
  children: ReactNode;
  href?: string;
  tone?: "new" | "v3" | "gold";
  className?: string;
};

export function VersionBadge({
  children,
  href,
  tone = "new",
  className = "",
}: VersionBadgeProps) {
  const toneClass = {
    new: "border-[var(--border-brand)] bg-[rgba(200,168,255,0.12)] text-[var(--brand-purple)]",
    v3: "border-[rgba(232,200,122,0.36)] bg-[rgba(232,200,122,0.12)] text-[var(--brand-gold)]",
    gold: "border-[rgba(232,200,122,0.36)] bg-[rgba(232,200,122,0.12)] text-[var(--brand-gold)]",
  }[tone];

  const content = (
    <span
      className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase backdrop-blur-xl ${toneClass} ${className}`}
    >
      {children}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
