"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { HomeWardrobeItem } from "@/lib/home-wardrobe";

interface ClothingCardProps {
  index: number;
  isSelected: boolean;
  item: HomeWardrobeItem;
  onSelect: (item: HomeWardrobeItem) => void;
}

const sparkleOffsets = [
  { x: "-28px", y: "-20px" },
  { x: "0px", y: "-34px" },
  { x: "26px", y: "-18px" },
  { x: "32px", y: "14px" },
  { x: "-12px", y: "30px" },
  { x: "-30px", y: "16px" }
] as const;

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  const numeric = Number.parseInt(normalized, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function ClothingCard({ index, isSelected, item, onSelect }: ClothingCardProps) {
  const [showBurst, setShowBurst] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (!showBurst) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowBurst(false);
    }, 650);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showBurst]);

  const handleSelect = () => {
    setBurstKey((value) => value + 1);
    setShowBurst(true);
    onSelect(item);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.42,
          delay: Math.min(index * 0.05, 0.24),
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } }}
      whileHover={{
        scale: 1.03,
        y: -4,
        boxShadow: "0 12px 40px rgba(180,120,140,0.2)"
      }}
      whileTap={{ scale: 0.97 }}
      role="button"
      tabIndex={0}
      data-cursor="click"
      data-selected={isSelected}
      className="wardrobe-card group min-h-[220px] cursor-pointer outline-none md:min-h-[250px]"
      style={{ boxShadow: "0 4px 20px rgba(180,120,140,0.08)" }}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      aria-label={`选择 ${item.name}`}
    >
      <div
        className="relative flex h-[62%] items-center justify-center overflow-hidden md:h-[65%]"
        style={{
          background: `linear-gradient(160deg, ${hexToRgba(item.primaryColor, 0.96)} 0%, ${item.secondaryColor ?? hexToRgba(item.primaryColor, 0.24)} 58%, rgba(255,255,255,0.92) 100%)`
        }}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 20vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.72),transparent_42%)]" />
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/65 bg-white/42 text-[2.25rem] shadow-[0_18px_32px_rgba(255,255,255,0.18)] backdrop-blur-md md:h-20 md:w-20 md:text-[2.5rem]">
          {item.imageUrl ? "✨" : item.emoji}
        </div>
      </div>

      <div className="flex h-[38%] items-center justify-between gap-3 px-3.5 py-3 md:h-[35%] md:px-4">
        <div className="min-w-0">
          <p className="truncate text-[0.92rem] font-medium text-[var(--text-primary)]">{item.name}</p>
          <span className="mt-2 inline-flex rounded-full bg-[rgba(var(--accent-rose-rgb),0.92)] px-2.5 py-1 text-[0.58rem] text-white md:text-[0.62rem]">
            {item.tag}
          </span>
        </div>
        <div className="shrink-0 rounded-full border border-[rgba(var(--accent-rose-rgb),0.22)] bg-white/75 p-2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-rose-deep)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-transparent stroke-current transition-all duration-300 group-hover:fill-[var(--accent-rose)]">
            <path
              d="M12 20.6 4.7 13.6a4.7 4.7 0 0 1 6.6-6.7L12 7.6l.7-.7a4.7 4.7 0 0 1 6.6 6.7L12 20.6Z"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {showBurst ? (
        <div key={burstKey} className="card-burst">
          {sparkleOffsets.map((offset, sparkleIndex) => (
            <span
              key={`${item.id}-${burstKey}-${sparkleIndex}`}
              className="sparkle-dot"
              style={
                {
                  "--tx": offset.x,
                  "--ty": offset.y
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}
