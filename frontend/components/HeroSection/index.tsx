"use client";

import { useGSAP } from "@gsap/react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useRef } from "react";

import { GlowButton } from "@/components/shared/GlowButton";
import { FloatingPetals } from "./FloatingPetals";
import { NavBar } from "./NavBar";
import { VideoMask } from "./VideoMask";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const softTags = [
  { label: "AI试衣", tone: "primary", href: "/try-on" },
  { label: "心动搭配", tone: "ghost", href: "/recommend" },
  { label: "云端衣橱", tone: "ghost", href: "/wardrobe" }
] as const;

const moodCards = [
  {
    title: "今日灵感",
    body: "通勤与约会的温柔切片",
    accent: "rose"
  },
  {
    title: "小小心愿单",
    body: "把想穿的那一套先悄悄存好",
    accent: "gold"
  }
] as const;

const miniNotes = ["奶油白衬衫", "樱粉半裙", "通勤气质包"] as const;
const weatherNotes = ["22°C 晴柔", "微风轻拂", "适合薄针织"] as const;
const diaryDays: ReadonlyArray<{ day: string; date: string; active?: boolean }> = [
  { day: "Mon", date: "03" },
  { day: "Tue", date: "04" },
  { day: "Wed", date: "05", active: true },
  { day: "Thu", date: "06" }
];

interface HeroSectionProps {
  onNavigateHome: () => void;
  onStartTryOn: () => void;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

export function HeroSection({
  onNavigateHome,
  onStartTryOn,
  scrollContainerRef
}: HeroSectionProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const weatherFloat = reducedMotion
    ? {}
    : {
        animate: { y: [0, -8, 0], scale: [1, 1.01, 1] },
        transition: { duration: 6.8, repeat: Infinity, ease: "easeInOut" as const }
      };
  const diaryFloat = reducedMotion
    ? {}
    : {
        animate: { y: [0, -10, 0], scale: [1, 1.012, 1] },
        transition: { duration: 7.4, repeat: Infinity, ease: "easeInOut" as const, delay: 0.5 }
      };
  const radarFloat = reducedMotion
    ? {}
    : {
        animate: { y: [0, -7, 0], scale: [1, 1.01, 1] },
        transition: { duration: 6.2, repeat: Infinity, ease: "easeInOut" as const, delay: 0.9 }
      };

  useGSAP(
    () => {
      if (reducedMotion || !rootRef.current) {
        return;
      }

      const scroller = scrollContainerRef.current ?? undefined;
      const resetHeroCopy = () => {
        if (contentRef.current) {
          gsap.set(contentRef.current, { clearProps: "transform,opacity" });
        }
      };

      resetHeroCopy();

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          scroller,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
          onEnterBack: resetHeroCopy,
          onLeaveBack: resetHeroCopy,
          onRefresh: resetHeroCopy
        }
      });

