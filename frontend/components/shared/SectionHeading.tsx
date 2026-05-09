import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-4xl ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-4 text-balance text-[clamp(30px,4vw,50px)] font-semibold leading-[1.06] tracking-normal text-[var(--couture-ink)]">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-[var(--couture-muted)] md:text-base md:leading-8">
          {description}
        </p>
      ) : null}
      <div className={`${align === "center" ? "mx-auto" : ""} mt-7 h-px w-24 bg-[var(--couture-line-strong)]`} />
    </div>
  );
}
