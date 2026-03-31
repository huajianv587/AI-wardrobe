interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="display-title text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">{description}</p>
    </div>
  );
}
