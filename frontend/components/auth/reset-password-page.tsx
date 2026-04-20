"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NavBar } from "@/components/HeroSection/NavBar";
import { confirmPasswordReset } from "@/lib/api";
import styles from "./auth-template-page.module.css";

const ambientParticles = [
  { left: "10%", top: "18%", size: 10, delay: "0s", duration: "9.2s" },
  { left: "18%", top: "72%", size: 8, delay: "1.2s", duration: "10.8s" },
  { left: "32%", top: "28%", size: 12, delay: "2.4s", duration: "11.4s" },
  { left: "47%", top: "62%", size: 9, delay: "1.8s", duration: "9.8s" },
  { left: "64%", top: "16%", size: 11, delay: "3.2s", duration: "12.2s" },
  { left: "78%", top: "54%", size: 7, delay: "2.8s", duration: "9.6s" },
  { left: "88%", top: "24%", size: 10, delay: "0.9s", duration: "10.4s" }
] as const;

const helperCards = [
  {
    eyebrow: "ACCOUNT SAFETY",
    title: "拿回账号控制权",
    copy: "新密码保存后，旧密码和旧登录状态都会一起失效。",
    href: "/login",
    tone: "rose" as const
  },
  {
    eyebrow: "PRIVATE WARDROBE",
    title: "回到你的衣橱",
    copy: "每个邮箱都会独立对应自己的衣橱数据和历史记录。",
    href: "/wardrobe",
    tone: "gold" as const
  }
] as const;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createDateStamp() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  return formatter.format(now);
}

