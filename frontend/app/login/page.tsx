import { ShieldCheck } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SyncStatusCard } from "@/components/auth/sync-status-card";
import { AppShell } from "@/components/ui/app-shell";

export default function LoginPage() {
  return (
    <AppShell title="Account Space" subtitle="Supabase Auth now signs users into the backend, and every wardrobe query plus cloud sync status is scoped to the authenticated owner.">
      <section className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.85fr_1fr_0.95fr]">
        <article className="section-card story-gradient rounded-[34px] p-6">
          <div className="pill mb-4"><ShieldCheck className="size-4" />Private wardrobe data</div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Sign in to sync your style memory.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Your browser stores the Supabase access token locally, sends it to FastAPI as a Bearer token, and the backend mirrors the authenticated Supabase user into SQLite so wardrobe data stays isolated per user.</p>

          <div className="mt-6 grid gap-3">
            {["Private wardrobe CRUD scoped to the signed-in owner", "Cross-device sync once Supabase backup is enabled", "Future avatar, try-on history, and recommendation records tied to the same account"].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)]">{item}</div>
            ))}
          </div>

          <div className="ambient-divider my-5" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Auth source</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">Supabase</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Email + password today, with the same identity layer reused by web and mini program later.</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Data shape</p>
              <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">User isolated</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Wardrobe items, sync records, and future AI history all attach to the authenticated owner.</p>
            </div>
          </div>
        </article>

        <AuthPanel />
        <SyncStatusCard />
      </section>
    </AppShell>
  );
}
