"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavBarProps {
  onNavigateHome: () => void;
}

type NavKey = "home" | "wardrobe" | "smart-wardrobe" | "outfit-diary" | "closet-analysis" | "style-profile";
type AuthKey = "register" | "login";

const navItems: Array<{ key: NavKey; label: string; href?: string }> = [
  { key: "home", label: "首页" },
  { key: "wardrobe", label: "衣橱管理", href: "/wardrobe" },
  { key: "smart-wardrobe", label: "智能衣物", href: "/smart-wardrobe" },
  { key: "outfit-diary", label: "穿搭日志", href: "/outfit-diary" },
  { key: "closet-analysis", label: "衣橱分析", href: "/closet-analysis" },
  { key: "style-profile", label: "风格雷达", href: "/style-profile" }
];

function getActiveKey(pathname: string): NavKey | null {
  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/wardrobe")) {
    return "wardrobe";
  }

  if (pathname.startsWith("/smart-wardrobe")) {
    return "smart-wardrobe";
  }

  if (pathname.startsWith("/outfit-diary")) {
    return "outfit-diary";
  }

  if (pathname.startsWith("/closet-analysis")) {
    return "closet-analysis";
  }

  if (pathname.startsWith("/style-profile")) {
    return "style-profile";
  }

  return null;
}

