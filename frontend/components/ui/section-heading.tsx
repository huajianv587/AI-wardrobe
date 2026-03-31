interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-strong)]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}