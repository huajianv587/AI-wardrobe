"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Cormorant_Garamond, Lato, Noto_Serif_SC } from "next/font/google";

import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { NavBar } from "@/components/HeroSection/NavBar";
import { persistAuthSession } from "@/lib/auth-session";
import { fetchCurrentUserWithAccessToken, fetchOAuthStartUrl, requestPasswordReset, signInWithPassword, signUpWithPassword } from "@/lib/api";
import styles from "./auth-template-page.module.css";

type AuthTemplateMode = "login" | "register";

interface AuthTemplatePageProps {
  mode: AuthTemplateMode;
}

const INTERNAL_TEST_EMAIL_DOMAINS = ["ai-wardrobe.dev", "mini.ai-wardrobe.dev"];

const serifCn = Noto_Serif_SC({
  weight: ["200", "300", "400"],
  subsets: ["latin"],
  variable: "--font-auth-serif-cn"
});

const serifEn = Cormorant_Garamond({
  weight: ["300"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-auth-serif-en"
});

const authSans = Lato({
  weight: ["300", "400"],
  subsets: ["latin"],
  variable: "--font-auth-sans"
});

const loginOutfits = [
  {
    num: "Monday",
    colors: [
      { background: "#edddd7", border: "0.5px solid #dbc4bc" },
      { background: "#be7b6f" },
      { background: "#d4bfb8" }
    ],
    name: "奶油通勤风",
    tag: "白衬衫 · 烟粉裙"
  },
  {
    num: "Saturday",
    colors: [
      { background: "#c8d8d4", border: "0.5px solid #b0c5c0" },
      { background: "#8fa8a2" },
      { background: "#e8d4c0", border: "0.5px solid #d5c0a8" }
    ],
    name: "Sage 约会日",
    tag: "绿色针织 · 奶茶裤"
  },
  {
    num: "Today AI",
    colors: [
      { background: "#f0e0d4", border: "0.5px solid #ddc8b8" },
      { background: "#c9a882" },
      { background: "#e8e0d8", border: "0.5px solid #d0c8c0" }
    ],
    name: "今日推荐",
    tag: "待你登录查看"
  }
] as const;

const registerFeatures = [
  "智能衣橱管理，告别「不知道穿什么」",
  "AI 搭配推荐，每日生成专属今日穿搭",
  "虚拟试衣间，上传单品即可预览效果",
  "云端同步，数据永久保存不丢失"
] as const;

const ambientParticles = [
  { left: "10%", top: "18%", size: 10, delay: "0s", duration: "9.2s" },
  { left: "18%", top: "72%", size: 8, delay: "1.2s", duration: "10.8s" },
  { left: "32%", top: "28%", size: 12, delay: "2.4s", duration: "11.4s" },
  { left: "47%", top: "62%", size: 9, delay: "1.8s", duration: "9.8s" },
  { left: "64%", top: "16%", size: 11, delay: "3.2s", duration: "12.2s" },
  { left: "78%", top: "54%", size: 7, delay: "2.8s", duration: "9.6s" },
  { left: "88%", top: "24%", size: 10, delay: "0.9s", duration: "10.4s" }
] as const;

const loginFloatCards = [
  {
    eyebrow: "WARDROBE DIARY",
    title: "穿搭日历",
    copy: "本周已经轻轻记下 3 套 look。",
    href: "/outfit-diary",
    tone: "rose" as const
  },
  {
    eyebrow: "STYLE RADAR",
    title: "风格雷达",
    copy: "柔雾粉、轻通勤、低饱和感正在发光。",
    href: "/style-profile",
    tone: "gold" as const
  }
] as const;

const registerFloatCards = [
  {
    eyebrow: "SMART LAB",
    title: "智能衣物",
    copy: "抠图、白底图、自动补全一次收进来。",
    href: "/smart-wardrobe",
    tone: "rose" as const
  },
  {
    eyebrow: "WARDROBE FLOW",
    title: "衣橱管理",
    copy: "上传、整理、筛选和标签编辑都会顺手很多。",
    href: "/wardrobe",
    tone: "gold" as const
  }
] as const;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function isInternalTestEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return INTERNAL_TEST_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(`@${domain}`));
}

