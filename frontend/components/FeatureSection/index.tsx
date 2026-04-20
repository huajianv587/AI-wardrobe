"use client";

export function FeatureSection() {
  return (
    <section
      className="relative h-full min-h-[100svh] overflow-hidden bg-[var(--bg-primary)]"
      data-testid="home-third-screen"
      aria-label="首页第三屏"
    >
      <iframe
        title="首页第三屏"
        src="/home-third-screen.html?v=20260410-3"
        data-testid="home-third-screen-frame"
        className="absolute inset-0 h-full w-full border-0 bg-[var(--bg-primary)]"
      />
    </section>
  );
}
