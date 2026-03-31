"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, ScanFace, Shirt, Sparkles, Wand2 } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: Sparkles },
  { href: "/wardrobe", label: "Wardrobe", shortLabel: "Closet", icon: Shirt },
  { href: "/try-on", label: "Try-On Studio", shortLabel: "Try-On", icon: ScanFace },
  { href: "/recommend", label: "AI Styling", shortLabel: "AI", icon: Wand2 },
  { href: "/login", label: "Account", shortLabel: "Login", icon: LogIn }
];

interface AppShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useMobile();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-5 md:px-6">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="section-card sticky top-4 z-30 mb-6 rounded-[28px] px-4 py-4 md:px-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="pill mb-3">Local-first wardrobe intelligence</div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--ink-strong)] md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">{subtitle}</p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map(({ href, label, shortLabel, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-transparent bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]"
                      : "border-[var(--line)] bg-white/75 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{isMobile ? shortLabel : label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.header>

      <main className="flex-1">{children}</main>
    </div>
  );
}