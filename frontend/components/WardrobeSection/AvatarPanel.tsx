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
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-4 md:px-8 md:pb-5 md:pt-24">
        <span className="font-mono text-[0.58rem] tracking-[0.18em] text-[var(--text-secondary)] md:text-[0.62rem] md:tracking-[0.28em]">MODEL / 2.5D</span>
        <GlowButton
          className="shrink-0 px-3 py-2 text-[0.58rem] md:px-4 md:py-2 md:text-[0.64rem]"
          variant="ghost"
          onClick={() => setManualPulseKey((value) => value + 1)}
        >
          SET LOOK
        </GlowButton>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-3 pb-4 md:px-8 md:pb-6">
        <motion.div
          whileHover={{ y: -6, boxShadow: "0 22px 60px rgba(180,120,140,0.16)" }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="avatar-stage avatar-stage--interactive relative h-full w-full max-w-none overflow-hidden rounded-[30px] md:max-w-[460px] md:rounded-[36px]"
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
                  className="relative z-10 mx-auto h-[46vh] max-h-[360px] w-auto max-w-full object-contain md:h-[70vh] md:max-h-[70vh]"
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
              className="absolute left-1/2 top-4 z-20 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full border border-[rgba(var(--accent-rose-rgb),0.22)] bg-white/72 px-3 py-2 text-[0.58rem] tracking-[0.16em] text-[var(--text-secondary)] backdrop-blur md:top-5 md:max-w-[calc(100%-2rem)] md:px-4 md:text-[0.65rem] md:tracking-[0.22em]"
            >
              已试穿 · {selectedItem?.tag ?? "待机展示"}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="relative z-10 px-4 pb-4 md:px-8 md:pb-8">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 18px 42px rgba(180,120,140,0.12)" }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          className="rounded-[22px] border border-[var(--surface-border)] bg-white/76 p-3.5 shadow-[var(--shadow-card)] backdrop-blur-md md:rounded-[24px] md:p-4"
          data-cursor="hover"
        >
          <p className="text-[0.6rem] tracking-[0.22em] text-[var(--text-secondary)] md:text-[0.65rem] md:tracking-[0.28em]">CURRENT LOOK</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={`label-${selectedItem?.id ?? 0}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mt-2 text-base font-medium text-[var(--text-primary)] md:text-lg">
                {selectedItem?.name ?? "挑选一件单品开始试穿"}
              </p>
              <p className="mt-1 text-[0.82rem] text-[var(--text-secondary)] md:text-sm">
                {selectedItem ? `${selectedItem.category} · ${selectedItem.tag}` : "系统会在这里显示当前穿搭反馈"}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
