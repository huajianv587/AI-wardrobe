"use client";

import Link from "next/link";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Camera,
  Check,
  CloudSun,
  Heart,
  Play,
  ScanFace,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  SunMedium,
  Tags,
  Wand2
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimeClosetScene } from "@/components/ui/anime-closet-scene";
import { CuteInteractionLayer } from "@/components/ui/cute-interaction-layer";

const heroVideoSrc = "";
// Replace `heroVideoSrc` with your MP4 path, for example:
// const heroVideoSrc = "/videos/ai-wardrobe-hero.mp4";

const displayStyle = { fontFamily: "var(--font-display)", fontWeight: 520 } as const;
const labelStyle = { fontFamily: "var(--font-label)" } as const;
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const navItems: Array<{
  label: string;
  href: string;
  icon: typeof Heart;
  accent: string;
}> = [
  { label: "品牌故事", href: "#story", icon: Heart, accent: "bg-[#ffe7df] text-[#f2a08b]" },
  { label: "核心能力", href: "#capabilities", icon: Sparkles, accent: "bg-[#fff0d5] text-[#e1aa55]" },
  { label: "今日推荐", href: "#looks", icon: SunMedium, accent: "bg-[#eef7f1] text-[#89b79a]" },
  { label: "风格探索", href: "#style", icon: Shirt, accent: "bg-[#edf2ff] text-[#8ea4d6]" },
  { label: "常见问题", href: "#faq", icon: Star, accent: "bg-[#ffeef3] text-[#ea8ba3]" }
];

const heroHighlights = [
  "先走进一个暖暖的小衣橱，再决定今天想从哪里开始",
  "让 AI 陪你，重新发现每一件衣服",
  "从杂乱，到心动",
  "今天穿什么，不必再着急"
];

const softMoments = [
  {
    title: "今天的晨光推荐",
    text: "根据天气、心情和你最近最常穿的颜色，轻轻推一套不费力但很好看的搭配。"
  },
  {
    title: "真实衣橱慢慢长出来",
    text: "先把衣服收进来，再补标签，之后 AI 的建议才会越来越像你的生活。"
  }
];

const storyCards = [
  {
    eyebrow: "Warm Welcome",
    title: "不是冷冰冰的工具，而是一间会陪你的衣橱小屋",
    description: "打开首页，不是被功能压住，而是先看见晨光、布料、柔软的颜色和一点点轻盈心情。",
    icon: Heart,
    accent: "from-[#ffe2dc] via-white to-[#fff8f1]",
    chips: ["柔雾粉", "晨光感", "陪伴式体验"]
  },
  {
    eyebrow: "Closet Memory",
    title: "把每件衣服慢慢记住，也把你的偏爱慢慢记住",
    description: "喜欢裸粉、偏爱长裙、下雨天更想穿软针织，这些都能一点点被记录下来。",
    icon: Tags,
    accent: "from-[#eff8f1] via-white to-[#fffdf8]",
    chips: ["标签更细", "推荐更准", "风格更像你"]
  },
  {
    eyebrow: "Soft Intelligence",
    title: "你的衣橱，也可以温柔又聪明",
    description: "当数据变厚，AI 会把今日推荐、补缺提醒、出门穿搭都整理得更轻松。",
    icon: Sparkles,
    accent: "from-[#fff1d9] via-white to-[#ffece3]",
    chips: ["不催促", "不打断", "刚刚好的帮助"]
  }
];

const capabilityCards = [
  {
    title: "拍照入柜，先把真实衣物安放好",
    description: "把上衣、裤子、裙子、鞋履和配饰分门别类收起来，像整理自己的小店陈列。",
    icon: Camera,
    badge: "真实衣橱入库",
    accent: "from-[#ffe4db] via-white to-[#fff8f2]",
    notes: ["支持按品类慢慢补齐", "之后再加颜色、季节、场景标签"]
  },
  {
    title: "AI 会看天气，也会看你的心情",
    description: "今天想轻一点、软一点，还是想穿得更有精神，它都能给出温柔而明确的方向。",
    icon: CloudSun,
    badge: "今日穿搭提醒",
    accent: "from-[#edf7f2] via-white to-[#fbf7ef]",
    notes: ["天气感知", "场景建议", "情绪化搭配提示"]
  },
  {
    title: "试衣不必着急，先看见感觉再决定",
    description: "把试穿、预览和搭配比对做成更沉浸的体验，不再只是冷静的结果列表。",
    icon: ScanFace,
    badge: "虚拟试衣预览",
    accent: "from-[#eef4ff] via-white to-[#fff8f1]",
    notes: ["两套穿搭对比", "镜前预览", "重点单品替换"]
  },
  {
    title: "像懂穿搭的朋友一样，悄悄帮你挑选",
    description: "不需要每次都从头想起，AI 会根据衣橱内容给你今天最值得先试的一套。",
    icon: Bot,
    badge: "温柔的搭配助手",
    accent: "from-[#fff1e8] via-white to-[#eef7f1]",
    notes: ["少思考模式", "补缺提醒", "出门前最后确认"]
  }
];

