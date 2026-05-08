"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PremiumTagProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  color?: "pink" | "purple" | "blue" | "green" | "orange";
}

const colorStyles = {
  pink: {
    default: "bg-pink-100/80 text-pink-600 border-pink-200/50",
    selected: "bg-pink-200 text-pink-700 border-pink-300",
    hover: "hover:bg-pink-100 hover:border-pink-300",
  },
  purple: {
    default: "bg-purple-100/80 text-purple-600 border-purple-200/50",
    selected: "bg-purple-200 text-purple-700 border-purple-300",
    hover: "hover:bg-purple-100 hover:border-purple-300",
  },
  blue: {
    default: "bg-blue-100/80 text-blue-600 border-blue-200/50",
    selected: "bg-blue-200 text-blue-700 border-blue-300",
    hover: "hover:bg-blue-100 hover:border-blue-300",
  },
  green: {
    default: "bg-green-100/80 text-green-600 border-green-200/50",
    selected: "bg-green-200 text-green-700 border-green-300",
    hover: "hover:bg-green-100 hover:border-green-300",
  },
  orange: {
    default: "bg-orange-100/80 text-orange-600 border-orange-200/50",
    selected: "bg-orange-200 text-orange-700 border-orange-300",
    hover: "hover:bg-orange-100 hover:border-orange-300",
  },
};

export function PremiumTag({
  children,
  selected = false,
  onClick,
  color = "pink",
}: PremiumTagProps) {
  const styles = colorStyles[color];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        px-5 py-2.5 rounded-[var(--radius-pill)]
        border backdrop-blur-sm
        font-medium text-sm
        transition-all duration-300
        ${selected ? styles.selected : styles.default}
        ${onClick ? `cursor-pointer ${styles.hover}` : "cursor-default"}
      `}
    >
      {children}
    </motion.button>
  );
}

interface PremiumTagGroupProps {
  children: ReactNode;
  className?: string;
}

export function PremiumTagGroup({ children, className = "" }: PremiumTagGroupProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {children}
    </div>
  );
}
