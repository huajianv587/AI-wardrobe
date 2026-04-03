import { AppShell } from "@/components/ui/app-shell";

const sections = [
  {
    title: "我们收集什么",
    body: "当你注册、登录、上传单品、保存搭配、记录穿搭或编辑风格画像时，系统会保存与这些操作直接相关的账号信息、衣橱信息、穿搭记录和偏好数据。"
  },
  {
    title: "如何使用这些数据",
    body: "这些数据用于支撑你的私人衣橱管理、推荐排序、提醒生成、风格画像更新以及多端同步。未登录状态下的公开体验数据不会自动并入你的私人账号。"
  },
  {
    title: "第三方服务",
    body: "项目可能接入认证服务、对象存储、天气服务和外部 AI worker。只有在对应功能被调用时，相关最小必要数据才会被发送给这些服务。"
  },
  {
    title: "你的控制权",
    body: "你可以通过登录后的产品页面管理自己的衣橱、搭配和风格数据。部署到正式环境前，建议将所有密钥和服务凭证迁移到安全的环境变量或密钥管理系统。"
  }
];

export default function PrivacyPage() {
  return (
    <AppShell title="隐私政策" subtitle="关于账号信息、衣橱数据、推荐信号和第三方服务使用方式的说明。">
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.title} className="section-card rounded-[28px] p-6">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{section.body}</p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
