import { ShieldCheck } from "lucide-react";
import { DemoLoginPanel } from "@/components/auth/demo-login-panel";
import { AppShell } from "@/components/ui/app-shell";

export default function LoginPage() {
  return (
    <AppShell title="Account Space" subtitle="Prepared for Supabase Auth so each user keeps a private wardrobe, try-on history, and sync state across devices.">
      <section className="mx-auto grid max-w-5xl gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="section-card rounded-[34px] p-6">
          <div className="pill mb-4"><ShieldCheck className="size-4" />Private wardrobe data</div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Sign in to sync your style memory.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">The production target is Supabase Auth, but this page now already proves the frontend can talk to the backend auth endpoint and hold a basic session payload.</p>

          <div className="mt-6 space-y-3">
            {["Private user wardrobe and preferences", "Cross-device sync when cloud mode is enabled", "Future avatar model ownership and revision history"].map((item) => (
              <div key={item} className="rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm text-[var(--ink)]">{item}</div>
            ))}
          </div>
        </article>

        <DemoLoginPanel />
      </section>
    </AppShell>
  );
}