function strengthScore(password: string) {
  const length = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  let score = 0;

  if (length >= 6) score += 1;
  if (length >= 10) score += 1;
  if (hasUpper || hasNumber) score += 1;
  if (hasSpecial) score += 1;

  return score;
}

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStamp = useMemo(() => createDateStamp(), []);
  const resetToken = searchParams.get("token")?.trim() ?? "";
  const initialEmail = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryAccessToken, setRecoveryAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const passwordScore = strengthScore(newPassword);
  const hasResetCredential = Boolean(email.trim() || resetToken || recoveryAccessToken);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccessToken = hash.get("access_token") ?? "";
    const hashType = hash.get("type") ?? "";
    const hashError = hash.get("error_description") ?? hash.get("error");

    if (hashError) {
      setMessageTone("error");
      setMessage(decodeURIComponent(hashError));
      return;
    }

    if (hashAccessToken && (hashType === "recovery" || hashType === "invite" || hashType === "")) {
      setRecoveryAccessToken(hashAccessToken);
      setMessageTone("success");
      setMessage("重设凭证已经验证成功，请输入你的新密码。");
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      return;
    }

    if (resetToken) {
      setMessageTone("success");
      setMessage("请输入新密码，保存后就可以回到登录页继续使用。");
      return;
    }

    setMessageTone("error");
    setMessage("这个重设链接可能已经失效，请回到登录页重新申请。");
  }, [resetToken]);

  useEffect(() => {
    if (initialEmail) {
      setMessageTone("success");
      setMessage("已经识别到邮箱，可以直接设置新密码，无需再次等待邮件。");
      return;
    }

    if (!resetToken && !recoveryAccessToken) {
      setMessageTone("success");
      setMessage("请输入邮箱和新密码后直接保存。");
    }
  }, [initialEmail, recoveryAccessToken, resetToken]);

  async function handleSubmit() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessageTone("error");
      setMessage("请输入要重设密码的邮箱地址。");
      return;
    }

    if (newPassword.trim().length < 6) {
      setMessageTone("error");
      setMessage("新密码至少需要 6 位。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageTone("error");
      setMessage("两次输入的新密码不一致，请再检查一次。");
      return;
    }

    if (!hasResetCredential) {
      setMessageTone("error");
      setMessage("这个重设链接已经失效，请回到登录页重新申请。");
      return;
    }

    setLoading(true);

    try {
      const response = await confirmPasswordReset({
        email: normalizedEmail,
        token: resetToken || undefined,
        access_token: recoveryAccessToken || undefined,
        new_password: newPassword
      });
      setMessageTone("success");
      setMessage(response.message ?? "密码已经重设完成，请重新登录。");
      window.setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "密码重设失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root} data-variant="reset" data-testid="auth-page-reset">
      <div className={styles.fxLayer} aria-hidden>
        <span className={cn(styles.fxGlow, styles.fxGlowRose)} />
        <span className={cn(styles.fxGlow, styles.fxGlowGold)} />
        <span className={cn(styles.fxGlow, styles.fxGlowMist)} />
        {ambientParticles.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className={styles.spark}
            style={
              {
                "--spark-left": particle.left,
                "--spark-top": particle.top,
                "--spark-size": `${particle.size}px`,
                "--spark-delay": particle.delay,
                "--spark-duration": particle.duration
              } as CSSProperties
            }
          />
        ))}
      </div>

      <NavBar
        onNavigateHome={() => {
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      <div className={styles.page}>
        <div className={styles.brandSide}>
          <div className={styles.decoChar}>钥</div>

          <div className={styles.floatingStack}>
            {helperCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  styles.floatCard,
                  index === 0 ? styles.floatCardTop : styles.floatCardBottom,
                  card.tone === "rose" ? styles.floatCardRose : styles.floatCardGold
                )}
              >
                <span className={styles.floatEyebrow}>{card.eyebrow}</span>
                <strong>{card.title}</strong>
                <p>{card.copy}</p>
                <span className={styles.floatLink}>打开页面 →</span>
              </Link>
            ))}
          </div>

          <div className={styles.brandLead}>
            <div className={styles.seasonRow}>
              <div className={styles.seasonDot} />
              <span className={styles.seasonText}>密码恢复</span>
            </div>

            <div className={styles.dateStamp}>{dateStamp}</div>

            <h1 className={styles.greeting}>
              重新设置
              <br />
              你的<em>账号密码</em>
            </h1>

            <p className={styles.greetingSub}>
              保存新密码后，你就可以继续进入自己的专属衣橱。
              <br />
              旧密码和旧登录状态也会一起失效。
            </p>

            <div className={styles.metricRow}>
              <Link href="/login" className={styles.metricPill}>
                <span className={styles.metricValue}>登录</span>
                <span className={styles.metricLabel}>回到账号入口</span>
              </Link>
              <Link href="/register" className={styles.metricPill}>
                <span className={styles.metricValue}>注册</span>
                <span className={styles.metricLabel}>创建新邮箱账号</span>
              </Link>
              <Link href="/wardrobe" className={styles.metricPill}>
                <span className={styles.metricValue}>衣橱</span>
                <span className={styles.metricLabel}>回到个人数据页</span>
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.formSide}>
          <div className={styles.formCard}>
            <div className={styles.formCardGlow} aria-hidden />

            <div className={styles.formHeader}>
              <span className={styles.formTag}>重设密码</span>
              <div className={styles.formTitle}>设置一个新密码</div>
              <div className={styles.formDesc}>建议至少 6 位，并尽量混合数字、大小写或符号。</div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>邮箱</label>
              <input
                data-testid="reset-email"
                className={styles.fieldInput}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>新密码</label>
              <input
                data-testid="reset-new-password"
                className={styles.fieldInput}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="至少 6 位"
              />
              <div className={styles.pwStrength}>
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className={cn(styles.pwBar, index < passwordScore && styles.pwBarLit)} />
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>确认新密码</label>
              <input
                data-testid="reset-confirm-password"
                className={styles.fieldInput}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再输入一次新密码"
              />
            </div>

            <button
              className={cn(styles.submitBtn, loading && styles.submitBtnLoading)}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              data-testid="reset-submit"
            >
              {loading ? "保存中..." : "保存新密码"}
            </button>

            {message ? (
              <div className={cn(styles.message, messageTone === "error" ? styles.messageError : styles.messageSuccess)}>
                {message}
              </div>
            ) : null}

            <div className={styles.formFooter}>
              想起密码了？ <Link href="/login">返回登录</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
