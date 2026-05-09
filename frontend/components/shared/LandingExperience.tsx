"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "./PageShell";
import { SectionHeading } from "./SectionHeading";
import {
  CouturePanel,
  EditorialHero,
  EditorialImage,
  routeIcon,
  SectionMarquee,
} from "./CoutureSystem";
import { FeatureWorkflowMock, LandingProductPreview, ProductRouteIntro } from "./ProductModules";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { modelCapabilities } from "@/lib/v2-product-data";

const workflow = [
  {
    step: "01",
    title: "建档衣橱",
    body: "上传衣物后，AI 自动识别类别、颜色、材质、季节与风格标签。",
    href: "/wardrobe-new",
    cta: "进入衣橱管理",
  },
  {
    step: "02",
    title: "生成今日造型",
    body: "结合天气、日程、衣橱状态和过往反馈，给出一套可执行方案。",
    href: "/recommend-new",
    cta: "查看 AI 搭配",
  },
  {
    step: "03",
    title: "虚拟试衣",
    body: "把人像、单品和场景组合成上身预览，先判断再购买。",
    href: "/try-on-new",
    cta: "一键试衣",
  },
  {
    step: "04",
    title: "保存反馈",
    body: "把满意度、场景和复穿意愿写入日记，形成个人风格记忆。",
    href: "/outfit-diary-new",
    cta: "打开穿搭日记",
  },
  {
    step: "05",
    title: "风格进化",
    body: "分析闲置、缺口、色彩和权重，让推荐越来越像私人造型师。",
    href: "/style-profile-new",
    cta: "调整风格档案",
  },
];

const architectureLayers = [
  {
    step: "Layer 01",
    title: "Leading Page",
    href: "/landing-new",
    cta: "品牌第一印象",
    body: "只负责高定质感、产品价值和核心能力预览，不在首页塞完整操作。",
  },
  {
    step: "Layer 02",
    title: "功能首页",
    href: "/dashboard-new",
    cta: "进入今日工作台",
    body: "负责今日建议、功能入口、最近活动和模型状态，让用户知道下一步该去哪。",
  },
  {
    step: "Layer 03",
    title: "独立工作室",
    href: "/wardrobe-new",
    cta: "查看功能分页面",
    body: "衣橱、试衣、推荐、日记、分析、档案和助手各自成页，功能粒粒分明。",
  },
];

const directEntrances = [
  {
    href: "/wardrobe-new",
    label: "衣橱管理",
    eyebrow: "Wardrobe",
    body: "上传、识别、搜索、筛选和维护单品档案。",
  },
  {
    href: "/try-on-new",
    label: "一键试衣",
    eyebrow: "Try-On",
    body: "选择人像、衣物和场景，生成上身预览。",
  },
  {
    href: "/recommend-new",
    label: "AI 搭配",
    eyebrow: "Styling",
    body: "按天气、场景和偏好生成完整 look。",
  },
  {
    href: "/outfit-diary-new",
    label: "穿搭日记",
    eyebrow: "Diary",
    body: "记录反馈，让下一次推荐更贴近你。",
  },
  {
    href: "/closet-analysis-new",
    label: "衣橱分析",
    eyebrow: "Insight",
    body: "查看闲置、缺口、色彩和利用率。",
  },
  {
    href: "/style-profile-new",
    label: "风格档案",
    eyebrow: "Profile",
    body: "维护审美边界、场景权重和推荐参数。",
  },
  {
    href: "/assistant-new",
    label: "AI 造型助手",
    eyebrow: "Assistant",
    body: "用对话进入试衣、搭配、分析和复盘。",
  },
];

