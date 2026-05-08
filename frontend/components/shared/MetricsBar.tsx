type Metric = {
  value: string;
  label: string;
};

type MetricsBarProps = {
  metrics?: Metric[];
  className?: string;
};

const defaultMetrics: Metric[] = [
  { value: "10,000+", label: "活跃用户" },
  { value: "98%", label: "搭配满意度" },
  { value: "3 秒", label: "试衣生成" },
  { value: "50+", label: "风格模板" },
];

export function MetricsBar({ metrics = defaultMetrics, className = "" }: MetricsBarProps) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-4 shadow-[var(--shadow-card)] backdrop-blur-2xl ${className}`}
    >
      <div className="grid gap-4 md:grid-cols-4 md:divide-x md:divide-[var(--border-default)]">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-4 py-3 text-center">
            <div className="bg-[var(--gradient-brand-text)] bg-clip-text text-3xl font-semibold text-transparent md:text-4xl">
              {metric.value}
            </div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
