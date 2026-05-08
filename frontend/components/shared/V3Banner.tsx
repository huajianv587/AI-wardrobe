import Link from "next/link";

export function V3Banner() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[70] border-b border-[var(--border-default)] bg-white/90 px-4 py-2 text-center text-sm text-[var(--text-secondary)] shadow-[0_10px_30px_rgba(84,62,120,0.10)] backdrop-blur-xl">
      你正在查看 V3 实验版 ·{" "}
      <Link href="/" className="font-semibold text-[#8d60e8] underline-offset-4 hover:underline">
        返回新版
      </Link>
    </div>
  );
}
