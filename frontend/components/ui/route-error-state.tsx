"use client";

import { useEffect } from "react";

interface RouteErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onHardRefresh?: () => void;
  error?: Error & { digest?: string };
}

export function RouteErrorState({
  title = "页面暂时没有加载成功",
  description = "我们已经拦住了这次异常。你可以先重试当前页面；如果问题持续，再刷新整个页面。",
  onRetry,
  onHardRefresh,
  error,
}: RouteErrorStateProps) {
  useEffect(() => {
    if (error) {
      console.error("route_error_boundary", error);
    }
  }, [error]);

  return (
    <main className="app-shell-root mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-14 md:px-6">
      <section className="section-card soft-panel w-full rounded-[32px] p-7 md:p-10">
        <div className="pill mb-4">稳定降级已接管</div>
        <h1 className="display-title text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">
          {description}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center rounded-full bg-[var(--ink-strong)] px-5 py-2.5 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
          >
            重试当前页面
          </button>
          <button
            type="button"
            onClick={onHardRefresh}
            className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/88 px-5 py-2.5 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            刷新整个页面
          </button>
        </div>
        {error?.digest ? (
          <p className="mt-5 text-xs text-[var(--muted)]">
            错误追踪编号：<span className="font-medium text-[var(--ink)]">{error.digest}</span>
          </p>
        ) : null}
      </section>
    </main>
  );
}
