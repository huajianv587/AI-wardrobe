import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "文文的衣橱 | AI Wardrobe",
  description: "每一件衣服，都值得被看见。让 AI 衣橱帮你整理、试穿、搭配和记住真正适合你的穿搭。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
