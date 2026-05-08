"use client";

import Link from "next/link";
import { useState } from "react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { VersionBadge } from "./VersionBadge";

const navLinks = [
  { href: "/landing-new#features", label: "功能" },
  { href: "/landing-new#pricing", label: "定价" },
  { href: "/ui-demo", label: "演示" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[rgba(7,8,15,0.72)] px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-2xl md:px-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--text-inverse)]">
            AI
          </span>
          <span className="hidden text-base font-semibold text-[var(--text-primary)] sm:block">
            AI Wardrobe
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
          <VersionBadge href="/v3" tone="v3">
            V3 实验版
          </VersionBadge>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            登录
          </Link>
          <PremiumButton size="sm" onClick={() => { window.location.href = "/register"; }}>
            注册
          </PremiumButton>
        </div>

        <button
          type="button"
          aria-label="打开导航菜单"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-default)] text-[var(--text-primary)] md:hidden"
        >
          <span className="text-xl">{open ? "×" : "☰"}</span>
        </button>
      </nav>

      {open ? (
        <div className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-[28px] border border-[var(--border-default)] bg-[rgba(7,8,15,0.92)] p-4 shadow-[var(--shadow-card)] backdrop-blur-2xl md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/v3" onClick={() => setOpen(false)} className="px-4 py-3">
            <VersionBadge tone="v3">V3 实验版</VersionBadge>
          </Link>
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-full border border-[var(--border-default)] px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
              登录
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--text-inverse)]">
              注册
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
