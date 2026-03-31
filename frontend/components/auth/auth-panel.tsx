"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LogOut, LogIn, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

import { clearStoredSession, persistAuthSession, readStoredSession, updateStoredSessionUser } from "@/lib/auth-session";
import { ApiError, fetchCurrentUser, logoutAuthSession, signInWithPassword, signUpWithPassword } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";

type AuthMode = "login" | "sign-up";

export function AuthPanel() {
  const router = useRouter();
  const { ready, isAuthenticated, session, user } = useAuthSession();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setEmail((current) => current || user.email);
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = mode === "login"
        ? await signInWithPassword({ email, password })
        : await signUpWithPassword({ email, password });

      if (payload.access_token) {
        persistAuthSession(payload);
        setPassword("");
        setMessage(mode === "login" ? "Supabase Auth session is active. Redirecting to your wardrobe..." : payload.message ?? "Account created and signed in successfully.");
        router.push("/wardrobe");
        return;
      }

      clearStoredSession();
      setPassword("");
      setMessage(payload.message ?? "Account created. Check your inbox before signing in.");
      setMode("login");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshProfile() {
    setRefreshing(true);
    setError("");
    setMessage("");

    try {
      const currentUser = await fetchCurrentUser();
      updateStoredSessionUser(currentUser);
      setMessage("Session validated with the backend and user profile refreshed.");
    } catch (nextError) {
      const isUnauthorized = nextError instanceof ApiError && nextError.status === 401;

      if (isUnauthorized) {
        clearStoredSession();
        setMessage("The local session expired, so it was cleared. Please sign in again.");
      } else {
        setError(nextError instanceof Error ? nextError.message : "Could not refresh the current session.");
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    const currentSession = readStoredSession();

    try {
      if (currentSession?.access_token) {
        await logoutAuthSession(currentSession.refresh_token);
      }
    } catch {
      // Local session is still cleared even if server-side revoke fails.
    } finally {
      clearStoredSession();
      setPassword("");
      setMessage("Signed out on this device. Local tokens were cleared and the backend logout endpoint was notified.");
      setError("");
    }
  }

  const submitLabel = loading
    ? mode === "login"
      ? "Signing in..."
      : "Creating account..."
    : mode === "login"
      ? "Sign in with email"
      : "Create account";

  return (
    <article className="section-card soft-panel rounded-[34px] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="pill mb-3">
            <ShieldCheck className="size-4" />
            Supabase Auth
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">
            {isAuthenticated ? "Session connected" : "Private account access"}
          </h2>
        </div>

        <div className="flex gap-2 rounded-full border border-[var(--line)] bg-white/80 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm transition ${mode === "login" ? "bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]" : "text-[var(--ink)]"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`rounded-full px-4 py-2 text-sm transition ${mode === "sign-up" ? "bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]" : "text-[var(--ink)]"}`}
          >
            Sign up
          </button>
        </div>
      </div>

      {ready && isAuthenticated && session ? (
        <div className="mb-5 rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="pill mb-3">Current browser session</p>
          <p className="text-sm text-[var(--ink)]">
            Signed in as <span className="font-semibold">{session.user.email}</span>
          </p>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            Local user id: {session.user.id} | Supabase user id: {session.user.supabase_user_id ?? "pending sync"}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/wardrobe"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
            >
              Open wardrobe
              <ArrowRight className="size-4" />
            </Link>

            <button
              type="button"
              onClick={() => void handleRefreshProfile()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {refreshing ? "Refreshing..." : "Validate session"}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-rose)] bg-[var(--accent-rose)]/25 px-5 py-3 text-sm text-[var(--ink)]"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-white"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            minLength={6}
            className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-white"
            placeholder="At least 6 characters"
          />
        </label>

        <button
          type="submit"
          disabled={loading || email.trim().length === 0 || password.trim().length < 6}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
          {submitLabel}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--ink)]">
          {message}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
          Email and password are sent to the FastAPI backend, which proxies sign-in and sign-up to Supabase Auth, then mirrors the user into the local SQLite database for ownership isolation.
        </p>
      )}
    </article>
  );
}
