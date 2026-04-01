import Link from "next/link";
import { ArrowRight, Camera, Shirt, Sparkles, Stars, Wand2 } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";
import { HomeStoryScene } from "@/components/ui/home-story-scene";

const quickActions = [
  {
    href: "/wardrobe",
    title: "打开衣橱",
    description: "先把真实衣物收进来，分类、搜索、慢慢补标签。",
    icon: Shirt,
    tone: "peach"
  },
  {
    href: "/recommend",
    title: "今日搭配",
    description: "等衣橱数据更完整后，再让推荐页开始真正懂你。",
    icon: Wand2,
    tone: "mint"
  },
  {
    href: "/assistant",
    title: "穿搭助手",
    description: "明天穿什么、少思考模式、贴心提醒都放在这里。",
    icon: Sparkles,
    tone: "sky"
  }
];

const featurePages = [
  {
    href: "/wardrobe",
    eyebrow: "衣橱管理",
    title: "先把照片变成你的电子橱窗",
    description: "上衣、裤子、裙子、鞋子、配饰分开看，不再把所有功能挤在一页里。",
    badge: "真实数据优先"
  },
  {
    href: "/try-on",
    eyebrow: "试衣空间",
    title: "把拖拽试衣留给独立空间",
    description: "试衣需要更安静、更沉浸的舞台，不该和首页信息挤在一起。",
    badge: "单独页面"
  },
  {
    href: "/recommend",
    eyebrow: "搭配推荐",
    title: "等衣橱标签变丰富，再让 AI 发挥",
    description: "你先积累真实单品、场景、颜色、风格，后面推荐会更可信。",
    badge: "后续增强"
  },
  {
    href: "/login",
    eyebrow: "账户与同步",
    title: "登录、同步和个人数据也分开",
    description: "把复杂设置留在独立页面，首页只负责欢迎你回来和带你开始。",
    badge: "轻入口"
  }
];

const floatingTags = ["温柔", "通勤", "约会", "少思考", "下雨天", "空调房", "拍照好看", "可重复穿搭"];

export default function HomePage() {
  return (
    <AppShell title="AI 衣橱" subtitle="先把衣服收进来，再慢慢让这个产品真的懂你。首页负责欢迎、引导和氛围，具体功能都放到独立页面里。">
      <section className="home-stage">
        <div className="home-stage-visual">
          <HomeStoryScene />
        </div>

        <div className="home-stage-copy">
          <span className="home-stage-pill">首页先像一幕动画，再慢慢带你开始</span>
          <h2 className="home-stage-title">像推开粉粉的小屋门，先看看今天想穿哪一件。</h2>
          <p className="home-stage-lead">
            我把第一屏改成了更轻一点的插画场景：衣柜、镜子、地毯、正在挑衣服的小女孩都放进来了。先感受到温柔和可爱，再点一个按钮开始，下面功能区会慢慢浮现出来。
          </p>

          <div className="home-stage-actions">
            <Link href="/wardrobe" className="hero-cta hero-cta-primary">
              <Camera className="size-4" />
              <span>
                <strong>开始整理衣橱</strong>
                <small>先把真实衣服收进来</small>
              </span>
            </Link>
            <Link href="/assistant" className="hero-cta hero-cta-soft">
              <Stars className="size-4" />
              <span>
                <strong>查看穿搭助手</strong>
                <small>看看明天穿什么</small>
              </span>
            </Link>
            <Link href="/recommend" className="hero-cta hero-cta-soft">
              <Wand2 className="size-4" />
              <span>
                <strong>进入搭配页</strong>
                <small>等衣橱完整后更好用</small>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-tag-ribbon">
        {floatingTags.map((tag) => (
          <span key={tag} className="home-tag">
            {tag}
          </span>
        ))}
      </section>

      <section className="home-quick-panel">
        <div className="home-section-head">
          <span className="home-section-eyebrow">现在先做什么</span>
          <h3>先从 2 到 3 个动作开始，不要把所有功能挤在首页。</h3>
          <p>首页只做欢迎和引导。真正的衣橱、试衣、搭配、助手，都去各自独立页面里完成。</p>
        </div>

        <div className="home-quick-grid">
          {quickActions.map(({ href, title, description, icon: Icon, tone }) => (
            <Link key={href} href={href} className={`home-quick-card home-quick-card-${tone}`}>
              <span className="home-quick-icon">
                <Icon className="size-5" />
              </span>
              <div>
                <h4>{title}</h4>
                <p>{description}</p>
              </div>
              <ArrowRight className="home-quick-arrow size-4" />
            </Link>
          ))}
        </div>
      </section>

      <section className="home-feature-panel">
        <div className="home-section-head">
          <span className="home-section-eyebrow">分页面使用</span>
          <h3>功能都拆开，用的时候再进去，首页只保留舒服和清晰。</h3>
          <p>这样既不会一眼看过去很挤，也能让每个功能页拥有自己更合适的节奏和动画。</p>
        </div>

        <div className="home-feature-grid">
          {featurePages.map((item) => (
            <Link key={item.href} href={item.href} className="home-feature-card">
              <span className="home-feature-badge">{item.badge}</span>
              <p className="home-feature-eyebrow">{item.eyebrow}</p>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