export function NavBar({ onNavigateHome }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<NavKey | null>(null);
  const [hoveredAuth, setHoveredAuth] = useState<AuthKey | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const activeKey = getActiveKey(pathname);
  const activeAuthKey: AuthKey | null = pathname.startsWith("/register")
    ? "register"
    : pathname.startsWith("/login")
      ? "login"
      : null;

  function handleNav(key: NavKey, href?: string) {
    setIsOpen(false);

    if (key === "home") {
      if (pathname === "/") {
        onNavigateHome();
      } else {
        router.push("/");
      }

      return;
    }

    if (href) {
      router.push(href);
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      data-scrolled={isScrolled}
      className="navbar-shell"
    >
      <div className="navbar-shell__inner">
        <motion.button
          type="button"
          data-cursor="hover"
          whileHover={{ y: -1, scale: 1.01 }}
          onClick={() => {
            setIsOpen(false);
            if (pathname === "/") {
              onNavigateHome();
            } else {
              router.push("/");
            }
          }}
          className="navbar-logo"
          aria-label="返回首页"
        >
          <span className="navbar-logo__mark" aria-hidden>
            <span className="navbar-logo__petal navbar-logo__petal--top" />
            <span className="navbar-logo__petal navbar-logo__petal--right" />
            <span className="navbar-logo__petal navbar-logo__petal--bottom" />
            <span className="navbar-logo__petal navbar-logo__petal--left" />
            <span className="navbar-logo__core" />
          </span>
          <span className="navbar-logo__copy">
            <span className="navbar-logo__title">文文的衣橱</span>
            <span className="navbar-logo__subtitle">WENWEN WARDROBE</span>
          </span>
        </motion.button>

        <nav
          className="nav-ribbon hidden md:flex"
          aria-label="主导航"
          onMouseLeave={() => setHoveredKey(null)}
        >
          {navItems.map((item, index) => {
            const isActive = activeKey === item.key;
            const isHovered = hoveredKey === item.key;

            return (
              <div key={item.key} className="flex items-center">
                {index > 0 ? (
                  <span className="nav-separator" aria-hidden>
                    ·
                  </span>
                ) : null}

                <div className="relative">
                  {isHovered ? <motion.span layoutId="nav-hover" className="nav-hover-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  {isActive ? <motion.span layoutId="nav-active" className="nav-active-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <button
                    type="button"
                    data-cursor="hover"
                    data-active={isActive}
                    className="nav-link"
                    onMouseEnter={() => setHoveredKey(item.key)}
                    onFocus={() => setHoveredKey(item.key)}
                    onClick={() => handleNav(item.key, item.href)}
                  >
                    {item.label}
                  </button>
                </div>
              </div>
            );
          })}
          <span className="nav-ribbon__sheen" aria-hidden />
        </nav>

        <nav
          className="nav-ribbon nav-ribbon--auth hidden md:flex"
          aria-label="账户入口"
          onMouseLeave={() => setHoveredAuth(null)}
        >
          {[
            { key: "register" as const, label: "注册", href: "/register" },
            { key: "login" as const, label: "登录", href: "/login" }
          ].map((item, index) => {
            const isActive = activeAuthKey === item.key;

            return (
              <div key={item.key} className="flex items-center">
                {index > 0 ? (
                  <span className="nav-separator" aria-hidden>
                    ·
                  </span>
                ) : null}

                <div className="relative">
                  {hoveredAuth === item.key ? (
                    <motion.span
                      layoutId="auth-hover"
                      className="nav-hover-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  {isActive ? (
                    <motion.span
                      layoutId="auth-active"
                      className="nav-active-pill nav-active-pill--auth"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <Link
                    href={item.href}
                    data-cursor="hover"
                    data-active={isActive}
                    className="nav-link nav-link--auth"
                    onMouseEnter={() => setHoveredAuth(item.key)}
                    onFocus={() => setHoveredAuth(item.key)}
                  >
                    {item.label}
                  </Link>
                </div>
              </div>
            );
          })}
          <span className="nav-ribbon__sheen" aria-hidden />
        </nav>

        <button
          type="button"
          data-cursor="hover"
          aria-label={isOpen ? "关闭菜单" : "打开菜单"}
          onClick={() => setIsOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(var(--accent-rose-deep-rgb),0.28)] bg-white/40 text-[var(--text-primary)] backdrop-blur-lg md:hidden"
        >
          <span className="flex flex-col gap-1.5">
            <span className={`block h-px w-5 bg-current transition-transform ${isOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-current transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`block h-px w-5 bg-current transition-transform ${isOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mx-3 mt-2 max-h-[calc(100svh-104px)] overflow-auto rounded-[24px] border border-[rgba(var(--accent-rose-rgb),0.16)] bg-[rgba(var(--bg-primary-rgb),0.92)] p-4 shadow-[0_20px_50px_rgba(180,120,140,0.12)] backdrop-blur-xl md:hidden"
          >
            <div className="grid gap-2">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  data-cursor="hover"
                  onClick={() => handleNav(item.key, item.href)}
                  className={`rounded-[18px] px-4 py-3 text-left text-[0.74rem] tracking-[0.16em] transition-all ${
                    activeKey === item.key
                      ? "bg-[linear-gradient(135deg,rgba(var(--accent-rose-rgb),0.22),rgba(var(--accent-gold-rgb),0.14))] text-[var(--accent-rose-deep)]"
                      : "text-[var(--text-secondary)] hover:bg-white/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <Link
                href="/register"
                data-cursor="hover"
                onClick={() => setIsOpen(false)}
                className={`mt-2 rounded-[18px] border px-4 py-3 text-left text-[0.74rem] tracking-[0.16em] transition-all ${
                  activeAuthKey === "register"
                    ? "border-[rgba(var(--accent-rose-deep-rgb),0.14)] bg-[linear-gradient(135deg,rgba(var(--accent-rose-rgb),0.18),rgba(var(--accent-gold-rgb),0.1))] text-[var(--accent-rose-deep)] shadow-[0_10px_22px_rgba(180,120,140,0.1)]"
                    : "border-[var(--line)] bg-white/70 text-[var(--text-secondary)] hover:bg-white/90"
                }`}
              >
                注册
              </Link>

              <Link
                href="/login"
                data-cursor="hover"
                onClick={() => setIsOpen(false)}
                className={`nav-login justify-center ${activeAuthKey === "login" ? "nav-login--active" : ""}`}
              >
                登录
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
