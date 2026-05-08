import type { ReactNode } from "react";
import { VersionBadge } from "./VersionBadge";

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
    <div
      className={`${
        align === "center" ? "mx-auto text-center" : ""
      } max-w-3xl ${className}`}
    >
      {eyebrow ? (
        <div className={align === "center" ? "mb-5 flex justify-center" : "mb-5"}>
          <VersionBadge>{eyebrow}</VersionBadge>
        </div>
      ) : null}
      <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)] md:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 text-pretty text-base leading-8 text-[var(--text-secondary)] md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
