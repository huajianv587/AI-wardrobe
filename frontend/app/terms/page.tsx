import { AppShell } from "@/components/ui/app-shell";

const sections = [
  {
    title: "服务说明",
    body: "文文的衣橱提供衣橱管理、智能整理、穿搭推荐、穿搭日志、风格画像和试衣工作台等功能。部分能力会根据你是否登录、是否接入外部 AI 服务以及当前系统状态，呈现私人数据、公开体验数据或降级结果。"
  },
  {
    title: "账号与数据",
    body: "登录后，你创建、上传、编辑和保存的内容会优先写入你的私人账号空间。未登录时，部分页面会读取公开体验数据，仅用于展示同一套产品流程，不视为你的私人存档。"
  },
  {
    title: "可用性与降级",
    body: "当外部模型、天气服务或图像处理服务不可用时，系统会优先保留页面流程和交互，并以降级结果继续返回，避免页面完全失效。"
  },
  {
    title: "使用边界",
    body: "请不要上传违法、侵权或含有敏感隐私的内容。你应确保对上传的服饰图片和素材拥有合法使用权。"
  }
];

export default function TermsPage() {
  return (
    <AppShell title="用户协议" subtitle="关于产品功能、账号数据、公开体验模式和使用边界的基础说明。">
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