function createDateStamp() {
  const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const now = new Date();
  return `${now.getFullYear()} · ${months[now.getMonth()]} · 星期${days[now.getDay()]}`;
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: "#1877f2" }} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function AuthTemplatePage({ mode }: AuthTemplatePageProps) {
  const router = useRouter();
  const isLogin = mode === "login";
  const dateStamp = useMemo(() => createDateStamp(), []);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remembered, setRemembered] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [loginMessageTone, setLoginMessageTone] = useState<"success" | "error">("success");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotActionUrl, setForgotActionUrl] = useState("");
  const [forgotActionLabel, setForgotActionLabel] = useState("打开重置密码页面");

  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");
  const [registerMessageTone, setRegisterMessageTone] = useState<"success" | "error">("success");

  const passwordScore = strengthScore(registerPassword);
  const floatCards = isLogin ? loginFloatCards : registerFloatCards;
  const metricCards = isLogin
    ? [
        { value: "3", label: "本周 look", href: "/outfit-diary" },
        { value: "AI", label: "智能补全", href: "/smart-wardrobe" },
        { value: "云端", label: "同步状态", href: "/wardrobe" }
      ]
    : [
        { value: "上传", label: "从第一件开始", href: "/wardrobe" },
        { value: "识别", label: "AI 自动整理", href: "/smart-wardrobe" },
        { value: "记录", label: "穿搭与灵感", href: "/outfit-diary" }
      ];

  function showLoginFeedback(message: string, tone: "success" | "error" = "success") {
    setLoginMessageTone(tone);
    setLoginMessage(message);
  }

  function showRegisterFeedback(message: string, tone: "success" | "error" = "success") {
    setRegisterMessageTone(tone);
    setRegisterMessage(message);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const expiresAt = hash.get("expires_at");
    const expiresIn = hash.get("expires_in");
    const tokenType = hash.get("token_type") ?? "bearer";
    const oauthError = hash.get("error_description") ?? hash.get("error");

    if (oauthError) {
      const message = decodeURIComponent(oauthError);
      if (isLogin) {
        showLoginFeedback(message, "error");
      } else {
        showRegisterFeedback(message, "error");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!accessToken || !refreshToken || !expiresAt || !expiresIn) {
      return;
    }

    const finalAccessToken = accessToken;
    const finalRefreshToken = refreshToken;
    const finalExpiresAt = Number(expiresAt);
    const finalExpiresIn = Number(expiresIn);

    let cancelled = false;

    async function completeOAuthSession() {
      setLoginLoading(true);
      setRegisterLoading(true);

      try {
        const user = await fetchCurrentUserWithAccessToken(finalAccessToken);
        if (cancelled) {
          return;
        }

        persistAuthSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken,
          expires_at: finalExpiresAt,
          expires_in: finalExpiresIn,
          token_type: tokenType,
          requires_email_confirmation: false,
          message: null,
          user
        });

        if (isLogin) {
          showLoginFeedback("✓ 第三方登录成功，正在进入你的衣橱…");
        } else {
          showRegisterFeedback("✓ 第三方注册成功，正在进入你的衣橱…");
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        window.setTimeout(() => {
          router.replace("/wardrobe");
        }, 360);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "第三方登录未能完成，请稍后再试。";
        if (isLogin) {
          showLoginFeedback(message, "error");
        } else {
          showRegisterFeedback(message, "error");
        }
      } finally {
        if (!cancelled) {
          setLoginLoading(false);
          setRegisterLoading(false);
        }
      }
    }

    void completeOAuthSession();

    return () => {
      cancelled = true;
    };
  }, [isLogin, router]);

  async function handleLogin() {
    const validEmail = loginEmail.trim().length > 0 && loginEmail.includes("@");
    const validPassword = loginPassword.trim().length > 0;

    setLoginEmailError(!validEmail);
    setLoginPasswordError(!validPassword);
    setLoginMessage("");

    if (!validEmail || !validPassword) {
      return;
    }

    setLoginLoading(true);

    try {
      const payload = await signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (payload.access_token) {
        persistAuthSession(payload);
        showLoginFeedback("✓ 登录成功，正在回到你的衣橱…");
        window.setTimeout(() => {
          router.replace("/wardrobe");
        }, remembered ? 720 : 420);
        return;
      }

      showLoginFeedback(payload.message ?? "账号已创建，请先完成邮箱确认。");
    } catch (error) {
      showLoginFeedback(error instanceof Error ? error.message : "登录失败，请稍后再试。", "error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister() {
    const validEmail = registerEmail.trim().length > 0 && registerEmail.includes("@");
    const validPassword = registerPassword.trim().length >= 6;

    setRegisterMessage("");

    if (!validEmail) {
      showRegisterFeedback("请输入有效的邮箱地址。", "error");
      return;
    }

    if (!validPassword) {
      showRegisterFeedback("密码至少需要 6 位。", "error");
      return;
    }

    if (!agreed) {
      showRegisterFeedback("请先同意《用户协议》和《隐私政策》。", "error");
      return;
    }

    setRegisterLoading(true);

    try {
      const payload = await signUpWithPassword({
        email: registerEmail.trim(),
        password: registerPassword,
        display_name: nickname.trim() || undefined
      });

      if (payload.access_token) {
        persistAuthSession(payload);
        showRegisterFeedback("✓ 衣橱已经创建，正在带你进入。");
        window.setTimeout(() => {
          router.replace("/wardrobe");
        }, 720);
        return;
      }

      showRegisterFeedback(payload.message ?? "注册成功，请先完成邮箱确认，再回来登录。");
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      showRegisterFeedback(error instanceof Error ? error.message : "注册失败，请稍后再试。", "error");
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleForgotPassword() {
    const email = forgotEmail.trim();
    setForgotActionUrl("");
    setForgotActionLabel("打开重置密码页面");
    if (!email || !email.includes("@")) {
      showLoginFeedback("请先在重置面板里确认接收邮件的邮箱地址。", "error");
      return;
    }

    if (isInternalTestEmail(email)) {
      showLoginFeedback("这个邮箱看起来是内部测试地址，不能接收真实邮件。请改成你自己的注册邮箱。", "error");
      return;
    }

    setForgotLoading(true);

    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
      const response = await requestPasswordReset({
        email,
        redirect_to: redirectTo
      });
      showLoginFeedback(response.message ?? `密码重置邮件已发送到 ${email}。`);
      setForgotActionUrl(response.action_url ?? "");
      setForgotActionLabel(response.action_label ?? "打开重置密码页面");
      setForgotEmail("");
      setShowForgot(false);
    } catch (error) {
      showLoginFeedback(error instanceof Error ? error.message : "密码重置邮件发送失败，请稍后再试。", "error");
    } finally {
      setForgotLoading(false);
    }
  }

  function toggleForgotPassword() {
    setShowForgot((current) => {
      const next = !current;
      if (next) {
        setForgotEmail((existing) => {
          const trimmedExisting = existing.trim();
          if (trimmedExisting) {
            return trimmedExisting;
          }
          return loginEmail.trim();
        });
        setForgotActionUrl("");
        setForgotActionLabel("打开重置密码页面");
      }
      return next;
    });
  }

  async function handleSocialContinue(provider: "Google" | "Facebook") {
    const providerKey = provider.toLowerCase() as "google" | "facebook";
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}${isLogin ? "/login" : "/register"}` : undefined;

    try {
      const response = await fetchOAuthStartUrl(providerKey, redirectTo);
      if (typeof window !== "undefined") {
        window.location.href = response.url;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `${provider} 登录暂时不可用，请稍后再试。`;
      if (isLogin) {
        showLoginFeedback(message, "error");
      } else {
        showRegisterFeedback(message, "error");
      }
    }
  }

  function handleLoginKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || !target.closest("input")) return;
    event.preventDefault();
    if (showForgot && target.closest(`.${styles.forgotPanel}`)) {
      handleForgotPassword();
      return;
    }
    void handleLogin();
  }

  function handleRegisterKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || !target.closest("input")) return;
    event.preventDefault();
    void handleRegister();
  }

  return (
    <div className={cn(styles.root, authSans.variable, serifCn.variable, serifEn.variable)} data-variant={mode}>
      <AuthSessionBootstrap />

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
          <div className={styles.decoChar}>{isLogin ? "归" : "衣"}</div>

          <div className={styles.floatingStack}>
            {floatCards.map((card, index) => (
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
                <span className={styles.floatLink}>前往页面 →</span>
              </Link>
            ))}
          </div>

          {isLogin ? (
            <>
              <div className={styles.brandLead}>
                <div className={styles.seasonRow}>
                  <div className={styles.seasonDot} />
                  <span className={styles.seasonText}>Welcome back</span>
                </div>

                <div className={styles.dateStamp}>{dateStamp}</div>

                <h1 className={styles.greeting}>
                  你的衣橱
                  <br />
                  一直在<em>等你</em>。
                </h1>

                <p className={styles.greetingSub}>
                  上次离开后，又添了几件新单品？
                  <br />
                  今天的搭配，让我们一起来想。
                </p>

                <div className={styles.metricRow}>
                  {metricCards.map((metric) => (
                    <Link key={metric.label} href={metric.href} className={styles.metricPill}>
                      <span className={styles.metricValue}>{metric.value}</span>
                      <span className={styles.metricLabel}>{metric.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.brandTail}>
                <div className={styles.lastLook}>
                  <div className={styles.lastLookLabel}>上次的穿搭记录</div>
                  <div className={styles.outfitCards}>
                    {loginOutfits.map((outfit) => (
                      <div key={outfit.num} className={styles.outfitCard}>
                        <span className={styles.ocNum}>{outfit.num}</span>
                        <div className={styles.ocColors}>
                          {outfit.colors.map((color, index) => (
                            <div key={`${outfit.num}-${index}`} className={styles.ocDot} style={color} />
                          ))}
                        </div>
                        <div className={styles.ocName}>{outfit.name}</div>
                        <div className={styles.ocTag}>{outfit.tag}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.brandQuote}>
                  <div className={styles.quoteText}>
                    &quot;每一次打开衣橱，
                    <br />
                    都是和自己的一次对话。&quot;
                  </div>
                  <div className={styles.quoteAttr}>— 文文的衣橱 · WENWEN WARDROBE</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.brandLead}>
                <div className={styles.eyebrow}>
                  <div className={styles.eyebrowLine} />
                  <span className={styles.eyebrowText}>Create your wardrobe</span>
                </div>

                <h1 className={styles.brandTitle}>
                  从今天起，拥有
                  <br />
                  一间真正属于<em>你</em>的
                  <br />
                  云端衣橱。
                </h1>

                <p className={styles.brandSub}>
                  注册后，每一件衣服都会以你的
                  <br />
                  方式被记住、被搭配、被看见。
                </p>

                <div className={styles.metricRow}>
                  {metricCards.map((metric) => (
                    <Link key={metric.label} href={metric.href} className={styles.metricPill}>
                      <span className={styles.metricValue}>{metric.value}</span>
                      <span className={styles.metricLabel}>{metric.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.brandTail}>
                <div className={styles.featList}>
                  {registerFeatures.map((feature) => (
                    <div key={feature} className={styles.featItem}>
                      <div className={styles.featDot}>
                        <svg viewBox="0 0 12 12" aria-hidden="true">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </div>
                      <div className={styles.featText}>{feature}</div>
                    </div>
                  ))}
                </div>

                <div className={styles.socialProof}>
                  <div className={styles.avatars}>
                    <div className={cn(styles.av, styles.av1)}>文</div>
                    <div className={cn(styles.av, styles.av2)}>小</div>
                    <div className={cn(styles.av, styles.av3)}>云</div>
                  </div>
                  <div className={styles.spText}>
                    已有 <strong>2,400+</strong> 位用户
                    <br />
                    在整理她们的专属衣橱
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.formSide}>
          <div className={styles.formCard} onKeyDown={isLogin ? handleLoginKeyDown : handleRegisterKeyDown}>
            <div className={styles.formCardGlow} aria-hidden />

            {isLogin ? (
              <>
                <div className={styles.formHeader}>
                  <span className={styles.formTag}>Sign in</span>
                  <div className={styles.formTitle}>欢迎回来</div>
                  <div className={styles.formDesc}>游客态只展示演示记录，登录后会回到这个邮箱专属的独立衣橱。</div>
                </div>

                <div className={styles.formTabs}>
                  <Link className={styles.tabBtn} href="/register">
                    注册
                  </Link>
                  <Link className={cn(styles.tabBtn, styles.tabBtnActive)} href="/login" aria-current="page">
                    登录
                  </Link>
                </div>

                <div className={styles.accountNotice}>
                  未登录前这里展示的是游客预览数据。
                  <br />
                  登录后会进入当前邮箱对应的独立账号，数据不会和别的邮箱互通。
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>邮箱</label>
                  <input
                    className={cn(styles.fieldInput, loginEmailError && styles.fieldInputError)}
                    type="email"
                    value={loginEmail}
                    onChange={(event) => {
                      setLoginEmail(event.target.value);
                      setLoginEmailError(false);
                    }}
                    placeholder="you@example.com"
                  />
                  <div className={cn(styles.fieldHint, loginEmailError && styles.fieldHintShow)}>请输入有效的邮箱地址</div>
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldLabel}>
                    <span>密码</span>
                    <button type="button" className={styles.fieldLabelLink} onClick={toggleForgotPassword}>
                      忘记密码？
                    </button>
                  </div>
                  <div className={styles.passwordShell}>
                    <input
                      className={cn(styles.fieldInput, loginPasswordError && styles.fieldInputError)}
                      type={passwordVisible ? "text" : "password"}
                      value={loginPassword}
                      onChange={(event) => {
                        setLoginPassword(event.target.value);
                        setLoginPasswordError(false);
                      }}
                      placeholder="输入密码"
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setPasswordVisible((current) => !current)} aria-label="切换密码显示">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: passwordVisible ? 0.42 : 1 }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                  <div className={cn(styles.fieldHint, loginPasswordError && styles.fieldHintShow)}>密码不能为空</div>
                </div>

                <div className={styles.rememberRow}>
                  <button type="button" className={cn(styles.checkBox, remembered && styles.checkBoxChecked)} onClick={() => setRemembered((current) => !current)} aria-label="记住我">
                    <svg viewBox="0 0 12 12">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </button>
                  <span className={styles.rememberText}>记住我，7 天内免登录</span>
                </div>

                <button className={cn(styles.submitBtn, loginLoading && styles.submitBtnLoading)} type="button" onClick={() => void handleLogin()} disabled={loginLoading}>
                  {loginLoading ? "登录中…" : "登 录"}
                </button>

                <div className={styles.orRow}>
                  <div className={styles.orLine} />
                  <span className={styles.orText}>or continue with</span>
                  <div className={styles.orLine} />
                </div>

                <div className={styles.thirdGrid}>
                    <button className={styles.thirdBtn} type="button" onClick={() => void handleSocialContinue("Google")} disabled={loginLoading}>
                      <span className={styles.thirdIconWrap}>
                        <GoogleIcon />
                      </span>
                      Google
                    </button>
                  <button className={styles.thirdBtn} type="button" onClick={() => void handleSocialContinue("Facebook")} disabled={loginLoading}>
                    <span className={styles.thirdIconWrap}>
                      <FacebookIcon />
                    </span>
                    Facebook
                  </button>
                </div>

                <div className={cn(styles.forgotPanel, showForgot && styles.forgotPanelOpen)}>
                  <div className={styles.forgotText}>重置邮件会发送到下面这个邮箱，请先确认再发送</div>
                  <input
                    className={styles.fieldInput}
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  <button className={styles.forgotSubmit} type="button" onClick={() => void handleForgotPassword()} disabled={forgotLoading}>
                    {forgotLoading ? "发 送 中…" : "发 送 重 置 邮 件"}
                  </button>
                </div>

                {loginMessage ? (
                  <div className={cn(styles.message, loginMessageTone === "error" ? styles.messageError : styles.messageSuccess)}>
                    {loginMessage}
                  </div>
                ) : null}

                {forgotActionUrl ? (
                  <a className={styles.messageAction} href={forgotActionUrl}>
                    {forgotActionLabel}
                  </a>
                ) : null}

                <div className={styles.formFooter}>
                  还没有账号？ <Link href="/register">立即注册 →</Link>
                </div>
              </>
            ) : (
              <>
                <div className={styles.formHeader}>
                  <span className={styles.formTag}>Welcome</span>
                  <div className={styles.formTitle}>创建账号</div>
                  <div className={styles.formDesc}>注册后会为这个邮箱创建一间全新的独立衣橱，初始记录为 0。</div>
                </div>

                <div className={styles.formTabs}>
                  <Link className={cn(styles.tabBtn, styles.tabBtnActive)} href="/register" aria-current="page">
                    注册
                  </Link>
                  <Link className={styles.tabBtn} href="/login">
                    登录
                  </Link>
                </div>

                <div className={styles.accountNotice}>
                  注册前页面里的内容属于游客演示。
                  <br />
                  注册成功后，你会进入当前邮箱自己的全新账号，等待上传你的第一批衣物数据。
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>昵称</label>
                    <input className={styles.fieldInput} type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="你的名字" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>性别（选填）</label>
                    <input className={styles.fieldInput} type="text" value={gender} onChange={(event) => setGender(event.target.value)} placeholder="不限" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>邮箱</label>
                  <input className={styles.fieldInput} type="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} placeholder="you@example.com" />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>密码</label>
                  <input className={styles.fieldInput} type="password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="至少 6 位" />
                  <div className={styles.pwStrength}>
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className={cn(styles.pwBar, index < passwordScore && styles.pwBarLit)} />
                    ))}
                  </div>
                </div>

                <div className={styles.agreement}>
                  <button type="button" className={cn(styles.checkBox, agreed && styles.checkBoxChecked)} onClick={() => setAgreed((current) => !current)} aria-label="同意协议">
                    <svg viewBox="0 0 12 12">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </button>
                  <div className={styles.agreeText}>
                    我已阅读并同意 <Link href="/terms">《用户协议》</Link> 和 <Link href="/privacy">《隐私政策》</Link>，了解数据将安全存储于云端
                  </div>
                </div>

                <button className={cn(styles.submitBtn, registerLoading && styles.submitBtnLoading)} type="button" onClick={() => void handleRegister()} disabled={registerLoading}>
                  {registerLoading ? "创建中…" : "创 建 我 的 衣 橱"}
                </button>

                <div className={styles.orRow}>
                  <div className={styles.orLine} />
                  <span className={styles.orText}>or continue with</span>
                  <div className={styles.orLine} />
                </div>

                <button className={styles.singleThirdBtn} type="button" onClick={() => void handleSocialContinue("Google")} disabled={registerLoading}>
                  <span className={styles.thirdIconWrap}>
                    <GoogleIcon />
                  </span>
                  使用 Google 账号继续
                </button>

                {registerMessage ? (
                  <div className={cn(styles.message, registerMessageTone === "error" ? styles.messageError : styles.messageSuccess)}>
                    {registerMessage}
                  </div>
                ) : null}

                <div className={styles.formFooter}>
                  已有账号？ <Link href="/login">直接登录 →</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
