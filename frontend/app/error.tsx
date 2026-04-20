"use client";

import { RouteErrorState } from "@/components/ui/route-error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      error={error}
      onRetry={reset}
      onHardRefresh={() => window.location.reload()}
    />
  );
}