const features = [
  {
    eyebrow: "Wardrobe Index",
    badge: "衣橱建档",
    title: "像高级买手店一样管理每件单品",
    description:
      "保留 V3 的搜索、筛选、详情弹窗和上传流程，但把它们重做成更大气的 lookbook gallery。单品不是文字卡片，而是可被 AI 理解、可复穿、可进入推荐链路的风格资产。",
    href: "/wardrobe-new",
    type: "wardrobe" as const,
    image: "/editorial/wardrobe-shirt-rack.jpg",
    alt: "高级衣橱陈列",
  },
  {
    eyebrow: "Atelier Studio",
    badge: "虚拟试衣",
    title: "穿上它，再决定买不买",
    description:
      "试衣页不是一个上传框，而是完整的 atelier studio：人像、衣物、背景、光线、历史结果和保存到日记都在独立工作流里完成。",
    href: "/try-on-new",
    type: "tryon" as const,
    image: "/editorial/tryon-studio-portrait.jpg",
    alt: "虚拟试衣工作室",
  },
  {
    eyebrow: "Lookbook Board",
    badge: "搭配推荐",
    title: "每套推荐都说明为什么适合你",
    description:
      "推荐不再是几张抽象卡片，而是按通勤、周末、聚会等场景组织的 lookbook board。匹配度、天气、理由、替换单品和试穿入口一目了然。",
    href: "/recommend-new",
    type: "recommend" as const,
    image: "/editorial/recommend-evening-look.jpg",
    alt: "高级搭配推荐造型",
  },
  {
    eyebrow: "Closet Intelligence",
    badge: "衣橱分析",
    title: "少买重复单品，多穿真正适合的衣服",
    description:
      "分析页把分类比例、闲置提醒、色彩偏好、缺口建议变成可执行行动，帮助用户理解衣橱价值，而不是堆砌后台图表。",
    href: "/closet-analysis-new",
    type: "analysis" as const,
    image: "/editorial/analysis-fabric-board.jpg",
    alt: "布料与色彩分析板",
  },
  {
    eyebrow: "Style Memory",
    badge: "穿搭日记",
    title: "把每天的穿搭反馈，变成下一次推荐的记忆",
    description:
      "日记页保留 V3 的记录能力，但用 scrapbook 式时间线呈现：照片、天气、心情、满意度和复穿动作一起形成私人风格记忆。",
    href: "/outfit-diary-new",
    type: "diary" as const,
    image: "/editorial/diary-office-look.jpg",
    alt: "通勤穿搭日记记录",
  },
  {
    eyebrow: "Style Profile",
    badge: "风格档案",
    title: "让 AI 真正理解你的审美边界",
    description:
      "风格档案不再只是标签堆叠，而是色彩偏好、场景权重、体型信息和推荐调参的总控台。它决定推荐为什么越来越像私人造型师。",
    href: "/style-profile-new",
    type: "profile" as const,
    image: "/editorial/style-color-board.jpg",
    alt: "高级风格档案色彩板",
  },
  {
    eyebrow: "Stylist Assistant",
    badge: "AI 助手",
    title: "从一句问题，进入具体造型动作",
    description:
      "助手承接 LLM 能力，但不做普通聊天窗口。它会带着衣橱、天气、风格档案和最近反馈，引导用户去试穿、保存、分析或更新档案。",
    href: "/assistant-new",
    type: "assistant" as const,
    image: "/editorial/assistant-atelier-desk.jpg",
    alt: "私人造型顾问工作台",
  },
];

