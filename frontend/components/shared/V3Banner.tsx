import Link from "next/link";

export function V3Banner() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[70] border-b border-[var(--border-default)] bg-[rgba(7,8,15,0.92)] px-4 py-2 text-center text-sm text-[var(--text-secondary)] backdrop-blur-xl">
      <span aria-hidden="true">🧪</span> 你正在查看 V3 实验版 ·{" "}
      <Link href="/" className="font-semibold text-[var(--brand-purple)] underline-offset-4 hover:underline">
        返回新版
      </Link>
    </div>
  );
}
