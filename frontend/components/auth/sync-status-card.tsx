"use client";

import { useEffect, useState } from "react";
import { Cloud, Database, LoaderCircle, RefreshCw } from "lucide-react";

import { useAuthSession } from "@/hooks/use-auth-session";
import { fetchSyncStatus, runWardrobeSync, SyncStatus } from "@/lib/api";

export function SyncStatusCard() {
  const { ready, isAuthenticated } = useAuthSession();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      setStatus(null);
      setMessage("");
      setError("");
      return;
    }

    let active = true;

    async function loadStatus() {
      setLoading(true);
      setError("");

      try {
        const payload = await fetchSyncStatus();
        if (active) {
          setStatus(payload);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load sync status.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, [ready, isAuthenticated]);

  async function handleManualSync() {
    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const result = await runWardrobeSync();
      const refreshed = await fetchSyncStatus();
      setStatus(refreshed);
      setMessage(result.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not run wardrobe sync.");
    } finally {
      setSyncing(false);
    }
  }

  if (!ready) {
    return (
      <article className="section-card rounded-[34px] p-6">
        <p className="pill mb-3">Account sync</p>
        <p className="text-sm leading-6 text-[var(--muted)]">Checking session before loading sync status.</p>
      </article>
    );
  }

  if (!isAuthenticated) {
    return (
      <article className="section-card rounded-[34px] p-6">
        <p className="pill mb-3">Account sync</p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Sync status appears after sign-in</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Once you authenticate, this panel will show cloud mode, per-user item counts, and the latest time your wardrobe metadata was mirrored to Supabase.</p>
      </article>
    );
  }

  return (
    <article className="section-card rounded-[34px] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="pill mb-3">
            {status?.cloud_enabled ? <Cloud className="size-4" /> : <Database className="size-4" />}
            Sync status
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Local-first + cloud visibility</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">This reflects the currently signed-in user&apos;s private wardrobe, not a shared demo dataset.</p>
        </div>

        <button
          type="button"
          onClick={() => void handleManualSync()}
          disabled={syncing || loading}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/85 px-4 py-2 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing || loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mode</p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{status?.mode ?? "Loading..."}</p>
        </div>
        <div className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cloud sync</p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{status?.cloud_enabled ? "Enabled" : "Local only"}</p>
        </div>
        <div className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Items</p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{status?.items_total ?? 0} total</p>
        </div>
        <div className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cloud mirrored</p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]">{status?.items_synced_to_cloud ?? 0} items</p>
        </div>
      </div>

      {status ? (
        <div className="mt-5 space-y-3 rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="text-sm text-[var(--ink)]">Supabase bucket: <span className="font-medium">{status.storage_bucket ?? "not configured"}</span></p>
          <p className="text-sm text-[var(--ink)]">Metadata table: <span className="font-medium">{status.sync_table ?? "not configured"}</span></p>
          <p className="text-sm text-[var(--ink)]">Source images: <span className="font-medium">{status.items_with_source_image}</span> | Processed images: <span className="font-medium">{status.items_with_processed_image}</span></p>
          <p className="text-sm text-[var(--ink)]">Latest cloud sync: <span className="font-medium">{status.latest_cloud_sync_at ? new Date(status.latest_cloud_sync_at).toLocaleString() : "No successful cloud sync yet"}</span></p>
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}
    </article>
  );
}
