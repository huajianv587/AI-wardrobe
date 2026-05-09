"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ElementType, type PointerEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  Heart,
  ImageIcon,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Shirt,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { productRoutes, type ModelCapability } from "@/lib/v2-product-data";
import { SiteFooter } from "./SiteFooter";

type ShellProps = {
  children: ReactNode;
  activePath?: string;
  navVariant?: "landing" | "product";
  showFooter?: boolean;
  showNav?: boolean;
  className?: string;
};

const productIconMap: Record<string, LucideIcon> = {
  "/dashboard-new": LayoutDashboard,
  "/wardrobe-new": Shirt,
  "/try-on-new": Sparkles,
  "/recommend-new": Heart,
  "/outfit-diary-new": CalendarDays,
  "/closet-analysis-new": BarChart3,
  "/style-profile-new": UserRound,
  "/assistant-new": MessageCircle,
};

type CoutureNavLeaf = {
  href: string;
  label: string;
  caption?: string;
};

type CoutureNavItem = CoutureNavLeaf & {
  items?: CoutureNavLeaf[];
  match?: string[];
};

const navGroups: CoutureNavItem[] = [
  { href: "/", label: "Leading Page" },
  { href: "/dashboard-new", label: "功能首页" },
  {
    href: "/wardrobe-new",
    label: "衣橱试衣",
    caption: "建档、上传、试穿",
    match: ["/wardrobe-new", "/try-on-new"],
    items: [
      { href: "/wardrobe-new", label: "衣橱管理", caption: "上传、搜索、分类、单品档案" },
      { href: "/try-on-new", label: "一键试衣", caption: "人像、衣物、场景合成预览" },
    ],
  },
  {
    href: "/recommend-new",
    label: "搭配记忆",
    caption: "推荐、日记、反馈",
    match: ["/recommend-new", "/outfit-diary-new"],
    items: [
      { href: "/recommend-new", label: "AI 搭配", caption: "天气、场景、偏好生成搭配" },
      { href: "/outfit-diary-new", label: "穿搭日记", caption: "保存反馈，反哺推荐系统" },
    ],
  },
  {
    href: "/closet-analysis-new",
    label: "风格洞察",
    caption: "分析、档案、权重",
    match: ["/closet-analysis-new", "/style-profile-new"],
    items: [
      { href: "/closet-analysis-new", label: "衣橱分析", caption: "利用率、闲置、色彩和缺口" },
      { href: "/style-profile-new", label: "风格档案", caption: "偏好、体型、场景权重" },
    ],
  },
  { href: "/assistant-new", label: "AI 助手" },
];

const productShortLabels: Record<string, string> = {
  "/dashboard-new": "首页",
  "/wardrobe-new": "衣橱",
  "/try-on-new": "试衣",
  "/recommend-new": "搭配",
  "/outfit-diary-new": "日记",
  "/closet-analysis-new": "分析",
  "/style-profile-new": "档案",
  "/assistant-new": "助手",
};

const mobileDockHrefs = new Set([
  "/dashboard-new",
  "/wardrobe-new",
  "/try-on-new",
  "/recommend-new",
  "/assistant-new",
]);

export function routeIcon(href: string) {
  return productIconMap[href] ?? Sparkles;
}

function isNavItemActive(item: CoutureNavItem, current: string) {
  const matches = item.match ?? [item.href, ...(item.items?.map((subItem) => subItem.href) ?? [])];
  return item.href === "/"
    ? current === "/" || current === "/landing-new"
    : matches.some((href) => current === href);
}

function getCurrentPageLabel(current: string) {
  if (current === "/" || current === "/landing-new") {
    return "Leading Page";
  }

  const productRoute = productRoutes.find((route) => route.href === current);
  if (productRoute) {
    return productRoute.label;
  }

  const navGroup = navGroups.find((item) => isNavItemActive(item, current));
  return navGroup?.label ?? "AI Wardrobe";
}

