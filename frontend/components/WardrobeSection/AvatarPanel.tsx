"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GlowButton } from "@/components/shared/GlowButton";
import type { ClothingItem } from "@/lib/mockData";

interface AvatarPanelProps {
  selectedItem: ClothingItem | null;
}

function FallbackSilhouette() {
  return (
    <div className="avatar-fallback">
      <div className="avatar-fallback__halo" />
      <div className="avatar-fallback__hair" />
      <div className="avatar-fallback__head" />
      <div className="avatar-fallback__body" />
      <div className="avatar-fallback__leg avatar-fallback__leg--left" />
      <div className="avatar-fallback__leg avatar-fallback__leg--right" />
    </div>
  );
}

export function AvatarPanel({ selectedItem }: AvatarPanelProps) {
  const [highlightKey, setHighlightKey] = useState(0);
  const [manualPulseKey, setManualPulseKey] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setHighlightKey((value) => value + 1);
  }, [selectedItem?.id]);

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden bg-[var(--bg-avatar)]"
      style={{ boxShadow: "inset -20px 0 40px rgba(var(--accent-rose-rgb), 0.08)" }}
    >
      <div className="relative z-10 flex items-center justify-between px-5 pb-4 pt-20 md:px-8 md:pb-5 md:pt-24">
        <span className="font-mono text-[0.62rem] tracking-[0.28em] text-[var(--text-secondary)]">MODEL / 2.5D</span>
        <GlowButton
          className="px-4 py-2 text-[0.64rem]"
          variant="ghost"
          onClick={() => setManualPulseKey((value) => value + 1)}
        >
          SET LOOK
        </GlowButton>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-6 md:px-8">
        <motion.div
          whileHover={{ y: -6, boxShadow: "0 22px 60px rgba(180,120,140,0.16)" }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="avatar-stage avatar-stage--interactive relative h-full w-full max-w-[460px] overflow-hidden rounded-[36px]"
          data-cursor="hover"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedItem?.id ?? 0}-${manualPulseKey}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex h-full items-center justify-center"
            >
              {imageFailed ? (
                <FallbackSilhouette />
              ) : (
                <img
                  src="/avatar.jpg"
                  alt={selectedItem ? `模特展示 ${selectedItem.name}` : "模特待机展示"}
                  className="relative z-10 mx-auto w-auto max-w-full object-contain"
                  style={{ height: "70vh", maxHeight: "70vh", objectFit: "contain" }}
                  onError={() => setImageFailed(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            <motion.div
              key={`flash-${highlightKey}-${manualPulseKey}`}
              initial={{ opacity: 0.72, scale: 0.92 }}
              animate={{ opacity: 0, scale: 1.08 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.48, ease: "easeOut" }}
              className="avatar-flash"
            />
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`status-${selectedItem?.id ?? 0}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
              className="absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border border-[rgba(var(--accent-rose-rgb),0.22)] bg-white/72 px-4 py-2 text-[0.65rem] tracking-[0.22em] text-[var(--text-secondary)] backdrop-blur"
            >
              已试穿 · {selectedItem?.tag ?? "待机展示"}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="relative z-10 px-5 pb-6 md:px-8 md:pb-8">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 18px 42px rgba(180,120,140,0.12)" }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="rounded-[24px] border border-[var(--surface-border)] bg-white/76 p-4 shadow-[var(--shadow-card)] backdrop-blur-md"
          data-cursor="hover"
        >
          <p className="text-[0.65rem] tracking-[0.28em] text-[var(--text-secondary)]">CURRENT LOOK</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={`label-${selectedItem?.id ?? 0}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mt-2 text-lg font-medium text-[var(--text-primary)]">
                {selectedItem?.name ?? "挑选一件单品开始试穿"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {selectedItem ? `${selectedItem.category} · ${selectedItem.tag}` : "系统会在这里显示当前穿搭反馈"}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
