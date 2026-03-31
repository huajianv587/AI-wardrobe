"use client";

import { useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { demoLogin, DemoLoginResponse } from "@/lib/api";

export function DemoLoginPanel() {
  const [email, setEmail] = useState("demo@ai-wardrobe.local");
  const [password, setPassword] = useState("demo-password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<DemoLoginResponse | null>(null);

  async function handleDemoLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await demoLogin();
      setSession(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Demo login failed.");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="section-card rounded-[34px] p-6">
      <form onSubmit={handleDemoLogin} className="space-y-4">
        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]" />
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]" />
        </label>

        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {loading ? "Contacting backend..." : "Use demo login"}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {session ? (
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="pill mb-3">Backend auth reachable</p>
          <p className="text-sm text-[var(--ink)]">Signed in as <span className="font-semibold">{session.user.email}</span>.</p>
          <p className="mt-2 break-all text-xs text-[var(--muted)]">Token: {session.access_token}</p>
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">This keeps the UI honest: the button now hits the FastAPI auth placeholder instead of only showing static UI.</p>
      )}
    </article>
  );
}