function updatePointerSpot(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  event.currentTarget.style.setProperty("--pointer-x", `${x.toFixed(2)}%`);
  event.currentTarget.style.setProperty("--pointer-y", `${y.toFixed(2)}%`);
}

export function CoutureLightLayer() {
  return (
    <div className="couture-light-layer" aria-hidden="true">
      <span className="pearl" />
      <span className="gold" />
      <span className="violet" />
      <span className="grain" />
    </div>
  );
}

function CoutureScrollProgress() {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      barRef.current?.style.setProperty("--scroll-progress", progress.toString());
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={barRef} className="couture-scroll-progress" aria-hidden="true" />;
}

export function CoutureShell({
  children,
  activePath,
  navVariant = "landing",
  showFooter = true,
  showNav = true,
  className = "",
}: ShellProps) {
  return (
    <div className={`couture-shell relative min-h-screen overflow-x-hidden ${className}`}>
      <CoutureLightLayer />
      <CoutureScrollProgress />
      {showNav ? <CoutureNav variant={navVariant} activePath={activePath} /> : null}
      <div className="couture-page-content relative z-10">{children}</div>
      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}

export function ProductShell({ children, activePath }: { children: ReactNode; activePath?: string }) {
  const pathname = usePathname();
  const current = activePath ?? pathname;

  return (
    <CoutureShell navVariant="product" activePath={current}>
      <main className="couture-product-main mx-auto w-full max-w-[1240px] px-4 pb-40 pt-28 sm:px-6 lg:px-8 lg:pb-16 lg:pt-32">
        {children}
      </main>
      <MobileFeatureDock activePath={current} />
    </CoutureShell>
  );
}

export function CoutureNav({
  variant = "landing",
  activePath,
}: {
  variant?: "landing" | "product";
  activePath?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const current = activePath ?? pathname;
  const mobilePageLabel = getCurrentPageLabel(current);
  const links =
    variant === "product"
      ? [...navGroups, { href: "/v3", label: "V3 实验版" }]
      : [...navGroups, { href: "/v3", label: "V3 实验版" }];

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={`couture-nav-shell fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5 ${scrolled ? "couture-nav-shell-scrolled" : ""}`}>
      <nav className={`couture-nav mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-5 ${scrolled ? "couture-nav-scrolled" : ""}`}>
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--couture-ink)] text-xs font-black tracking-[0.18em] text-[var(--couture-bg)] shadow-[var(--couture-shadow-soft)]">
            AI
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.28em] text-[var(--couture-ink)]">
              AI Wardrobe
            </span>
            <span className="hidden text-[11px] uppercase tracking-[0.22em] text-[var(--couture-muted)] sm:block">
              Couture Studio
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--couture-muted)] sm:hidden">
              {mobilePageLabel}
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center gap-1 xl:flex">
          {links.map((link) => {
            const active = isNavItemActive(link, current);
            if (link.items?.length) {
              return (
                <div key={link.label} className="couture-nav-group">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`couture-nav-link ${active ? "couture-nav-link-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                  <div className="couture-nav-popover" role="menu" aria-label={link.label}>
                    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">
                      {link.caption}
                    </p>
                    {link.items.map((subItem) => (
                      <Link key={subItem.href} href={subItem.href} className="couture-nav-popover-link" role="menuitem">
                        <span className="block text-sm font-semibold text-[var(--couture-ink)]">{subItem.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--couture-muted)]">{subItem.caption}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`couture-nav-link ${active ? "couture-nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <Link href="/login" className="couture-text-link">
            登录
          </Link>
          <Link href="/register" className="couture-nav-cta">
            注册
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={open}
          aria-controls="couture-mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--couture-line)] bg-white/72 text-[var(--couture-ink)] shadow-[var(--couture-shadow-soft)] xl:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open ? (
        <div id="couture-mobile-menu" className="couture-mobile-menu mx-auto mt-3 grid max-w-[1320px] gap-2 rounded-[30px] border border-[var(--couture-line)] bg-[rgba(255,252,247,0.94)] p-3 shadow-[var(--couture-shadow)] backdrop-blur-2xl xl:hidden">
          {links.map((link) => {
            const active = isNavItemActive(link, current);
            if (link.items?.length) {
              return (
                <div key={link.label} className="couture-mobile-menu-group">
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`couture-mobile-menu-link rounded-2xl px-4 py-3 text-sm font-medium text-[var(--couture-muted)] hover:bg-white hover:text-[var(--couture-ink)] ${active ? "couture-mobile-menu-link-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                  <div className="mt-1 grid gap-1 pl-3">
                    {link.items.map((subItem) => {
                      const subActive = current === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          aria-current={subActive ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={`couture-mobile-menu-sublink rounded-2xl px-4 py-2 text-sm text-[var(--couture-muted)] hover:bg-white hover:text-[var(--couture-ink)] ${subActive ? "couture-mobile-menu-link-active" : ""}`}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`couture-mobile-menu-link rounded-2xl px-4 py-3 text-sm font-medium text-[var(--couture-muted)] hover:bg-white hover:text-[var(--couture-ink)] ${active ? "couture-mobile-menu-link-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="grid grid-cols-2 gap-3 px-1 pt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="couture-line-button justify-center">
              登录
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className="couture-solid-button justify-center">
              注册
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function FeatureDock({
  activePath,
  compact = false,
  showDashboard = false,
}: {
  activePath?: string;
  compact?: boolean;
  showDashboard?: boolean;
}) {
  const routes = showDashboard ? productRoutes : productRoutes.filter((route) => route.href !== "/dashboard-new");

  return (
    <div className={compact ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"}>
      {routes.map((route) => {
        const Icon = routeIcon(route.href);
        const active = activePath === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={`group couture-feature-tile ${active ? "couture-feature-tile-active" : ""}`}
          >
            <div className="flex items-start justify-between gap-5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--couture-paper)] text-[var(--couture-violet)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-[rgba(184,140,74,0.18)] bg-[rgba(255,247,232,0.78)] px-3 py-1 text-xs font-semibold text-[var(--couture-gold)]">
                {route.stat}
              </span>
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--couture-gold)]">
              {route.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-normal text-[var(--couture-ink)]">
              {route.label}
            </h3>
            <p className="mt-3 min-h-14 text-sm leading-7 text-[var(--couture-muted)]">{route.description}</p>
            <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--couture-red)]">
              打开{route.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MobileFeatureDock({ activePath }: { activePath?: string }) {
  const dockRoutes = productRoutes.filter((route) => mobileDockHrefs.has(route.href));

  return (
    <nav
      aria-label="移动端功能导航"
      className="couture-mobile-dock fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-[var(--couture-line)] bg-[rgba(255,252,247,0.9)] p-2 shadow-[var(--couture-shadow)] backdrop-blur-2xl xl:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {dockRoutes.map((route) => {
          const Icon = routeIcon(route.href);
          const active = activePath === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={active ? "page" : undefined}
              style={{
                background: active ? "linear-gradient(135deg, var(--couture-ink), #3a2631)" : "transparent",
                color: active ? "var(--couture-bg)" : "var(--couture-muted)",
                boxShadow: active ? "0 10px 24px rgba(24,20,28,0.22)" : "none",
              }}
              className="couture-mobile-dock-link flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition"
            >
              <Icon className="h-4 w-4" />
              {productShortLabels[route.href] ?? route.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CouturePanel({
  children,
  className = "",
  as,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}) {
  const Component = as ?? "section";
  return (
    <Component {...rest} className={`couture-panel ${className}`} onPointerMove={updatePointerSpot}>
      <span className="couture-surface-sheen" aria-hidden="true" />
      {children}
    </Component>
  );
}

export function EditorialImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  fallbackLabel = "AI Wardrobe",
  priority = false,
  loading = "lazy",
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackLabel?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  sizes?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  return (
    <div
      className={`couture-image relative overflow-hidden ${className}`}
      data-loaded={loaded ? "true" : "false"}
      onPointerMove={updatePointerSpot}
    >
      {!failed && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : loading}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`object-cover ${imageClassName}`}
        />
      ) : (
        <div className="grid h-full min-h-[220px] w-full place-items-center bg-[linear-gradient(135deg,#fff8ef,#f2e5ef_52%,#fbf7ef)] p-8 text-center text-[var(--couture-muted)]">
          <div>
            <ImageIcon className="mx-auto h-9 w-9 text-[var(--couture-violet)]" />
            <p className="mt-3 text-sm font-semibold">{fallbackLabel}</p>
          </div>
        </div>
      )}
      {!failed && src && !loaded ? <span className="couture-image-loading" aria-hidden="true" /> : null}
      <span className="couture-image-sheen" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_6%,rgba(255,255,255,0.42),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0)_48%,rgba(24,20,28,0.24)_100%)]" />
    </div>
  );
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  image: string;
  imageAlt: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="couture-editorial-hero-section mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1320px] items-center gap-10 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pt-36">
      <div className="couture-editorial-hero-copy max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[var(--couture-gold)]">{eyebrow}</p>
        <h1 className="mt-6 text-balance text-[clamp(34px,4.4vw,60px)] font-semibold leading-[1.04] tracking-normal text-[var(--couture-ink)] lg:leading-[1]">
          {title}
        </h1>
        <p className="mt-7 max-w-xl text-base leading-8 text-[var(--couture-muted)] md:text-[17px]">{description}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} className="couture-solid-button">
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="couture-line-button">
              {secondaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
      <div className="couture-editorial-hero-visual relative min-h-[520px] lg:min-h-[680px]">
        <div className="couture-editorial-hero-glow absolute -inset-6 rounded-[48px] bg-[radial-gradient(circle_at_50%_16%,rgba(184,140,74,0.14),transparent_46%),radial-gradient(circle_at_75%_58%,rgba(126,83,154,0.10),transparent_42%)] blur-xl" />
        <EditorialImage
          src={image}
          alt={imageAlt}
          priority
          className="relative h-full min-h-[520px] rounded-[42px] lg:min-h-[680px]"
          imageClassName="object-[center_18%]"
          fallbackLabel="AI Wardrobe editorial"
        />
        <div className="couture-editorial-hero-stats absolute bottom-6 left-6 right-6 rounded-[28px] border border-white/60 bg-[rgba(255,252,247,0.72)] p-5 shadow-[0_22px_70px_rgba(30,22,35,0.16)] backdrop-blur-2xl">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              ["128", "衣橱单品"],
              ["98%", "匹配度"],
              ["3s", "试衣预览"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-xl font-semibold tracking-normal text-[var(--couture-ink)]">{value}</div>
                <div className="mt-1 text-xs text-[var(--couture-muted)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ModelCapabilityBadge({ capability }: { capability: ModelCapability }) {
  const statusText = {
    ready: "已就绪",
    mock: "原型中",
    training: "训练中",
  }[capability.status];

  return (
    <Link
      href={capability.route}
      className="couture-capability-badge"
      title={capability.userBenefit}
      aria-label={`${capability.label}，${capability.model}，${capability.userBenefit}`}
    >
      <span className="couture-capability-icon" aria-hidden="true">
        <FlaskConical className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[var(--couture-ink)]">{capability.label}</span>
        <span className="block truncate text-xs text-[var(--couture-muted)]">
          {capability.model} / {statusText}
        </span>
        <span className="mt-2 block text-[11px] leading-5 text-[var(--couture-soft)]">{capability.userBenefit}</span>
      </span>
    </Link>
  );
}

export function SectionMarquee({ items }: { items: string[] }) {
  return (
    <div className="overflow-hidden border-y border-[var(--couture-line)] py-4">
      <div className="couture-marquee flex min-w-max gap-8 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--couture-muted)]">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-8">
            {item}
            <CheckCircle2 className="h-4 w-4 text-[var(--couture-gold)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