const lookCards = [
  {
    title: "奶油针织 x 杏色半裙",
    mood: "适合带一点晨光出门",
    weather: "26°C / 微风 / 好天气",
    match: "今日心动 92%",
    accent: "from-[#ffe3d7] via-[#fff6ef] to-[#f4fbf6]",
    tags: ["通勤也温柔", "镜子前一眼通过", "不用多想"]
  },
  {
    title: "浅粉开衫 x 牛仔裙",
    mood: "下午去咖啡馆刚刚好",
    weather: "轻松散步模式",
    match: "今日灵感",
    accent: "from-[#ffe9ee] via-white to-[#fff8f1]",
    tags: ["可爱一点", "轻盈一点", "拍照很上镜"]
  },
  {
    title: "雾粉衬衫 x 白裤",
    mood: "把干净和松弛穿在身上",
    weather: "室内工作日",
    match: "AI 正在推荐",
    accent: "from-[#f1f7ef] via-white to-[#fff3ea]",
    tags: ["很耐看", "很舒服", "适合今天"]
  }
];

const closetCards = [
  {
    title: "柔软上衣",
    amount: "28 件",
    description: "针织、衬衫、短上衣都被安静地排好了顺序。",
    icon: Shirt,
    chips: ["奶油白", "裸粉", "柔软面料"]
  },
  {
    title: "会心动的裙子",
    amount: "14 件",
    description: "长裙、百褶裙和适合约会的小裙摆，都在等被重新搭配。",
    icon: Sparkles,
    chips: ["杏色", "轻纱", "约会感"]
  },
  {
    title: "鞋履与小配件",
    amount: "19 件",
    description: "鞋子、包包、发饰和耳饰，让整体穿搭更完整。",
    icon: ShoppingBag,
    chips: ["低饱和", "小配件", "加分细节"]
  },
  {
    title: "天气友好的外搭",
    amount: "11 件",
    description: "小外套、罩衫和开衫，负责照顾早晚温差和安全感。",
    icon: CloudSun,
    chips: ["薄开衫", "轻外套", "雨天备用"]
  },
  {
    title: "风格标签簿",
    amount: "37 枚",
    description: "从温柔可爱到日常松弛，每一种风格都开始有自己的名字。",
    icon: Tags,
    chips: ["少女感", "法式轻柔", "通勤松弛"]
  },
  {
    title: "今日推荐池",
    amount: "8 套",
    description: "AI 已经帮你把今天最值得先试的几套放到了前面。",
    icon: Wand2,
    chips: ["优先试穿", "按天气排序", "按心情排序"]
  }
];

const styleTags = [
  "晨光奶油",
  "温柔上班日",
  "轻盈编辑感",
  "约会前的好心情",
  "小裙摆优先",
  "下雨天也软软的",
  "奶油杏色系",
  "今天想穿得可爱一点",
  "镜前一下子就会点头",
  "日常也像小品牌广告",
  "周末散步",
  "安静却会被记住"
];

const flowSteps = [
  {
    step: "01",
    title: "拍一拍衣服",
    description: "先把真实衣物收进来，不用一次做完，慢慢补也没关系。",
    icon: Camera
  },
  {
    step: "02",
    title: "补一点标签",
    description: "颜色、季节、场景、版型和心情，会让衣橱逐渐长出自己的语言。",
    icon: Tags
  },
  {
    step: "03",
    title: "让 AI 开始陪你挑",
    description: "今天适合什么、哪套更顺眼、哪件最值得先穿，都能被温柔提示。",
    icon: Bot
  },
  {
    step: "04",
    title: "从杂乱，到心动",
    description: "当每件衣服都被看见，穿搭这件事就不再让人着急了。",
    icon: Heart
  }
];

const faqs = [
  {
    question: "现在没有很多衣服数据，也能开始用吗？",
    answer: "可以。这个首页就是为“慢慢开始的人”准备的，先上传几件最常穿的，衣橱也会一点点变完整。"
  },
  {
    question: "如果今天没有想法，它能直接给我一套吗？",
    answer: "可以，AI 会参考天气、场景和你最近偏爱的风格，优先给出一套最容易穿出门的建议。"
  },
  {
    question: "会不会推荐得很像模板，看起来不像我？",
    answer: "前期会比较温和，随着你的真实衣橱和标签变多，推荐会越来越像你自己的习惯和审美。"
  },
  {
    question: "虚拟试衣是首页就能做的吗？",
    answer: "首页更像品牌入口和氛围场，真正的试穿预览会在试衣页里完成，体验会更沉浸。"
  },
  {
    question: "视频主视觉现在没有素材怎么办？",
    answer: "代码里已经预留了 MP4 的位置，先用品牌感占位场景撑起氛围，后面替换成正式短片就能直接上线。"
  },
  {
    question: "这个产品最适合什么样的人？",
    answer: "适合总想把衣橱整理得更顺一点、又希望有人帮自己少想一点穿搭的人。"
  }
];

function updatePointerGlow(event: ReactPointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
  target.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
}

function resetPointerGlow(event: ReactPointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--glow-x", "50%");
  event.currentTarget.style.setProperty("--glow-y", "50%");
}

function Reveal({
  children,
  className,
  delay = 0
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <span
        style={labelStyle}
        className="inline-flex items-center rounded-full border border-white/80 bg-white/70 px-4 py-2 text-[11px] tracking-[0.22em] text-[var(--muted)] shadow-[0_18px_40px_rgba(148,113,95,0.08)] backdrop-blur-md"
      >
        {eyebrow}
      </span>
      <h2
        style={displayStyle}
        className="mt-5 max-w-[15.5em] text-[clamp(1.45rem,2.2vw,2.12rem)] leading-[1.18] tracking-[-0.024em] text-[var(--ink-strong)]"
      >
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-[2.05] text-[var(--muted)] md:text-[16px]">{description}</p>
    </div>
  );
}

