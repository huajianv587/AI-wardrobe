"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, LogIn, ScanFace, Shirt, Sparkles, Wand2 } from "lucide-react";
import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/", label: "首页", shortLabel: "首页", icon: Sparkles },
  { href: "/wardrobe", label: "衣橱", shortLabel: "衣橱", icon: Shirt },
  { href: "/try-on", label: "试衣", shortLabel: "试衣", icon: ScanFace },
  { href: "/recommend", label: "搭配", shortLabel: "搭配", icon: Wand2 },
  { href: "/assistant", label: "助手", shortLabel: "助手", icon: Sparkles },
  { href: "/ai-demo", label: "AI 实验室", shortLabel: "实验室", icon: Bot },
  { href: "/login", label: "账户", shortLabel: "账户", icon: LogIn }
];

const mobileDockItems = [
  { href: "/", label: "首页", icon: Sparkles },
  { href: "/wardrobe", label: "衣橱", icon: Shirt },
  { href: "/try-on", label: "试衣", icon: ScanFace },
  { href: "/recommend", label: "搭配", icon: Wand2 },
  { href: "/assistant", label: "助手", icon: Bot }
];

interface AppShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const { user, isAuthenticated } = useAuthSession();

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-5 md:px-6 md:pb-10">
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
        className="section-card soft-panel sticky top-4 z-30 mb-6 rounded-[32px] px-4 py-4 md:px-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="pill mb-3">温柔一点的衣橱产品</div>
            <h1 className="display-title text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] md:text-5xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">{subtitle}</p>
            {isAuthenticated && user ? (
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                Signed in as <span className="font-medium text-[var(--ink)]">{user.email}</span>
              </p>
            ) : null}
            {isMobile ? (
              <Link href="/login" className="mt-3 inline-flex items-center rounded-full border border-[var(--line)] bg-white/88 px-4 py-2 text-xs text-[var(--ink)] shadow-[var(--shadow-soft)]">
                账户
              </Link>
            ) : null}
          </div>

          <motion.nav
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.08
                }
              }
            }}
            className="hidden flex-wrap gap-2 md:flex"
          >
            {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
              const active = pathname === href;

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
        <nav className="mobile-dock md:hidden">
          {mobileDockItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

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
