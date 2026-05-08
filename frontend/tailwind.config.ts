import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        glass: "var(--bg-glass)",
        "glass-hover": "var(--bg-glass-hover)",
        "brand-blue": "var(--brand-blue)",
        "brand-purple": "var(--brand-purple)",
        "brand-pink": "var(--brand-pink)",
        "brand-gold": "var(--brand-gold)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-inverse": "var(--text-inverse)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "border-brand": "var(--border-brand)",
      },
      backgroundImage: {
        "hero-bg": "var(--gradient-hero-bg)",
        "brand-text": "var(--gradient-brand-text)",
        "premium-button": "var(--gradient-button)",
        "hero-glow": "var(--gradient-glow)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        glow: "var(--shadow-glow)",
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)",
        "in-out": "var(--ease-in-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      fontFamily: {
        display: [
          "var(--font-cormorant)",
          "Cormorant Garamond",
          "Songti SC",
          "STSong",
          "serif",
        ],
        sans: [
          "var(--font-dm-sans)",
          "DM Sans",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/container-queries")],
};

export default config;