function HeaderBar() {
  return (
    <header className="relative z-20 mx-auto w-full max-w-7xl px-4 pt-5 md:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -12, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease }}
        className="grid items-center gap-4 rounded-[36px] border border-white/72 bg-white/74 px-4 py-3 shadow-[0_28px_56px_rgba(148,113,95,0.12)] backdrop-blur-2xl md:grid-cols-[auto_1fr_auto] md:px-6"
      >
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffd8cb_0%,#fff6ef_55%,#dff5eb_100%)] text-[var(--ink-strong)] shadow-[0_14px_28px_rgba(148,113,95,0.14)]">
            <Shirt className="size-5" />
          </span>
          <span className="min-w-0">
            <strong style={displayStyle} className="block whitespace-nowrap text-[1.62rem] leading-none text-[var(--ink-strong)]">
              AI 衣橱
            </strong>
            <span style={labelStyle} className="block whitespace-nowrap pt-1 text-[11px] tracking-[0.26em] text-[var(--muted)]">
              GENTLE STYLING HOUSE
            </span>
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-1 px-3 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <motion.div key={item.href} whileHover={{ y: -1.5 }} transition={{ duration: 0.2, ease }}>
                <Link
                  href={item.href}
                  data-cute="true"
                  className="group relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-[15px] font-medium tracking-[0.01em] text-[var(--muted)] transition duration-200 hover:bg-white/56 hover:text-[var(--ink-strong)]"
                >
                  <span className={`flex size-6 items-center justify-center rounded-full ${item.accent} opacity-72 transition duration-200 group-hover:opacity-100`}>
                    <Icon className="size-3.5" />
                  </span>
                  <span>{item.label}</span>
                  <span className="pointer-events-none absolute inset-x-4 bottom-[7px] h-px origin-center scale-x-0 bg-[linear-gradient(90deg,transparent,rgba(63,40,27,0.22),transparent)] transition duration-300 group-hover:scale-x-100" />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Link
            href="/assistant"
            data-cute="true"
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            className="pointer-glow-surface premium-hover-lift hidden whitespace-nowrap rounded-full border border-white/80 bg-white/82 px-5 py-3 text-sm font-medium text-[var(--ink)] shadow-[0_14px_28px_rgba(148,113,95,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(148,113,95,0.12)] md:inline-flex"
          >
            看看助手
          </Link>
          <Link
            href="/wardrobe"
            data-cute="true"
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            className="pointer-glow-surface premium-hover-lift inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-[linear-gradient(135deg,#ffd9cc_0%,#fff6ef_46%,#def4e8_100%)] px-5 py-3 text-sm font-medium text-[var(--ink-strong)] shadow-[0_18px_34px_rgba(148,113,95,0.12)] transition hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_22px_42px_rgba(148,113,95,0.16)]"
          >
            开始整理
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </motion.div>
    </header>
  );
}

