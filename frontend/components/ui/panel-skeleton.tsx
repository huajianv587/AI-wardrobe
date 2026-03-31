"use client";

interface PanelSkeletonProps {
  rows?: number;
}

export function PanelSkeleton({ rows = 3 }: PanelSkeletonProps) {
  return (
    <section className="section-card rounded-[30px] p-5">
      <div className="skeleton-shell rounded-[24px] p-5">
        <div className="skeleton-line h-5 w-28" />
        <div className="mt-4 skeleton-line h-9 w-3/4" />
        <div className="mt-3 skeleton-line h-4 w-full" />
        <div className="mt-2 skeleton-line h-4 w-5/6" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="rounded-[24px] bg-white/72 p-4">
              <div className="skeleton-line h-24 w-full rounded-[18px]" />
              <div className="mt-4 skeleton-line h-4 w-2/3" />
              <div className="mt-2 skeleton-line h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