      timeline.fromTo(mediaRef.current, { yPercent: 0, scale: 1, opacity: 1 }, { yPercent: -6, scale: 0.985, opacity: 0.82, ease: "none" }, 0);
    },
    { scope: rootRef, dependencies: [reducedMotion, scrollContainerRef] }
  );

  return (
    <div ref={rootRef} className="hero-surface relative flex min-h-[100svh] flex-col overflow-hidden md:h-screen">
      <NavBar onNavigateHome={onNavigateHome} />
      <FloatingPetals />

      <div className="hero-stage-wrap relative z-10 flex flex-1 items-center">
        <motion.div
          className="hero-stage mx-auto grid w-full items-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div ref={contentRef} className="hero-copy-panel">
              <div className="hero-copy-panel__orb hero-copy-panel__orb--rose" />
              <div className="hero-copy-panel__orb hero-copy-panel__orb--gold" />

              <div className="hero-badge-row">
                <div className="hero-copy-anchor" aria-hidden="true">
                  <span className="hero-copy-anchor__dot" />
                  <span className="hero-copy-anchor__line" />
                </div>
                <span className="hero-kicker">
                  <span className="hero-kicker__dot" aria-hidden="true" />
                  Soft digital wardrobe
                </span>
              </div>

              <h1 className="hero-title mt-5">
                <span className="hero-title__line">让今天穿什么</span>
                <span className="hero-title__line">
                  变成一件
                  <span className="hero-title__accent">心动</span>
                  的小事
                </span>
              </h1>

              <p className="hero-whisper mt-6">像翻开一本柔软的时尚手帐，慢慢找到今天最想穿的自己。</p>

              <div className="mt-7 flex flex-wrap gap-3.5">
                {softTags.map((tag) => (
                  <motion.button
                    key={tag.label}
                    type="button"
                    onClick={() => router.push(tag.href)}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`hero-soft-tag hero-soft-tag--${tag.tone}`}
                    data-cursor="hover"
                  >
                    {tag.label}
                  </motion.button>
                ))}
              </div>

              <div className="hero-card-grid mt-10">
                {moodCards.map((card, index) => (
                  <motion.article
                    key={card.title}
                    whileHover={{ y: -6, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    className={`hero-note-card hero-note-card--${card.accent}`}
                    data-cursor="hover"
                  >
                    <span className="hero-note-card__index">0{index + 1}</span>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </motion.article>
                ))}
              </div>

              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="hero-mini-board mt-10"
                data-cursor="hover"
              >
                <div className="hero-mini-board__header">
                  <span className="hero-mini-board__eyebrow">TODAY WISHLIST</span>
                  <span className="hero-mini-board__spark">Soft Pink</span>
                </div>
                <div className="hero-mini-board__list">
                  {miniNotes.map((note) => (
                    <span key={note} className="hero-mini-chip">
                      {note}
                    </span>
                  ))}
                </div>
              </motion.div>

              <div className="hero-cta-block mt-10">
                <div className="flex flex-wrap gap-4">
                  <GlowButton className="px-6" variant="filled" onClick={onStartTryOn}>
                    开始试衣
                  </GlowButton>
                  <GlowButton className="px-6" variant="ghost" onClick={() => router.push("/wardrobe")}>
                    浏览衣橱
                  </GlowButton>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="hero-signature mt-5"
                >
                  每一件衣服，都值得被看见
                </motion.p>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.76, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="hero-editorial-rail"
          >
            <div className="hero-editorial-rail__glow" aria-hidden="true" />

            <motion.div
              whileHover={{ y: -4, rotate: -1 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="hero-editorial-card hero-editorial-card--weather hero-editorial-card--alive"
              data-cursor="hover"
              {...weatherFloat}
            >
              <span className="hero-editorial-card__eyebrow">today weather</span>
              <h3>今天天气</h3>
              <div className="hero-editorial-card__chips">
                {weatherNotes.map((note) => (
                  <span key={note} className="hero-editorial-chip">
                    {note}
                  </span>
                ))}
              </div>
            </motion.div>

            <div className="hero-editorial-line" aria-hidden="true">
              <span className="hero-editorial-line__dot" />
              <span className="hero-editorial-line__stroke" />
              <span className="hero-editorial-line__dot hero-editorial-line__dot--end" />
            </div>

            <motion.button
              type="button"
              onClick={() => router.push("/outfit-diary")}
              whileHover={{ y: -4, rotate: 0.8 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="hero-editorial-card hero-editorial-card--diary hero-editorial-card--alive hero-editorial-card--action"
              data-cursor="hover"
              {...diaryFloat}
            >
              <span className="hero-editorial-card__eyebrow">outfit diary</span>
              <h3>穿搭日历</h3>
              <div className="hero-diary-grid">
                {diaryDays.map((item) => (
                  <span
                    key={`${item.day}-${item.date}`}
                    className={`hero-diary-pill${item.active ? " hero-diary-pill--active" : ""}`}
                  >
                    <em>{item.day}</em>
                    <strong>{item.date}</strong>
                  </span>
                ))}
              </div>
              <p className="hero-diary-note">点进去会展开整月日历、当日穿搭和行李箱模式。</p>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => router.push("/style-profile")}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="hero-editorial-card hero-editorial-card--mini hero-editorial-card--radar hero-editorial-card--alive hero-editorial-card--action"
              data-cursor="hover"
              {...radarFloat}
            >
              <span className="hero-editorial-card__eyebrow">style radar</span>
              <h3>风格雷达</h3>
              <div className="hero-style-radar-wrap">
                <div className="hero-style-radar" aria-hidden="true">
                  <span className="hero-style-radar__ring hero-style-radar__ring--outer" />
                  <span className="hero-style-radar__ring hero-style-radar__ring--inner" />
                  <span className="hero-style-radar__axis hero-style-radar__axis--vertical" />
                  <span className="hero-style-radar__axis hero-style-radar__axis--diag-a" />
                  <span className="hero-style-radar__axis hero-style-radar__axis--diag-b" />
                  <svg viewBox="0 0 120 120" className="hero-style-radar__shape">
                    <polygon points="60,18 91,44 80,88 40,96 25,52" />
                  </svg>
                  <span className="hero-style-radar__dot hero-style-radar__dot--top" />
                  <span className="hero-style-radar__dot hero-style-radar__dot--right" />
                  <span className="hero-style-radar__dot hero-style-radar__dot--bottom" />
                  <span className="hero-style-radar__dot hero-style-radar__dot--left" />
                  <span className="hero-style-radar__dot hero-style-radar__dot--mid" />
                </div>
              </div>
              <div className="hero-style-radar__legend">
                <span>甜感</span>
                <span>轻盈</span>
                <span>通勤</span>
              </div>
              <span className="hero-editorial-link">前往风格画像 →</span>
            </motion.button>
          </motion.aside>

          <motion.div
            ref={mediaRef}
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="hero-video-column"
          >
            <VideoMask />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