function RevealFeature({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const ref = useScrollReveal();
  const text = (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
        {feature.eyebrow}
      </p>
      <h2 className="mt-5 text-balance text-3xl font-semibold leading-[1.06] tracking-normal text-[var(--couture-ink)] md:text-4xl">
        {feature.title}
      </h2>
      <p className="mt-5 text-base leading-8 text-[var(--couture-muted)] md:text-[17px]">{feature.description}</p>
      <Link href={feature.href} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
        进入{feature.badge}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
  const visual = (
    <div className="grid gap-5">
      <EditorialImage
        src={feature.image}
        alt={feature.alt}
        loading="eager"
        className="aspect-[4/3] rounded-[40px]"
        fallbackLabel={feature.badge}
      />
      <FeatureWorkflowMock type={feature.type} />
    </div>
  );

  return (
    <section
      ref={ref}
      id={index === 0 ? "features" : undefined}
      className={`couture-landing-feature ${index > 1 ? "couture-landing-feature-low-mobile" : ""} reveal-on-scroll mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-12 md:min-h-[58vh] md:grid-cols-2 md:gap-12 md:py-14 sm:px-6 lg:px-8`}
    >
      {index % 2 === 0 ? (
        <>
          {text}
          {visual}
        </>
      ) : (
        <>
          {visual}
          {text}
        </>
      )}
    </section>
  );
}

export function LandingExperience() {
  return (
    <PageShell>
      <EditorialHero
        eyebrow="Leading Page / Private Couture Studio"
        title={
          <>
            AI Wardrobe
            <span className="block text-[var(--couture-red)] sm:whitespace-nowrap">私人造型工作室</span>
          </>
        }
        description="上传衣橱，生成搭配，虚拟试衣，复盘风格。新版主线把 V2 的高级视觉和 V3 的功能密度重做成一个清晰、分层、可使用的时尚产品。"
        image="/editorial/hero-couture-white-suit.jpg"
        imageAlt="高定秀场风格的 AI Wardrobe 视觉"
        primaryHref="/dashboard-new"
        primaryLabel="进入功能首页"
        secondaryHref="/try-on-new"
        secondaryLabel="一键试衣"
      >
        <p className="text-sm text-[var(--couture-muted)]">
          Leading Page 只负责品牌第一印象；功能首页负责产品总控；一键试衣、衣橱管理、AI 搭配等能力都进入独立页面完成。
        </p>
      </EditorialHero>

      <SectionMarquee
        items={[
          "OOTDiffusion Try-On",
          "CLIP Classifier",
          "Qwen-VL Attribute Reader",
          "BiRefNet Background",
          "RealESRGAN Upscale",
          "ControlNet Product Shot",
          "TripoSR Avatar",
          "LLM Stylist",
        ]}
      />

      <section className="couture-landing-entry mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--couture-gold)]">
              Function Entrances
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-normal text-[var(--couture-ink)] md:text-3xl">
              每个能力都有独立入口，不挤在一个页面里。
            </h2>
          </div>
          <Link href="/dashboard-new" className="couture-line-button self-start md:self-auto">
            进入功能首页
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="couture-direct-dock grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {directEntrances.map((entry) => {
            const Icon = routeIcon(entry.href);
            return (
              <Link key={entry.href} href={entry.href} className="couture-direct-entry group">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(255,255,255,0.72)] text-[var(--couture-red)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
                    {entry.eyebrow}
                  </span>
                  <span className="mt-2 block text-lg font-semibold tracking-normal text-[var(--couture-ink)]">
                    {entry.label}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--couture-muted)]">{entry.body}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--couture-red)] transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
        <div className="mt-8 couture-model-strip">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--couture-gold)]">
              Model Stack
            </p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--couture-muted)]">
              页面入口对应真实模型链路，用户看到的是功能，背后由多模型协同完成。
            </p>
          </div>
          <div className="couture-model-chip-grid">
            {modelCapabilities.slice(0, 8).map((capability) => (
              <Link key={capability.id} href={capability.route} className="couture-model-chip">
                <span>{capability.model}</span>
                <small>{capability.label}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="couture-landing-secondary mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.38fr_1fr] lg:items-stretch">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--couture-gold)]">
                Site Architecture
              </p>
              <h2 className="mt-4 max-w-md text-2xl font-semibold leading-[1.12] tracking-normal text-[var(--couture-ink)] md:text-3xl">
                页面不再互相挤压，三层结构各司其职。
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[var(--couture-muted)]">
                Leading 负责品牌感，Dashboard 负责总控，功能页负责深度操作。用户从导航或功能首页进入对应页面，不需要在一个页面里找所有东西。
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {architectureLayers.map((layer) => (
              <Link key={layer.step} href={layer.href} className="couture-architecture-card group">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--couture-gold)]">
                  {layer.step}
                </p>
                <h3 className="mt-5 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{layer.title}</h3>
                <p className="mt-3 min-h-20 text-sm leading-7 text-[var(--couture-muted)]">{layer.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                  {layer.cta}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="couture-landing-quality mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
        <CouturePanel className="p-4 md:p-5">
          <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch">
            <EditorialImage
              src="/editorial/landing-couture-runway.jpg"
              alt="高级时尚秀场质感的 AI Wardrobe 品牌视觉"
              className="min-h-[420px] rounded-[36px]"
              imageClassName="object-[center_22%]"
              fallbackLabel="AI Wardrobe"
            />
            <div className="flex min-h-[420px] flex-col justify-between px-5 py-7 md:px-9 md:py-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--couture-gold)]">
                  Couture Quality System
                </p>
                <h2 className="mt-5 max-w-3xl text-balance text-[clamp(28px,3.4vw,46px)] font-semibold leading-[1.07] tracking-normal text-[var(--couture-ink)]">
                  时尚感来自整体质量，不是照片装饰。
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--couture-muted)] md:text-[17px]">
                  新版主线把版式、节奏、导航、功能分流、模型能力表达和动效一起重做。图片只服务结构，真正的高级感来自每个功能都清楚、克制、可进入。
                </p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["01", "大片首屏", "品牌先建立情绪，再进入功能。"],
                  ["02", "独立工作室", "每个功能单独成页，不在首页拥挤展开。"],
                  ["03", "模型可见", "AI 能力自然嵌入工作流，而不是技术堆叠。"],
                ].map(([step, title, body]) => (
                  <div key={step} className="rounded-[26px] border border-[var(--couture-line)] bg-white/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--couture-gold)]">
                      {step}
                    </p>
                    <h3 className="mt-3 font-semibold text-[var(--couture-ink)]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--couture-muted)]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CouturePanel>
      </section>

      <section id="workflow" className="couture-landing-workflow mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Product Workflow"
          title="不是照片拼贴，而是一条完整造型链路"
          description="从衣橱建档到试衣、推荐、反馈、分析，每一步都对应项目里的模型能力，同时保持高定杂志式的留白和节奏。"
        />
        <div className="mt-14 grid gap-5 md:grid-cols-5">
          {workflow.map((item) => (
            <CouturePanel key={item.step} as={Link} href={item.href} className="couture-workflow-entry p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--couture-gold)]">
                {item.step}
              </p>
              <h3 className="mt-5 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[var(--couture-muted)]">{item.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
                {item.cta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </CouturePanel>
          ))}
        </div>
      </section>

      <section className="couture-landing-preview mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Product Home Preview"
          title="功能首页只做总控，不替代功能页"
          description="今日造型、核心指标、功能入口和最近活动保留在 Dashboard；衣橱、试衣、推荐、日记、分析、档案和助手都跳转到独立页面。"
        />
        <LandingProductPreview />
      </section>

      {features.map((feature, index) => (
        <RevealFeature key={feature.href} feature={feature} index={index} />
      ))}

      <section className="couture-landing-functional-map mx-auto max-w-[1240px] px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Functional Map"
          title="每个功能粒粒分明"
          description="用户从顶部导航或功能首页进入对应页面，每个页面都有独立版式、独立主工作流和清晰模型能力表达。"
        />
        <div className="mt-14">
          <ProductRouteIntro />
        </div>
      </section>

      <section className="couture-landing-final-cta px-4 py-24 sm:px-6 lg:px-8">
        <CouturePanel className="mx-auto max-w-5xl p-10 text-center md:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--couture-gold)]">
            Start With Your Closet
          </p>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-normal text-[var(--couture-ink)] md:text-4xl">
            重新爱上每天的穿搭选择
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--couture-muted)]">
            免费开始，无需信用卡。先建立衣橱，再让 AI 帮你把每件衣服穿出价值。
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/register" className="couture-solid-button">
              立即开始
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CouturePanel>
      </section>
    </PageShell>
  );
}
