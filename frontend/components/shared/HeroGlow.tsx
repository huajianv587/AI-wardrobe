type HeroGlowProps = {
  className?: string;
};

export function HeroGlow({ className = "" }: HeroGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute left-1/2 top-[-18%] h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(49,57,251,0.22),transparent_70%)] blur-2xl" />
      <div className="absolute right-[-12%] top-[16%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(ellipse_60%_40%_at_80%_30%,rgba(200,168,255,0.12),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[-22%] left-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(240,160,192,0.08),transparent_66%)] blur-3xl" />
    </div>
  );
}
