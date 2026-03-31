import { ShieldCheck } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AppShell } from "@/components/ui/app-shell";

export default function LoginPage() {
  return (
    <AppShell title="Account Space" subtitle="Supabase Auth now signs users into the backend, and every wardrobe query is scoped to the authenticated owner.">
      <section className="mx-auto grid max-w-5xl gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="section-card rounded-[34px] p-6">
          <div className="pill mb-4"><ShieldCheck className="size-4" />Private wardrobe data</div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Sign in to sync your style memory.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Your browser stores the Supabase access token locally, sends it to FastAPI as a Bearer token, and the backend mirrors the authenticated Supabase user into SQLite so wardrobe data stays isolated per user.</p>

          <div className="mt-6 space-y-3">
            {["Private wardrobe CRUD scoped to the signed-in owner", "Cross-device sync once Supabase backup is enabled", "Future avatar, try-on history, and recommendation records tied to the same account"].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)]">{item}</div>
            ))}
          </div>
        </article>

        <AuthPanel />
      </section>
    </AppShell>
  );
}
