import Link from "next/link";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PageShell } from "./PageShell";

type Field = {
  label: string;
  type: string;
  placeholder: string;
};

type AuthPageProps = {
  mode: "login" | "register" | "reset";
};

const content = {
  login: {
    title: "欢迎回来",
    subtitle: "继续管理你的智能衣橱和私人风格档案。",
    button: "登录",
    alt: "还没有账号？",
    altHref: "/register",
    altLabel: "立即注册",
    fields: [
      { label: "邮箱", type: "email", placeholder: "you@example.com" },
      { label: "密码", type: "password", placeholder: "输入密码" },
    ],
  },
  register: {
    title: "创建 AI Wardrobe 账号",
    subtitle: "从今天开始，让每件衣服都被看见和使用。",
    button: "免费注册",
    alt: "已有账号？",
    altHref: "/login",
    altLabel: "去登录",
    fields: [
      { label: "邮箱", type: "email", placeholder: "you@example.com" },
      { label: "密码", type: "password", placeholder: "至少 8 位字符" },
      { label: "昵称", type: "text", placeholder: "你的称呼" },
    ],
  },
  reset: {
    title: "重置密码",
    subtitle: "输入注册邮箱，我们会发送安全重置链接。",
    button: "发送重置链接",
    alt: "想起来了？",
    altHref: "/login",
    altLabel: "返回登录",
    fields: [{ label: "邮箱", type: "email", placeholder: "you@example.com" }],
  },
} satisfies Record<
  AuthPageProps["mode"],
  {
    title: string;
    subtitle: string;
    button: string;
    alt: string;
    altHref: string;
    altLabel: string;
    fields: Field[];
  }
>;

export function AuthPage({ mode }: AuthPageProps) {
  const data = content[mode];

  return (
    <PageShell>
      <main className="grid min-h-screen items-center gap-10 px-6 pb-16 pt-32 md:grid-cols-2 md:px-10 lg:px-16">
        <section className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--brand-purple)]">
            AI Wardrobe
          </p>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-7xl">
            你的私人造型顾问，随时在线。
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
            上传衣橱、生成搭配、虚拟试穿，并把每一次选择沉淀成你的风格资产。
          </p>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[rgba(13,14,26,0.82)] p-6 shadow-[var(--shadow-float)] backdrop-blur-2xl md:p-8">
          <h2 className="text-3xl font-semibold tracking-[-0.03em]">{data.title}</h2>
          <p className="mt-3 text-[var(--text-secondary)]">{data.subtitle}</p>
          <form className="mt-8 grid gap-5">
            {data.fields.map((field) => (
              <label key={field.label} className="grid gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">{field.label}</span>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="min-h-12 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-brand)]"
                />
              </label>
            ))}
            <PremiumButton size="lg" fullWidth>
              {data.button}
            </PremiumButton>
          </form>
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            {data.alt}{" "}
            <Link href={data.altHref} className="text-[var(--brand-purple)] underline-offset-4 hover:underline">
              {data.altLabel}
            </Link>
          </p>
          {mode === "login" ? (
            <Link
              href="/reset-password"
              className="mt-3 inline-flex text-sm text-[var(--brand-purple)] underline-offset-4 hover:underline"
            >
              忘记密码？
            </Link>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}
