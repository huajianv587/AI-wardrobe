"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, LogIn, ScanFace, Shirt, Sparkles, Wand2 } from "lucide-react";
import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: Sparkles },
  { href: "/wardrobe", label: "Wardrobe", shortLabel: "Closet", icon: Shirt },
  { href: "/try-on", label: "Try-On Studio", shortLabel: "Try-On", icon: ScanFace },
  { href: "/recommend", label: "AI Styling", shortLabel: "AI", icon: Wand2 },
  { href: "/assistant", label: "Assistant", shortLabel: "Assist", icon: Sparkles },
  { href: "/ai-demo", label: "AI Demo Lab", shortLabel: "Lab", icon: Bot },
  { href: "/login", label: "Account", shortLabel: "Login", icon: LogIn }
];

const mobileDockItems = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/wardrobe", label: "Closet", icon: Shirt },
  { href: "/try-on", label: "Try-On", icon: ScanFace },
  { href: "/recommend", label: "Looks", icon: Wand2 },
  { href: "/assistant", label: "Assist", icon: Bot }
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
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-5 md:px-6 md:pb-10">
      <AuthSessionBootstrap />
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="section-card soft-panel sticky top-4 z-30 mb-6 rounded-[32px] px-4 py-4 md:px-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="pill mb-3">Warm wardrobe intelligence</div>
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
                Account
              </Link>
            ) : null}
          </div>

          <nav className="hidden flex-wrap gap-2 md:flex">
            {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-transparent bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]"
                      : "border-[var(--line)] bg-white/90 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{isMobile ? shortLabel : label}</span>
                  {active ? <span className="size-1.5 rounded-full bg-white/85" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.header>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="page-fade flex-1"
      >
        {children}
      </motion.main>

      {isMobile ? (
        <nav className="mobile-dock md:hidden">
          {mobileDockItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link key={href} href={href} className="mobile-dock-item" data-active={active ? "true" : "false"}>
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
