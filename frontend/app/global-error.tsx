"use client";

import { RouteErrorState } from "@/components/ui/route-error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <RouteErrorState
          error={error}
          title="应用壳层暂时没有加载成功"
          description="这次异常发生在应用外层。先尝试重试；如果依然失败，再刷新整个页面重新进入。"
          onRetry={reset}
          onHardRefresh={() => window.location.reload()}
        />
      </body>
    </html>
  );
}
