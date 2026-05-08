"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef, ReactNode } from "react";

type ButtonVariant =
  | "primary"      // 主要按钮 - 粉色渐变
  | "secondary"    // 次要按钮 - 橙粉渐变
  | "outline"      // 描边按钮 - 粉色边框
  | "ghost"        // 幽灵按钮 - 透明背景
  | "glow-inner"   // 闪光按钮 - 内光效果
  | "glow-outer";  // 光晕按钮 - 外光效果

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      icon,
      iconPosition = "left",
      className = "",
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: `
        text-white shadow-[0_4px_14px_rgba(200,168,255,0.28)]
        hover:shadow-[0_8px_28px_rgba(200,168,255,0.36)]
      `,
      secondary: `
        text-white shadow-[0_4px_14px_rgba(240,160,192,0.28)]
        hover:shadow-[0_8px_28px_rgba(240,160,192,0.36)]
      `,
      outline: `
        bg-transparent border-2 border-[var(--border-brand)]
        text-[var(--brand-purple)] shadow-none
        hover:bg-[var(--bg-glass-hover)] hover:border-[var(--brand-purple)]
      `,
      ghost: `
        bg-transparent text-[var(--brand-purple)]
        hover:bg-[var(--bg-glass-hover)]
      `,
      "glow-inner": `
        relative text-white shadow-[0_4px_14px_rgba(200,168,255,0.34)]
        hover:shadow-[0_8px_32px_rgba(200,168,255,0.42)]
        overflow-hidden
      `,
      "glow-outer": `
        relative text-white shadow-[0_4px_14px_rgba(200,168,255,0.34)]
        hover:shadow-[0_0_40px_rgba(200,168,255,0.5)]
        overflow-hidden
      `,
    };

    const sizeStyles = {
      sm: "px-6 py-2.5 text-sm rounded-[var(--radius-pill)]",
      md: "px-8 py-3.5 text-base rounded-[var(--radius-pill)]",
      lg: "px-10 py-4 text-lg rounded-[var(--radius-pill)]",
    };

    const hasGlow = variant === "glow-inner" || variant === "glow-outer";

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={{ y: disabled ? 0 : -2 }}
        whileTap={{ y: 0, scale: disabled ? 1 : 0.98 }}
        transition={{ duration: 0.2, ease: [0.43, 0.13, 0.23, 0.96] }}
        style={{
          background:
            variant === "outline" || variant === "ghost"
              ? undefined
              : "var(--gradient-button)",
          ...style,
        }}
        className={`
          relative
          inline-flex items-center justify-center gap-2
          font-semibold
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {/* 内光效果 */}
        {variant === "glow-inner" && (
          <motion.div
            className="absolute inset-0 rounded-[var(--radius-pill)]"
            animate={{
              background: [
                "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* 旋转光晕效果 */}
        {variant === "glow-outer" && (
          <motion.div
            className="absolute inset-0 rounded-[var(--radius-pill)] opacity-0 hover:opacity-100"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            }}
          />
        )}

        {/* 按钮内容 */}
        <span className={`relative z-10 flex items-center gap-2 ${hasGlow ? "mix-blend-normal" : ""}`}>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "right" && icon}
        </span>
      </motion.button>
    );
  }
);

PremiumButton.displayName = "PremiumButton";