function HeroFilmPanel() {
  return (
    <Reveal className="relative" delay={0.1}>
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ y: -6, scale: 1.006 }}
        className="surface-grain group relative overflow-hidden rounded-[42px] border border-white/70 bg-white/58 p-4 shadow-[0_46px_130px_rgba(165,118,104,0.2)] backdrop-blur-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 18%, rgba(255,219,205,0.92), transparent 22%), radial-gradient(circle at 85% 18%, rgba(249,238,206,0.6), transparent 18%), radial-gradient(circle at 80% 82%, rgba(214,239,225,0.72), transparent 26%), linear-gradient(145deg, rgba(255,255,255,0.46), rgba(255,247,240,0.2))"
          }}
        />

        <div className="relative flex items-center justify-between px-1 pb-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#ffb6a0]" />
            <span className="size-2 rounded-full bg-[#ffe1a5]" />
            <span className="size-2 rounded-full bg-[#bfe1cf]" />
          </div>
          <span style={labelStyle} className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] tracking-[0.24em] text-[var(--muted)] backdrop-blur-md">
            HERO FILM
          </span>
        </div>

        <div className="film-vignette relative aspect-[5/6] overflow-hidden rounded-[32px] border border-white/80 bg-[#f9e4dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          {/* Hero video storyboard suggestion for `ai-wardrobe-hero.mp4` (10-20s):
              1. Wide shot: a warm pink bedroom and wardrobe, sunlight entering the room.
              2. Mid shot: a girl walks to the wardrobe and gently opens the door.
              3. Close-up: hangers, dress fabric, buttons, labels, and small accessories.
              4. Medium close-up: she compares two outfits in front of the mirror.
              5. Close-up overlay: AI styling card, today's pick, weather styling hint.
              6. Ending shot: she chooses one look, then the CTA copy softly appears. */}
          {heroVideoSrc ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="AI 衣橱首页主视觉视频"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={heroVideoSrc} type="video/mp4" />
            </video>
          ) : (
            <AnimeClosetScene />
          )}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.18),transparent_18%),linear-gradient(118deg,rgba(255,255,255,0.22),transparent_24%,transparent_64%,rgba(255,248,240,0.18)_84%,transparent)]" />

          <div className="absolute left-4 top-4">
            <span className="rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-[10px] tracking-[0.04em] text-[var(--ink)] shadow-[0_12px_26px_rgba(148,113,95,0.1)] backdrop-blur-md">
              柔粉房间 / 晨光叙事 / 服装广告感
            </span>
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/84 px-4 py-2 text-[11px] text-[var(--ink)] shadow-[0_14px_28px_rgba(148,113,95,0.1)]">
              <Bot className="size-3.5 text-[#7aa68b]" />
              AI 正在帮你搭配
            </span>
            <span className="hidden rounded-full border border-white/80 bg-[#fff5ef]/84 px-3 py-2 text-[10px] text-[var(--ink)] shadow-[0_14px_28px_rgba(148,113,95,0.08)] md:inline-flex">
              {heroVideoSrc ? "广告片已接入" : "等待 MP4 替换中"}
            </span>
          </div>

          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
            <div className="surface-grain max-w-[70%] rounded-[24px] border border-white/75 bg-white/78 px-4 py-3 shadow-[0_18px_40px_rgba(148,113,95,0.14)] backdrop-blur-md">
              <p style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">AI Wardrobe Film</p>
              <p className="mt-1 text-[13px] leading-6 text-[var(--ink)]">像品牌广告 KV 一样，先让人相信这是一间值得停留的衣橱空间。</p>
            </div>

            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="pointer-glow-surface premium-hover-lift flex size-16 items-center justify-center rounded-full border border-white/80 bg-white/82 shadow-[0_22px_44px_rgba(148,113,95,0.18)] backdrop-blur-md"
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
            >
              <Play className="ml-1 size-6 text-[#f08c76]" fill="currentColor" />
            </motion.div>
          </div>
        </div>

        <div className="relative mt-4 grid gap-3 md:grid-cols-3">
          {[
            { title: "镜前比对", text: "两套衣服一放在一起，就更容易选。", icon: Sparkles },
            { title: "天气叠加", text: "今天适合开衫还是短袖，先替你想一步。", icon: SunMedium },
            { title: "推荐卡片", text: "把心动概率高的单品放到最前面。", icon: Wand2 }
          ].map(({ title, text, icon: Icon }, index) => (
            <motion.div
              key={title}
              data-cute="true"
              whileHover={{ y: -4, rotate: index % 2 === 0 ? -0.35 : 0.35 }}
              className="pointer-glow-surface premium-hover-lift rounded-[24px] border border-white/70 bg-white/72 p-4 shadow-[0_18px_36px_rgba(148,113,95,0.1)] backdrop-blur-md"
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
            >
              <div className="flex items-center gap-2 text-[var(--ink-strong)]">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-[#fff4ee] text-[#f08c76]">
                  <Icon className="size-4" />
                </span>
                <p className="text-sm font-medium">{title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Reveal>
  );
}

function HeroSection() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:pt-6">
      <Reveal className="relative">
        <span
          style={labelStyle}
          className="inline-flex items-center rounded-full border border-white/80 bg-white/74 px-4 py-2 text-[11px] tracking-[0.22em] text-[var(--muted)] shadow-[0_18px_40px_rgba(148,113,95,0.08)] backdrop-blur-md"
        >
          温柔、可爱、会动、像生活方式品牌一样的 AI 衣橱首页
        </span>
        <h1
          style={displayStyle}
          className="mt-6 max-w-[11.4em] text-[clamp(1.88rem,3.72vw,3.4rem)] leading-[1.08] tracking-[-0.028em] text-[var(--ink-strong)]"
        >
          先走进一个暖暖的小衣橱，再决定今天想从哪里开始。
        </h1>
        <p className="mt-6 max-w-[39rem] text-[15px] leading-[2.08] text-[var(--muted)] md:text-[17px]">
          这里不是一张把功能一次说完的后台页面，而像一段柔软的品牌开场。你先看见晨光、镜子、衣架和可爱的搭配提示，再慢慢把真实衣物收进来，让 AI 陪你重新发现每一件衣服。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/wardrobe"
            data-cute="true"
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            className="pointer-glow-surface premium-hover-lift inline-flex items-center gap-2 rounded-full border border-white/80 bg-[linear-gradient(135deg,#ffd8cb_0%,#fff7ef_44%,#def4e8_100%)] px-6 py-3.5 text-sm font-medium text-[var(--ink-strong)] shadow-[0_20px_44px_rgba(148,113,95,0.12)] transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_28px_52px_rgba(148,113,95,0.16)]"
          >
            开始整理衣橱
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/recommend"
            data-cute="true"
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            className="pointer-glow-surface premium-hover-lift inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/76 px-6 py-3.5 text-sm font-medium text-[var(--ink)] shadow-[0_16px_34px_rgba(148,113,95,0.08)] transition hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_24px_44px_rgba(148,113,95,0.12)]"
          >
            看今日穿搭推荐
            <Sparkles className="size-4 text-[#f08c76]" />
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {softMoments.map((item, index) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -6, rotate: index % 2 === 0 ? -0.5 : 0.5 }}
              className="pointer-glow-surface premium-hover-lift rounded-[28px] border border-white/80 bg-white/72 p-5 shadow-[0_22px_48px_rgba(148,113,95,0.1)] backdrop-blur-md"
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
            >
              <p className="text-[14px] font-medium tracking-[0.01em] text-[var(--ink-strong)]">{item.title}</p>
              <p className="mt-3 text-[14px] leading-7 text-[var(--muted)]">{item.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {heroHighlights.map((item, index) => (
            <motion.span
              key={item}
              animate={{ y: [0, index % 2 === 0 ? -5 : -3, 0] }}
              transition={{ duration: 4.8 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center rounded-full border border-white/80 bg-white/78 px-4 py-2 text-[13px] leading-6 text-[var(--ink)] shadow-[0_14px_30px_rgba(148,113,95,0.08)] backdrop-blur-md"
            >
              {item}
            </motion.span>
          ))}
        </div>
      </Reveal>

      <HeroFilmPanel />
    </section>
  );
}

function StorySection() {
  return (
    <section id="story" className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
      <Reveal className="rounded-[36px] border border-white/75 bg-white/60 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
        <SectionHeading
          eyebrow="BRAND STORY"
          title="像逛一间暖暖的小品牌空间，而不是像在看一个冷静的功能总表。"
          description="首页先负责情绪、氛围和记忆点，把人轻轻带进来。真正的整理、试衣、推荐和助手，再被分配到各自更完整的页面里。"
        />

        <div className="mt-8 grid gap-4">
          {[
            "先有一个想停留的首页，用户才愿意往下走。",
            "每段内容像分区陈列，慢慢呈现，不急着一次说完。",
            "页面里每一个卡片都像一张小小的穿搭便签。"
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-[24px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,241,235,0.95),rgba(255,255,255,0.78))] px-4 py-4 shadow-[0_18px_36px_rgba(148,113,95,0.08)]"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white/80 text-[#f08c76] shadow-[0_10px_22px_rgba(148,113,95,0.08)]">
                <Check className="size-4" />
              </span>
              <p className="text-sm leading-7 text-[var(--ink)]">{item}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        {storyCards.map(({ eyebrow, title, description, icon: Icon, accent, chips }, index) => (
          <Reveal key={title} delay={index * 0.08}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -8, rotate: index % 2 === 0 ? -0.6 : 0.6 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className={`pointer-glow-surface premium-hover-lift surface-grain h-full rounded-[32px] border border-white/80 bg-gradient-to-br ${accent} p-6 shadow-[0_24px_54px_rgba(148,113,95,0.12)]`}
            >
              <span className="inline-flex size-12 items-center justify-center rounded-[20px] bg-white/78 text-[var(--ink-strong)] shadow-[0_14px_30px_rgba(148,113,95,0.08)]">
                <Icon className="size-5" />
              </span>
              <p style={labelStyle} className="mt-5 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                {eyebrow}
              </p>
              <h3 style={displayStyle} className="mt-3 text-[1.55rem] leading-[1.14] tracking-[-0.03em] text-[var(--ink-strong)]">
                {title}
              </h3>
              <p className="mt-4 text-[14px] leading-[1.95] text-[var(--muted)]">{description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/80 bg-white/76 px-3 py-1.5 text-xs text-[var(--ink)]">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="rounded-[40px] border border-white/75 bg-white/58 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
      <Reveal>
        <SectionHeading
          eyebrow="AI CAPABILITIES"
          title="AI 衣橱的核心能力，不是炫技，而是把你每天的选择变得更轻一点。"
          description="页面往下走，节奏像翻看一本生活方式杂志。每一段都在告诉你，这不是抽象的 AI，而是一位真的会陪你整理、提醒、推荐与搭配的衣橱伙伴。"
        />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {capabilityCards.map(({ title, description, icon: Icon, badge, accent, notes }, index) => (
          <Reveal key={title} delay={index * 0.06}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -7, rotate: index % 2 === 0 ? -0.4 : 0.4 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className={`pointer-glow-surface premium-hover-lift surface-grain rounded-[32px] border border-white/80 bg-gradient-to-br ${accent} p-6 shadow-[0_22px_52px_rgba(148,113,95,0.1)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-[20px] bg-white/80 text-[var(--ink-strong)] shadow-[0_14px_30px_rgba(148,113,95,0.08)]">
                  <Icon className="size-5" />
                </span>
                <span className="rounded-full border border-white/80 bg-white/74 px-3 py-1.5 text-xs text-[var(--ink)]">{badge}</span>
              </div>
              <h3 style={displayStyle} className="mt-5 max-w-[11.5em] text-[1.7rem] leading-[1.14] tracking-[-0.032em] text-[var(--ink-strong)]">
                {title}
              </h3>
              <p className="mt-4 text-[14px] leading-[1.95] text-[var(--muted)]">{description}</p>
              <div className="mt-6 grid gap-2">
                {notes.map((note) => (
                  <div key={note} className="rounded-[22px] border border-white/80 bg-white/68 px-4 py-3 text-sm text-[var(--ink)]">
                    {note}
                  </div>
                ))}
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function LooksSection() {
  return (
    <section id="looks" className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
      <Reveal className="rounded-[38px] border border-white/75 bg-white/60 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
        <SectionHeading
          eyebrow="TODAY'S LOOKS"
          title="今日穿搭推荐，不是冷冰冰的结果，而像编辑帮你排好的首页陈列。"
          description="先把最心动、最顺手、最适合今天天气的搭配放在前面，少一些犹豫，多一点“就是它了”的轻松。"
        />

        <motion.article
          data-cute="true"
          whileHover={{ y: -6 }}
          onPointerMove={updatePointerGlow}
          onPointerLeave={resetPointerGlow}
          className={`pointer-glow-surface premium-hover-lift surface-grain mt-8 overflow-hidden rounded-[34px] border border-white/80 bg-gradient-to-br ${lookCards[0].accent} p-5 shadow-[0_24px_54px_rgba(148,113,95,0.12)] md:p-6`}
        >
          <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[320px] overflow-hidden rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,#f6d9cf_0%,#fff1e9_44%,#f0f7f1_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <div className="absolute inset-x-6 top-6 flex justify-between">
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] text-[var(--ink)]">
                  {lookCards[0].match}
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] text-[var(--ink)]">
                  {lookCards[0].weather}
                </span>
              </div>
              <div className="absolute bottom-10 left-8 h-44 w-24 rounded-[30px] bg-[#fff7f4]/85 shadow-[0_20px_44px_rgba(148,113,95,0.12)]" />
              <div className="absolute bottom-10 left-28 h-40 w-20 rounded-[28px] bg-[#f6d4c6]/85 shadow-[0_20px_44px_rgba(148,113,95,0.12)]" />
              <div className="absolute bottom-10 right-8 h-48 w-28 rounded-[30px] bg-[#ffffff]/82 shadow-[0_20px_44px_rgba(148,113,95,0.12)]" />
              <div className="absolute left-12 top-20 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.75),rgba(255,255,255,0)_70%)] blur-md" />
              <div className="absolute bottom-6 left-1/2 h-10 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(228,188,169,0.72),rgba(228,188,169,0)_72%)] blur-md" />
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <p style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  EDITORIAL RECOMMENDATION
                </p>
              <h3 style={displayStyle} className="mt-3 text-[1.78rem] leading-[1.12] tracking-[-0.032em] text-[var(--ink-strong)]">
                {lookCards[0].title}
              </h3>
                <p className="mt-4 text-[15px] leading-[1.95] text-[var(--muted)]">{lookCards[0].mood}</p>
                <div className="mt-6 grid gap-3">
                  {lookCards[0].tags.map((tag) => (
                    <div key={tag} className="rounded-[22px] border border-white/80 bg-white/72 px-4 py-3 text-sm text-[var(--ink)]">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/recommend"
                onPointerMove={updatePointerGlow}
                onPointerLeave={resetPointerGlow}
                className="pointer-glow-surface premium-hover-lift mt-6 inline-flex items-center gap-2 self-start rounded-full border border-white/80 bg-white/78 px-5 py-3 text-sm font-medium text-[var(--ink-strong)] shadow-[0_16px_34px_rgba(148,113,95,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(148,113,95,0.12)]"
              >
                去看完整推荐池
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </motion.article>
      </Reveal>

      <div className="grid gap-4">
        {lookCards.slice(1).map((card, index) => (
          <Reveal key={card.title} delay={index * 0.08}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -6, rotate: index % 2 === 0 ? 0.5 : -0.5 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className={`pointer-glow-surface premium-hover-lift surface-grain rounded-[32px] border border-white/80 bg-gradient-to-br ${card.accent} p-5 shadow-[0_22px_48px_rgba(148,113,95,0.1)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    {card.match}
                  </p>
                  <h3 style={displayStyle} className="mt-3 text-[1.52rem] leading-[1.14] tracking-[-0.028em] text-[var(--ink-strong)]">
                    {card.title}
                  </h3>
                </div>
                <span className="rounded-full border border-white/80 bg-white/78 px-3 py-1 text-[11px] text-[var(--ink)]">{card.weather}</span>
              </div>
              <p className="mt-4 text-[14px] leading-[1.9] text-[var(--muted)]">{card.mood}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-xs text-[var(--ink)]">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          </Reveal>
        ))}

        <Reveal delay={0.16}>
          <motion.div
            data-cute="true"
            whileHover={{ y: -5 }}
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            className="pointer-glow-surface premium-hover-lift surface-grain rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,244,237,0.92),rgba(255,255,255,0.78),rgba(236,247,240,0.86))] p-6 shadow-[0_22px_48px_rgba(148,113,95,0.1)]"
          >
            <p style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              SMALL REMINDER
            </p>
            <h3 style={displayStyle} className="mt-3 text-[1.48rem] leading-[1.16] tracking-[-0.022em] text-[var(--ink-strong)]">
              今天穿什么，不必再着急。
            </h3>
            <p className="mt-4 text-[14px] leading-[1.9] text-[var(--muted)]">
              当衣橱被看见之后，推荐会越来越像你，而不是像任何一个普通模板。
            </p>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

function ClosetSection() {
  return (
    <section className="rounded-[40px] border border-white/75 bg-white/58 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
      <Reveal>
        <SectionHeading
          eyebrow="VIRTUAL CLOSET"
          title="虚拟衣橱卡片墙，像把你真正会穿的东西，做成了一面可爱的陈列墙。"
          description="不是一张冷静的数据表，而是把真实衣物、风格标签、天气偏好和今日推荐都整理成一面会呼吸的衣橱墙。"
        />
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {closetCards.map(({ title, amount, description, icon: Icon, chips }, index) => (
          <Reveal key={title} delay={index * 0.05}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -7, rotate: index % 2 === 0 ? -0.5 : 0.5 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className={`h-full rounded-[30px] border border-white/80 bg-white/76 p-5 shadow-[0_20px_44px_rgba(148,113,95,0.1)] ${
                index === 0 ? "xl:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#ffe2d8_0%,#fff7f1_50%,#e5f5ec_100%)] text-[var(--ink-strong)] shadow-[0_14px_30px_rgba(148,113,95,0.08)]">
                  <Icon className="size-5" />
                </span>
                <span className="rounded-full border border-white/80 bg-[#fff6f1] px-3 py-1.5 text-xs text-[var(--ink)]">{amount}</span>
              </div>

              <h3 style={displayStyle} className="mt-5 text-[1.66rem] leading-[1.12] tracking-[-0.03em] text-[var(--ink-strong)]">
                {title}
              </h3>
              <p className="mt-4 text-[14px] leading-[1.92] text-[var(--muted)]">{description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs text-[var(--ink)]">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function StyleSection() {
  return (
    <section id="style" className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <Reveal className="rounded-[38px] border border-white/75 bg-white/62 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
        <SectionHeading
          eyebrow="STYLE TAGS"
          title="风格标签探索区，像翻一本只属于你的温柔穿搭辞典。"
          description="有时候我们不是缺衣服，而是缺一个能说出“今天想穿哪种感觉”的入口。这里把那些细腻的感受都变成了可以点开的标签。"
        />

        <div className="mt-8 rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,236,229,0.9),rgba(255,255,255,0.78),rgba(235,246,239,0.86))] p-5 shadow-[0_20px_44px_rgba(148,113,95,0.1)]">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-[20px] bg-white/78 text-[#f08c76] shadow-[0_12px_26px_rgba(148,113,95,0.08)]">
              <Star className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--ink-strong)]">今天想穿得软一点</p>
              <p className="mt-1 text-sm text-[var(--muted)]">系统会优先把开衫、柔软针织、奶油色裙装和低饱和配件推到前面。</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="rounded-[38px] border border-white/75 bg-white/62 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8" delay={0.08}>
        <div className="flex flex-wrap gap-3">
          {styleTags.map((tag, index) => (
            <motion.button
              data-cute="true"
              key={tag}
              type="button"
              whileHover={{ y: -5, rotate: index % 3 === 0 ? -1 : 1, scale: 1.02 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className="pointer-glow-surface premium-hover-lift rounded-full border border-white/80 bg-white/78 px-4 py-3 text-sm text-[var(--ink)] shadow-[0_16px_34px_rgba(148,113,95,0.08)] backdrop-blur-md transition"
            >
              {tag}
            </motion.button>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Reveal className="rounded-[38px] border border-white/75 bg-white/62 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
        <p
          style={labelStyle}
          className="inline-flex rounded-full border border-white/80 bg-white/76 px-4 py-2 text-[11px] tracking-[0.22em] text-[var(--muted)]"
        >
          BEFORE
        </p>
        <h2 style={displayStyle} className="mt-5 max-w-[11em] text-[clamp(1.8rem,3vw,2.45rem)] leading-[1.08] tracking-[-0.035em] text-[var(--ink-strong)]">
          从杂乱，到心动之前
        </h2>
        <div className="relative mt-8 min-h-[320px] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#fff4ef_0%,#ffe8df_100%)] p-6">
          {[
            "今天穿什么",
            "这件是不是重复了",
            "总感觉少一件外套",
            "明早再说吧",
            "衣柜里其实有很多",
            "但一下子想不起来"
          ].map((item, index) => (
            <motion.span
              key={item}
              animate={{
                y: [0, index % 2 === 0 ? -6 : 6, 0],
                rotate: [index % 2 === 0 ? -8 : 8, index % 2 === 0 ? -4 : 4, index % 2 === 0 ? -8 : 8]
              }}
              transition={{ duration: 6 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute rounded-full border border-white/80 bg-white/82 px-4 py-2 text-sm text-[var(--ink)] shadow-[0_14px_32px_rgba(148,113,95,0.08)]"
              style={{
                left: `${8 + (index % 3) * 26}%`,
                top: `${10 + Math.floor(index / 2) * 22}%`
              }}
            >
              {item}
            </motion.span>
          ))}
        </div>
      </Reveal>

      <Reveal className="rounded-[38px] border border-white/75 bg-white/62 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8" delay={0.08}>
        <p
          style={labelStyle}
          className="inline-flex rounded-full border border-white/80 bg-white/76 px-4 py-2 text-[11px] tracking-[0.22em] text-[var(--muted)]"
        >
          AFTER
        </p>
        <h2 style={displayStyle} className="mt-5 max-w-[11em] text-[clamp(1.8rem,3vw,2.45rem)] leading-[1.08] tracking-[-0.035em] text-[var(--ink-strong)]">
          从杂乱，到心动之后
        </h2>
        <div className="mt-8 grid gap-4">
          {[
            "真实衣物被分好类，找衣服这件事突然变快了。",
            "天气、场景和风格偏好会自动参与推荐。",
            "最值得先试的一套，会被轻轻放到你面前。"
          ].map((item) => (
            <motion.div
              data-cute="true"
              key={item}
              whileHover={{ x: 6 }}
              className="rounded-[26px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(242,249,245,0.88))] px-5 py-4 shadow-[0_16px_36px_rgba(148,113,95,0.08)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-[18px] bg-white/80 text-[#7da58d]">
                  <Check className="size-4" />
                </span>
                <p className="text-sm leading-7 text-[var(--ink)]">{item}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,236,229,0.92),rgba(255,255,255,0.78),rgba(236,247,240,0.88))] p-5 shadow-[0_18px_40px_rgba(148,113,95,0.1)]">
          <p style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            TODAY&apos;S SOFT WIN
          </p>
          <p style={displayStyle} className="mt-3 text-[1.68rem] leading-[1.12] tracking-[-0.032em] text-[var(--ink-strong)]">
            今天穿什么，不必再着急。
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function FlowSection() {
  return (
    <section className="rounded-[40px] border border-white/75 bg-white/58 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
      <Reveal>
        <SectionHeading
          eyebrow="HOW IT FLOWS"
          title="使用流程，也应该像被温柔带着走，而不是像一份操作说明书。"
          description="所以这套首页不是把步骤生硬列出来，而是把节奏做得更柔和。你只需要一点点往下走，就知道接下来该做什么。"
        />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {flowSteps.map(({ step, title, description, icon: Icon }, index) => (
          <Reveal key={step} delay={index * 0.06}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -7, rotate: index % 2 === 0 ? -0.5 : 0.5 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className="pointer-glow-surface premium-hover-lift h-full rounded-[30px] border border-white/80 bg-white/78 p-5 shadow-[0_20px_44px_rgba(148,113,95,0.1)]"
            >
              <div className="flex items-center justify-between">
                <span style={labelStyle} className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  {step}
                </span>
                <span className="flex size-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ffe2d8_0%,#fff7f1_50%,#e4f4eb_100%)] text-[var(--ink-strong)]">
                  <Icon className="size-5" />
                </span>
              </div>
              <h3 style={displayStyle} className="mt-5 text-[1.58rem] leading-[1.12] tracking-[-0.03em] text-[var(--ink-strong)]">
                {title}
              </h3>
              <p className="mt-4 text-[14px] leading-[1.92] text-[var(--muted)]">{description}</p>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="rounded-[40px] border border-white/75 bg-white/58 p-6 shadow-[0_28px_60px_rgba(148,113,95,0.12)] backdrop-blur-xl md:p-8">
      <Reveal>
        <SectionHeading
          eyebrow="FAQ"
          title="常见问题，也保持温柔，不打断你想继续往下逛的心情。"
          description="把那些最容易冒出来的小疑问提前放在这里，像一组轻轻回答你的小卡片。"
        />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {faqs.map(({ question, answer }, index) => (
          <Reveal key={question} delay={index * 0.04}>
            <motion.article
              data-cute="true"
              whileHover={{ y: -6 }}
              onPointerMove={updatePointerGlow}
              onPointerLeave={resetPointerGlow}
              className="pointer-glow-surface premium-hover-lift h-full rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[0_20px_44px_rgba(148,113,95,0.08)]"
            >
              <p className="text-sm font-medium leading-7 text-[var(--ink-strong)]">{question}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{answer}</p>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ClosingSection() {
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-[44px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,236,229,0.92),rgba(255,255,255,0.78),rgba(235,246,239,0.88))] px-6 py-8 shadow-[0_32px_72px_rgba(148,113,95,0.14)] md:px-10 md:py-12">
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
          transition={{ duration: 10.5, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-10 top-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.56),rgba(255,255,255,0)_72%)] blur-2xl"
        />
        <motion.div
          animate={{ x: [0, 14, 0], y: [0, -14, 0] }}
          transition={{ duration: 12.2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,214,202,0.5),rgba(255,214,202,0)_72%)] blur-2xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span
              style={labelStyle}
              className="inline-flex items-center rounded-full border border-white/80 bg-white/78 px-4 py-2 text-[11px] tracking-[0.22em] text-[var(--muted)] shadow-[0_14px_30px_rgba(148,113,95,0.08)]"
            >
              FINAL CTA
            </span>
            <h2
              style={displayStyle}
              className="mt-5 max-w-[10.5em] text-[clamp(2.2rem,4.3vw,3.75rem)] leading-[1.03] tracking-[-0.04em] text-[var(--ink-strong)]"
            >
              你的衣橱，也可以温柔又聪明。
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-[2.05] text-[var(--muted)] md:text-[17px]">
              先把衣服收进来，再让 AI 慢慢学会你的偏爱。今天开始，它就能帮你少一点犹豫，多一点心动。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/wardrobe"
                onPointerMove={updatePointerGlow}
                onPointerLeave={resetPointerGlow}
                className="pointer-glow-surface premium-hover-lift inline-flex items-center gap-2 rounded-full border border-white/80 bg-[linear-gradient(135deg,#ffd8cb_0%,#fff7ef_42%,#def4e8_100%)] px-6 py-3.5 text-sm font-medium text-[var(--ink-strong)] shadow-[0_20px_44px_rgba(148,113,95,0.12)] transition hover:-translate-y-1 hover:scale-[1.01]"
              >
                开始整理真实衣橱
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/assistant"
                onPointerMove={updatePointerGlow}
                onPointerLeave={resetPointerGlow}
                className="pointer-glow-surface premium-hover-lift inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-6 py-3.5 text-sm font-medium text-[var(--ink)] shadow-[0_16px_34px_rgba(148,113,95,0.08)] transition hover:-translate-y-1 hover:scale-[1.01]"
              >
                去看 AI 助手
                <Bot className="size-4 text-[#7aa68b]" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
            {[
              "温暖粉色房间感",
              "生活方式品牌节奏",
              "会动、会发光、会让人想继续看"
            ].map((item, index) => (
              <motion.div
                data-cute="true"
                key={item}
                animate={{ y: [0, index % 2 === 0 ? -6 : -4, 0] }}
                transition={{ duration: 5.2 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-[24px] border border-white/80 bg-white/76 px-4 py-4 text-sm text-[var(--ink)] shadow-[0_16px_34px_rgba(148,113,95,0.08)]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export function BrandHomePage() {
  const [introReady, setIntroReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <CuteInteractionLayer>
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
        animate={introReady ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 18, filter: "blur(14px)" }}
        transition={{ duration: 0.95, ease }}
        className="relative min-h-screen overflow-hidden"
      >
        <motion.div
          animate={{ x: [0, -28, 0], y: [0, 24, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,214,202,0.95),rgba(255,214,202,0)_70%)] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 34, 0], y: [0, -30, 0], scale: [1, 0.96, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-[-4rem] top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,236,223,0.82),rgba(212,236,223,0)_72%)] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 18, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/3 top-[56rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,237,197,0.7),rgba(255,237,197,0)_72%)] blur-3xl"
        />

        <HeaderBar />

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-8 md:px-6 lg:gap-10 lg:px-8">
          <HeroSection />
          <StorySection />
          <CapabilitiesSection />
          <LooksSection />
          <ClosetSection />
          <StyleSection />
          <BeforeAfterSection />
          <FlowSection />
          <FaqSection />
          <ClosingSection />
        </main>
      </motion.div>
    </CuteInteractionLayer>
  );
}
