"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LogOut, LogIn, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

import { clearStoredSession, persistAuthSession, readStoredSession, updateStoredSessionUser } from "@/lib/auth-session";
import { ApiError, fetchCurrentUser, logoutAuthSession, signInWithPassword, signUpWithPassword } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";

type AuthMode = "login" | "sign-up";

interface AuthPanelProps {
  defaultMode?: AuthMode;
}

export function AuthPanel({ defaultMode = "login" }: AuthPanelProps) {
  const router = useRouter();
  const { ready, isAuthenticated, session, user } = useAuthSession();

  const [mode, setMode] = useState<AuthMode>(defaultMode);
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

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

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
        setMessage(mode === "login" ? "登录成功，正在进入你的衣橱..." : payload.message ?? "注册成功，并已自动登录。");
        router.push("/wardrobe");
        return;
      }

      clearStoredSession();
      setPassword("");
      setMessage(payload.message ?? "账号已创建，请先完成邮箱确认再登录。");
      setMode("login");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "认证请求失败。");
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
      setMessage("会话已经通过后端验证，当前用户信息也已刷新。");
    } catch (nextError) {
      const isUnauthorized = nextError instanceof ApiError && nextError.status === 401;

      if (isUnauthorized) {
        clearStoredSession();
        setMessage("本地会话已经过期，已自动清理，请重新登录。");
      } else {
        setError(nextError instanceof Error ? nextError.message : "刷新当前会话失败。");
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
      setMessage("当前设备已经退出登录，本地令牌已清理，也已通知后端注销会话。");
      setError("");
    }
  }

  const submitLabel = loading
    ? mode === "login"
      ? "登录中..."
      : "注册中..."
    : mode === "login"
      ? "邮箱登录"
      : "创建账号";

  return (
    <article className="section-card soft-panel rounded-[34px] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="pill mb-3">
            <ShieldCheck className="size-4" />
            Supabase Auth
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">
            {isAuthenticated ? "账号已连接" : "私人账号入口"}
          </h2>
        </div>

        <div className="flex gap-2 rounded-full border border-[var(--line)] bg-white/80 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm transition ${mode === "login" ? "bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]" : "text-[var(--ink)]"}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`rounded-full px-4 py-2 text-sm transition ${mode === "sign-up" ? "bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]" : "text-[var(--ink)]"}`}
          >
            注册
          </button>
        </div>
      </div>

      {ready && isAuthenticated && session ? (
        <div className="mb-5 rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
          <p className="pill mb-3">当前浏览器会话</p>
          <p className="text-sm text-[var(--ink)]">
            当前登录账号 <span className="font-semibold">{session.user.email}</span>
          </p>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            本地用户 ID: {session.user.id} | Supabase 用户 ID: {session.user.supabase_user_id ?? "等待同步"}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/wardrobe"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
            >
              打开衣橱
              <ArrowRight className="size-4" />
            </Link>

            <button
              type="button"
              onClick={() => void handleRefreshProfile()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {refreshing ? "验证中..." : "验证会话"}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-rose)] bg-[var(--accent-rose)]/25 px-5 py-3 text-sm text-[var(--ink)]"
            >
              <LogOut className="size-4" />
              退出登录
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">邮箱</span>
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
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            minLength={6}
            className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-white"
            placeholder="至少 6 位"
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
          邮箱和密码会先发到 FastAPI，再代理给 Supabase Auth，并把认证后的用户镜像到本地 SQLite 数据库里，用来实现衣橱数据的用户隔离。
        </p>
      )}
    </article>
  );
}
