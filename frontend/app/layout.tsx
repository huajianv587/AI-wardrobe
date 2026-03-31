import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Wardrobe",
  description: "Local-first AI wardrobe, 2.5D try-on, and styling assistant."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}