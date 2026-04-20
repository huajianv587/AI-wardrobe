"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { NavBar } from "@/components/HeroSection/NavBar";
import { persistAuthSession } from "@/lib/auth-session";
import { fetchCurrentUserWithAccessToken, signInWithPassword, signUpWithPassword } from "@/lib/api";
import styles from "./auth-template-page.module.css";

type AuthTemplateMode = "login" | "register";

interface AuthTemplatePageProps {
  mode: AuthTemplateMode;
}

const loginOutfits = [
  {
    num: "Monday",
    colors: [
      { background: "#edddd7", border: "0.5px solid #dbc4bc" },
      { background: "#be7b6f" },
      { background: "#d4bfb8" }
    ],
    name: "奶油通勤开场",
    tag: "白衬衫 · 烟粉裙"
  },
  {
    num: "Saturday",
    colors: [
      { background: "#c8d8d4", border: "0.5px solid #b0c5c0" },
      { background: "#8fa8a2" },
      { background: "#e8d4c0", border: "0.5px solid #d5c0a8" }
    ],
    name: "鼠尾草约会日",
    tag: "绿色针织 · 奶茶裙"
  },
  {
    num: "Today AI",
    colors: [
      { background: "#f0e0d4", border: "0.5px solid #ddc8b8" },
      { background: "#c9a882" },
      { background: "#e8e0d8", border: "0.5px solid #d0c8c0" }
    ],
    name: "今日 AI 推荐",
    tag: "登录后查看专属建议"
  }
] as const;

const registerFeatures = [
  "智能衣橱管理，告别‘又不知道穿什么’的慌乱。",
  "AI 搭配推荐，每天为你生成更贴合天气和心情的建议。",
  "虚拟试衣入口已经准备好，上传单品就能先看整体效果。",
  "云端同步更稳，衣橱数据会持续保留，不会轻易丢失。"
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
    title: "穿搭日记",
    copy: "这周已经轻轻记下了 3 套 look。",
    href: "/outfit-diary",
    tone: "rose" as const
  },
  {
    eyebrow: "STYLE RADAR",
    title: "风格雷达",
    copy: "柔雾粉、轻通勤和低饱和感正在慢慢发光。",
    href: "/style-profile",
    tone: "gold" as const
  }
] as const;

