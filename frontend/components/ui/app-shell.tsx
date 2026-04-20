"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BookHeart, Home, LogIn, ScanFace, Shirt, Sparkles } from "lucide-react";

import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/", label: "首页", shortLabel: "首页", icon: Home },
  { href: "/wardrobe", label: "衣橱管理", shortLabel: "衣橱", icon: Shirt },
  { href: "/smart-wardrobe", label: "智能衣橱", shortLabel: "智能", icon: Sparkles },
  { href: "/outfit-diary", label: "穿搭日记", shortLabel: "日记", icon: BookHeart },
  { href: "/closet-analysis", label: "衣橱分析", shortLabel: "分析", icon: BarChart3 },
  { href: "/style-profile", label: "风格画像", shortLabel: "画像", icon: ScanFace }
];

const mobileDockItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/wardrobe", label: "衣橱", icon: Shirt },
  { href: "/smart-wardrobe", label: "智能", icon: Sparkles },
  { href: "/outfit-diary", label: "日记", icon: BookHeart },
  { href: "/style-profile", label: "画像", icon: ScanFace }
];

interface AppShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const { user, isAuthenticated } = useAuthSession();

  return (
    <div className="app-shell-root relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-5 md:px-6 md:pb-10">
      <AuthSessionBootstrap />

      <motion.span
        animate={{ x: [0, -20, 0], y: [0, 14, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
        className="shell-orb shell-orb-peach"
      />
      <motion.span
        animate={{ x: [0, 24, 0], y: [0, -18, 0], scale: [1, 0.96, 1] }}
        transition={{ duration: 12.8, repeat: Infinity, ease: "easeInOut" }}
        className="shell-orb shell-orb-mint"
      />
      <motion.span
        animate={{ x: [0, -18, 0], y: [0, 12, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 11.4, repeat: Infinity, ease: "easeInOut" }}
        className="shell-orb shell-orb-sky"
      />

      <motion.header
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="app-shell-header section-card soft-panel sticky top-4 z-30 mb-6 rounded-[32px] px-4 py-4 md:px-6"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="pill mb-3">Wenwen Wardrobe | 分页工作台</div>
              <h1 className="app-shell-title display-title text-[2.2rem] font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--ink-strong)] md:text-[3.45rem]">
                {title}
              </h1>
              <p className="app-shell-subtitle mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">{subtitle}</p>
              {isAuthenticated && user ? (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  当前账号 <span className="font-medium text-[var(--ink)]">{user.email}</span>
                </p>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/88 px-4 py-2 text-sm text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                注册
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-4 py-2 text-sm text-white shadow-[var(--shadow-float)] transition hover:translate-y-[-1px]"
              >
                <LogIn className="size-4" />
                登录
              </Link>
            </div>
          </div>

          <motion.nav
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.04,
                  delayChildren: 0.06
                }
              }
            }}
            className="app-shell-nav flex gap-2 overflow-x-auto pb-1 md:flex-wrap"
          >
            {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
              const active = isActivePath(pathname, href);

              return (
                <motion.div
                  key={href}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <Link
                    href={href}
                    className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-transparent text-[var(--ink-strong)] shadow-[var(--shadow-float)]"
                        : "border-[var(--line)] bg-white/90 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="desktop-nav-active"
                        className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#ffd8c8_0%,#fff4ec_48%,#dff6eb_100%)]"
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      />
                    ) : null}
                    <Icon className="relative z-10 size-4" />
                    <span className="relative z-10">{isMobile ? shortLabel : label}</span>
                    {active ? <span className="relative z-10 size-1.5 rounded-full bg-[var(--accent)]" /> : null}
                  </Link>
                </motion.div>
              );
            })}
          </motion.nav>

          {isMobile ? (
            <div className="app-shell-mobile-auth flex items-center gap-3 md:hidden">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/88 px-4 py-2 text-xs text-[var(--ink)]"
              >
                注册
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-4 py-2 text-xs text-white shadow-[var(--shadow-float)]"
              >
                <LogIn className="size-4" />
                登录
              </Link>
            </div>
          ) : null}
        </div>
      </motion.header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 18, scale: 0.988, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, scale: 1.008, filter: "blur(8px)" }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="page-fade relative z-10 flex-1"
        >
          <motion.div
            initial={{ opacity: 0.6, scale: 0.92 }}
            animate={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.72, ease: [0.18, 1, 0.3, 1] }}
            className="route-veil"
          >
            <motion.span
              initial={{ opacity: 0.85, x: -70 }}
              animate={{ opacity: 0, x: 120 }}
              transition={{ duration: 0.78, ease: [0.18, 1, 0.3, 1] }}
              className="route-spotlight"
            />
          </motion.div>
          {children}
        </motion.main>
      </AnimatePresence>

      {isMobile ? (
        <nav className="mobile-dock app-shell-dock md:hidden">
          {mobileDockItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);

            return (
              <Link key={href} href={href} className="mobile-dock-item relative overflow-hidden" data-active={active ? "true" : "false"}>
                {active ? (
                  <motion.span
                    layoutId="mobile-dock-active"
                    className="absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,#ffd8c8_0%,#fff4ec_48%,#dff6eb_100%)]"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                ) : null}
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