const registerFloatCards = [
  {
    eyebrow: "SMART LAB",
    title: "智能衣物",
    copy: "抠图、白底图和自动补全，会一起帮你收进流程里。",
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

function isInternalTestEmail(_email: string) {
  void _email;
  return false;
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
  const forgotLoading = false;
  const [forgotActionUrl, setForgotActionUrl] = useState("");
  const [forgotActionLabel, setForgotActionLabel] = useState("前往重设密码");

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
    const oauthErrorCode = hash.get("error_code") ?? "";
    const oauthError = hash.get("error_description") ?? hash.get("error");

    if (oauthError) {
      const message = oauthErrorCode === "otp_expired"
        ? "邮箱确认链接已失效，请重新获取新的确认邮件后再继续。"
        : decodeURIComponent(oauthError);
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

  useEffect(() => {
    if (!showForgot || typeof window === "undefined") {
      return;
    }

    const panel = document.querySelector(`.${styles.forgotPanel}`);
    const helperText = panel?.querySelector(`.${styles.forgotText}`);
    const actionButton = panel?.querySelector(`.${styles.forgotSubmit}`);

    if (helperText) {
      helperText.textContent = "输入邮箱后会直接跳到重设密码页面，无需再等确认邮件。";
    }

    if (actionButton instanceof HTMLButtonElement) {
      actionButton.textContent = "前往重设密码";
      actionButton.disabled = false;
    }
  }, [showForgot]);

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
        showLoginFeedback("登录成功，正在回到你的衣橱。", "success");
        window.setTimeout(() => {
          router.replace("/wardrobe");
        }, remembered ? 720 : 420);
        return;
      }

      showLoginFeedback(payload.message ?? "账号已经创建完成，现在可以直接登录。", "success");
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
        display_name: nickname.trim() || undefined,
        redirect_to: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined
      });

      if (payload.access_token) {
        persistAuthSession(payload);
        showRegisterFeedback("衣橱已经创建好，正在带你进入。", "success");
        window.setTimeout(() => {
          router.replace("/wardrobe");
        }, 720);
        return;
      }

      showRegisterFeedback(payload.message ?? "注册成功，正在带你前往登录页。", "success");
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
    beginDirectPasswordReset();
  }

  function beginDirectPasswordReset() {
    const email = forgotEmail.trim();
    setForgotActionUrl("");
    setForgotActionLabel("前往重设密码");

    if (!email || !email.includes("@")) {
      showLoginFeedback("请输入要重设密码的邮箱地址。", "error");
      return;
    }

    if (isInternalTestEmail(email)) {
      showLoginFeedback("这个邮箱看起来像内部测试地址，请换成你自己的注册邮箱。", "error");
      return;
    }

    const resetUrl = `/reset-password?email=${encodeURIComponent(email)}`;
    setForgotActionUrl(resetUrl);
    setForgotActionLabel("前往重设密码");
    setForgotEmail(email);
    setShowForgot(false);
    showLoginFeedback("无需等待邮件，马上带你进入重设密码页面。", "success");
    window.setTimeout(() => {
      router.push(resetUrl);
    }, 240);
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
        setForgotActionLabel("前往重设密码页面");
      }
      return next;
    });
  }

  function handleLoginKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || !target.closest("input")) return;
    event.preventDefault();
    if (showForgot && target.closest(`.${styles.forgotPanel}`)) {
      beginDirectPasswordReset();
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
    <div className={styles.root} data-variant={mode} data-testid={`auth-page-${mode}`}>
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
                  <span className={styles.seasonText}>欢迎回来</span>
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
                  <span className={styles.eyebrowText}>创建你的衣橱</span>
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
                    <div className={cn(styles.av, styles.av2)}>衣</div>
                    <div className={cn(styles.av, styles.av3)}>橱</div>
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
                  <span className={styles.formTag}>登录</span>
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
                    data-testid="login-email"
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
                    <button type="button" className={styles.fieldLabelLink} onClick={toggleForgotPassword} data-testid="forgot-password-toggle">
                      忘记密码？
                    </button>
                  </div>
                  <div className={styles.passwordShell}>
                    <input
                      data-testid="login-password"
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

                <button className={cn(styles.submitBtn, loginLoading && styles.submitBtnLoading)} type="button" onClick={() => void handleLogin()} disabled={loginLoading} data-testid="login-submit">
                  {loginLoading ? "登录中…" : "登录"}
                </button>

                <div className={cn(styles.forgotPanel, showForgot && styles.forgotPanelOpen)}>
                  <div className={styles.forgotText}>输入邮箱后会直接跳到重设密码页面，无需发送确认邮件。</div>
                  <input
                    data-testid="forgot-email"
                    className={styles.fieldInput}
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                  <button className={styles.forgotSubmit} type="button" onClick={() => void handleForgotPassword()} disabled={forgotLoading} data-testid="forgot-submit">
                    {forgotLoading ? "跳转中…" : "前往重设密码"}
                  </button>
                </div>

                {loginMessage ? (
                  <div className={cn(styles.message, loginMessageTone === "error" ? styles.messageError : styles.messageSuccess)}>
                    {loginMessage}
                  </div>
                ) : null}

                {forgotActionUrl ? (
                  <a className={styles.messageAction} href={forgotActionUrl} data-testid="forgot-action-link">
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
                  <span className={styles.formTag}>注册</span>
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
                    <input data-testid="register-nickname" className={styles.fieldInput} type="text" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="你的名字" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>性别（选填）</label>
                    <input data-testid="register-gender" className={styles.fieldInput} type="text" value={gender} onChange={(event) => setGender(event.target.value)} placeholder="不限" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>邮箱</label>
                  <input data-testid="register-email" className={styles.fieldInput} type="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} placeholder="you@example.com" />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>密码</label>
                  <input data-testid="register-password" className={styles.fieldInput} type="password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="至少 6 位" />
                  <div className={styles.pwStrength}>
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className={cn(styles.pwBar, index < passwordScore && styles.pwBarLit)} />
                    ))}
                  </div>
                </div>

                <div className={styles.agreement}>
                  <button type="button" className={cn(styles.checkBox, agreed && styles.checkBoxChecked)} onClick={() => setAgreed((current) => !current)} data-testid="register-agree" aria-label="同意协议">
                    <svg viewBox="0 0 12 12">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </button>
                  <div className={styles.agreeText}>
                    我已阅读并同意 <Link href="/terms">《用户协议》</Link> 和 <Link href="/privacy">《隐私政策》</Link>，了解数据将安全存储于云端
                  </div>
                </div>

                <button className={cn(styles.submitBtn, registerLoading && styles.submitBtnLoading)} type="button" onClick={() => void handleRegister()} disabled={registerLoading} data-testid="register-submit">
                  {registerLoading ? "创建中…" : "创建我的衣橱"}
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

