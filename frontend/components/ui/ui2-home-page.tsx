"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Footprints,
  Gem,
  Package,
  Play,
  Shirt,
  Sparkles,
  Star,
  Wand2,
  type LucideIcon
} from "lucide-react";
import { CuteInteractionLayer } from "@/components/ui/cute-interaction-layer";

type SectionKey = "hero" | "closet" | "future";
type CategoryKey = "套装" | "上衣" | "裤子 / 半裙" | "鞋子" | "配饰";

type CategoryScene = {
  key: CategoryKey;
  code: string;
  accent: string;
  stage: { top: string; bottom: string; shoes: string; accessory: string };
  title: string;
  summary: string;
  quote: string;
  rail: string[];
  cards: Array<{ title: string; meta: string; detail: string; color: string }>;
};

// UI2 hero video source. Replace this file with a new demo when needed.
const heroVideoSrc = "/videos/ui2-closet-demo.mp4";
const sectionOrder: SectionKey[] = ["hero", "closet", "future"];

const sectionTitles: Record<SectionKey, string> = {
  hero: "第一页",
  closet: "第二页",
  future: "第三页"
};

const categoryIcons: Record<CategoryKey, LucideIcon> = {
  套装: Package,
  上衣: Shirt,
  "裤子 / 半裙": Wand2,
  鞋子: Footprints,
  配饰: Gem
};

const headerActions: Array<{ label: string; sub: string; section: SectionKey; category?: CategoryKey }> = [
  { label: "VIDEO", sub: "首页视频", section: "hero" },
  { label: "SET", sub: "套装", section: "closet", category: "套装" },
  { label: "TOP", sub: "上衣", section: "closet", category: "上衣" },
  { label: "BOTTOM", sub: "裤裙", section: "closet", category: "裤子 / 半裙" },
  { label: "SHOES", sub: "鞋子", section: "closet", category: "鞋子" },
  { label: "ACC", sub: "配饰", section: "closet", category: "配饰" }
];

const categoryScenes: CategoryScene[] = [
  {
    key: "套装",
    code: "SET LOOK",
    accent: "#13d95d",
    stage: { top: "#13d95d", bottom: "#fff1dc", shoes: "#5f23c8", accessory: "#13d95d" },
    title: "默认整套先上身，再慢慢替换细节。",
    summary: "先把最稳的一整套放到 2.5D 小人身上，后面再换上衣、裤裙或配饰，操作会更顺。",
    quote: "先有整套，再做替换，这样体验最像真实搭配流程。",
    rail: ["通勤整套", "咖啡馆整套", "周末整套", "一键换色", "回到默认"],
    cards: [
      { title: "奶油针织 + 杏色半裙", meta: "DEFAULT", detail: "作为默认整套出场。", color: "from-[#f5f6ff] to-[#fff5ef]" },
      { title: "薄西装套", meta: "SET 02", detail: "适合快速替换成套逻辑。", color: "from-[#f9f5ff] to-[#fff0f7]" },
      { title: "软糯开衫套装", meta: "SET 03", detail: "更轻盈，也更品牌化。", color: "from-[#effff6] to-[#fff8f0]" },
      { title: "点击切换整套", meta: "SET 04", detail: "整块内容从右向左滑入。", color: "from-[#fff6ec] to-[#eef8ff]" }
    ]
  },
  {
    key: "上衣",
    code: "TOP",
    accent: "#1cd1ff",
    stage: { top: "#1cd1ff", bottom: "#f7e4d8", shoes: "#5f23c8", accessory: "#15d764" },
    title: "先换上衣，最容易看到整体气质变化。",
    summary: "上衣切换更适合做显著动效，右边内容从右滑入，左边人物即时换装。",
    quote: "离脸最近的单品，最值得优先点击。",
    rail: ["白衬衫", "雾粉针织", "短款开衫", "软糯卫衣", "拍照上镜"],
    cards: [
      { title: "雾粉衬衫", meta: "TOP 01", detail: "更干净，也更温柔。", color: "from-[#eefcff] to-[#f6f0ff]" },
      { title: "薄荷小开衫", meta: "TOP 02", detail: "和紫底页面形成强对比。", color: "from-[#ecfff2] to-[#f5fbff]" },
      { title: "奶油针织", meta: "TOP 03", detail: "适合作为默认推荐。", color: "from-[#fff8e8] to-[#fff0f8]" },
      { title: "亮面短夹克", meta: "TOP 04", detail: "用于增强镜头冲击力。", color: "from-[#f4f2ff] to-[#fff1ec]" }
    ]
  },
  {
    key: "裤子 / 半裙",
    code: "BOTTOM",
    accent: "#ff75b7",
    stage: { top: "#fff5ed", bottom: "#ff75b7", shoes: "#5f23c8", accessory: "#13d95d" },
    title: "裤子和半裙单独切换，方便回退到默认下装。",
    summary: "这块先把视觉和动效逻辑搭好，后面你可以继续接真实拖拽和回退功能。",
    quote: "拖换上衣后，也能回到底部默认状态。",
    rail: ["高腰西裤", "白色直筒", "浅牛仔半裙", "奶油长裙", "返回默认"],
    cards: [
      { title: "白色直筒裤", meta: "BOTTOM 01", detail: "整体更干净。", color: "from-[#fff7fb] to-[#f2f4ff]" },
      { title: "浅牛仔半裙", meta: "BOTTOM 02", detail: "最适合单独切出来做栏目。", color: "from-[#eef8ff] to-[#fff1f7]" },
      { title: "奶油长裙", meta: "BOTTOM 03", detail: "更像生活方式品牌主图。", color: "from-[#fff9ea] to-[#fff2ef]" },
      { title: "拖拽替换提示", meta: "BOTTOM 04", detail: "后面可接真实逻辑。", color: "from-[#fdf0ff] to-[#eefef7]" }
    ]
  },
  {
    key: "鞋子",
    code: "SHOES",
    accent: "#ffd248",
    stage: { top: "#fff6ef", bottom: "#f1ded0", shoes: "#ffd248", accessory: "#13d95d" },
    title: "鞋子作为最后一步，负责收尾和完成感。",
    summary: "它的变化不需要太吵，轻一点，收得住，但又能明显改变整套搭配。",
    quote: "最后换鞋，会让整套突然像完成了一样。",
    rail: ["乐福鞋", "玛丽珍", "小白鞋", "短靴", "回到推荐鞋"],
    cards: [
      { title: "奶油乐福鞋", meta: "SHOES 01", detail: "稳，适合通勤。", color: "from-[#fffbe5] to-[#fff3ea]" },
      { title: "白色运动鞋", meta: "SHOES 02", detail: "更年轻，也更轻盈。", color: "from-[#fffef4] to-[#edf8ff]" },
      { title: "杏色短靴", meta: "SHOES 03", detail: "增强镜头存在感。", color: "from-[#fff4e4] to-[#fff1fb]" },
      { title: "鞋柜推荐位", meta: "SHOES 04", detail: "以后可接天气判断。", color: "from-[#eefef5] to-[#fff8ea]" }
    ]
  },
  {
    key: "配饰",
    code: "ACC",
    accent: "#9d7dff",
    stage: { top: "#fff6ef", bottom: "#f5e2d7", shoes: "#5f23c8", accessory: "#9d7dff" },
    title: "配饰负责最后一点灵气和点亮感。",
    summary: "这一栏更适合用轻一点的闪光和局部高亮，不需要像整套那样大幅度替换。",
    quote: "配饰不是主角，但它负责让整页更灵动。",
    rail: ["耳环", "发夹", "链条包", "腰带", "一键隐藏"],
    cards: [
      { title: "珍珠耳环", meta: "ACC 01", detail: "最适合做轻量 hover。", color: "from-[#f5f1ff] to-[#fff9ef]" },
      { title: "小发夹", meta: "ACC 02", detail: "补一点可爱感。", color: "from-[#fff1f8] to-[#f4f7ff]" },
      { title: "链条小包", meta: "ACC 03", detail: "补齐完成度。", color: "from-[#f2fbff] to-[#f9f2ff]" },
      { title: "点亮提示", meta: "ACC 04", detail: "更像点状提醒。", color: "from-[#f8f7ff] to-[#eefef6]" }
    ]
  }
];

const panelEntrance: Variants = {
  initial: { opacity: 0, x: 80 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -70, transition: { duration: 0.36, ease: [0.4, 0, 1, 1] } }
};

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

function glowStyle(base: string, glow: string) {
  return {
    backgroundImage: `radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glow} 0%, rgba(255,255,255,0.12) 18%, transparent 58%), ${base}`
  };
}

function HeroHeader({
  activeSection,
  activeCategory,
  onAction
}: {
  activeSection: SectionKey;
  activeCategory: CategoryKey;
  onAction: (section: SectionKey, category?: CategoryKey) => void;
}) {
  return (
    <div className="relative z-20 mx-auto flex w-full max-w-[1520px] flex-col items-center pt-6">
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="border-[4px] border-[#3fe7ff] bg-[#5b25bf]/68 px-6 py-3 shadow-[0_24px_60px_rgba(10,255,110,0.18)] backdrop-blur-md"
      >
        <div className="flex items-end gap-4">
          <div className="text-[clamp(2.2rem,5.6vw,5.1rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] text-[#12db66]">
            AI 智能衣橱
          </div>
          <div className="pb-1 text-sm font-semibold uppercase tracking-[0.35em] text-[#9fffd0]">UI2</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.64, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="-mt-[4px] w-full max-w-[940px] border-[4px] border-[#3fe7ff] bg-[#5b25bf]/72 px-4 py-3 shadow-[0_18px_48px_rgba(63,231,255,0.16)] backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {headerActions.map((item, index) => {
            const isActive =
              item.section === "hero"
                ? activeSection === "hero"
                : activeSection === "closet" && activeCategory === item.category;

            return (
              <motion.button
                key={item.label}
                type="button"
                onClick={() => onAction(item.section, item.category)}
                onPointerMove={updatePointerGlow}
                onPointerLeave={resetPointerGlow}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className={`group relative inline-flex min-w-[118px] flex-col items-center justify-center rounded-full border px-4 py-2 text-center transition ${
                  isActive
                    ? "border-[#14dd69] text-[#3a1584] shadow-[0_16px_36px_rgba(20,221,105,0.16)]"
                    : "border-[#3fe7ff]/36 text-[#14dd69] hover:border-[#3fe7ff]/74"
                }`}
                style={glowStyle(
                  isActive
                    ? "linear-gradient(180deg, rgba(246,240,255,0.96), rgba(232,255,242,0.92))"
                    : "linear-gradient(180deg, rgba(106,46,216,0.38), rgba(91,37,191,0.18))",
                  isActive ? "rgba(20,221,105,0.58)" : "rgba(63,231,255,0.26)"
                )}
              >
                <span className="text-[12px] font-black uppercase tracking-[0.24em]">{item.label}</span>
                <span className={`mt-1 text-[11px] tracking-[0.08em] ${isActive ? "text-[#5a24bf]" : "text-[#d8fff0]"}`}>{item.sub}</span>
                <span
                  className={`pointer-events-none absolute inset-x-5 bottom-[6px] h-[2px] origin-center transition duration-300 ${
                    isActive ? "scale-x-100 bg-[#14dd69]" : "scale-x-0 bg-[#14dd69] group-hover:scale-x-100"
                  }`}
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.4 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
                  className={`pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#5a24bf]" : "bg-[#14dd69]"}`}
                />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function HeroStage({ onEnterCloset }: { onEnterCloset: () => void }) {
  return (
    <div className="relative mx-auto mt-8 flex w-full max-w-[1650px] flex-1 items-stretch px-4 pb-6 lg:px-8">
      <div className="relative flex min-h-[74vh] w-full flex-col overflow-hidden border-[4px] border-[#3fe7ff] bg-[linear-gradient(135deg,rgba(104,49,220,0.76),rgba(77,30,170,0.92))] p-4 shadow-[0_38px_120px_rgba(29,0,98,0.34)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,197,236,0.18),transparent_20%),radial-gradient(circle_at_85%_24%,rgba(255,255,255,0.12),transparent_18%),radial-gradient(circle_at_72%_82%,rgba(20,221,105,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-28 w-20 border-[4px] border-[#14dd69] bg-[#14dd69]">
          <div className="absolute left-[18%] top-[12%] h-11 w-11 rounded-t-full border-[4px] border-[#5a24bf] bg-[#14dd69]" />
          <div className="absolute bottom-[14%] left-[22%] h-7 w-8 border-[4px] border-[#5a24bf] border-t-0" />
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 flex h-32 w-32 items-end justify-center border-[4px] border-[#14dd69] bg-[#14dd69] px-3 pb-4 text-center text-[0.92rem] font-black uppercase leading-[1.15] tracking-[0.08em] text-[#5a24bf]">
          AI
          <br />
          WARDROBE
          <br />
          UI2
        </div>

        <div className="relative flex items-start justify-between gap-6 px-2 py-1">
          <div className="max-w-[340px] text-[#83fff1]">
            <p className="text-[12px] font-black uppercase tracking-[0.36em]">Opening View</p>
            <p className="mt-3 text-[15px] leading-7 text-[#d3f4ff]">
              首屏完全按 yamavico 的节奏改成整页开场，视频嵌入主舞台中间，菜单点击会跳到对应页面。
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onEnterCloset}
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-3 border-[3px] border-[#14dd69] px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-[#4d1aa7] shadow-[0_16px_40px_rgba(20,221,105,0.18)]"
            style={glowStyle(
              "linear-gradient(180deg, rgba(244,239,255,0.96), rgba(235,255,243,0.92))",
              "rgba(20,221,105,0.58)"
            )}
          >
            START
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="relative mt-4 grid flex-1 items-center gap-8 px-2 pb-2 lg:grid-cols-[0.32fr_0.68fr]">
          <div className="z-10 max-w-[360px] text-[#dffcff]">
            <div className="border-[3px] border-[#3fe7ff] bg-[#6a2ed8]/52 px-4 py-3">
              <p className="text-[12px] font-black uppercase tracking-[0.34em] text-[#14dd69]">WARDROBE DEMO</p>
              <h1 className="mt-3 text-[clamp(2.3rem,4vw,4.8rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#12db66]">
                先看视频，
                <br />
                再进入衣橱。
              </h1>
              <p className="mt-4 text-[15px] leading-7 text-[#e6dcff]">
                视频边缘做了淡化和遮罩，让它像是被网页吃进去一样，不是生硬地贴在页面上。
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {["灵动 hover", "发光按钮", "全屏第一印象"].map((item, index) => (
                <motion.span
                  key={item}
                  animate={{ y: [0, index % 2 === 0 ? -5 : -3, 0] }}
                  transition={{ duration: 3.4 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  className="border-[3px] border-[#3fe7ff] bg-[#5b25bf]/56 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#d3fff0]"
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[58vh] items-center justify-center">
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, -0.5, 0] }}
              transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-[min(62vw,760px)] w-[min(52vw,860px)] max-w-[860px]"
            >
              <div className="absolute left-1/2 top-1/2 h-[88%] w-[74%] -translate-x-1/2 -translate-y-1/2 border-[4px] border-[#14dd69]" />
              <div className="absolute left-1/2 top-[7%] h-[7%] w-[20%] -translate-x-1/2 rounded-full border-[4px] border-[#14dd69]" />
              <div className="absolute left-1/2 top-[12%] h-[78%] w-[68%] -translate-x-1/2 overflow-hidden rounded-[44px] border-[4px] border-[#3fe7ff] bg-[#f0d6ff]/12 shadow-[0_40px_90px_rgba(13,255,110,0.18)]">
                <div
                  className="absolute inset-[14px] overflow-hidden rounded-[30px]"
                  style={{
                    WebkitMaskImage:
                      "radial-gradient(ellipse at center, rgba(0,0,0,1) 54%, rgba(0,0,0,0.92) 76%, rgba(0,0,0,0.0) 100%)",
                    maskImage:
                      "radial-gradient(ellipse at center, rgba(0,0,0,1) 54%, rgba(0,0,0,0.92) 76%, rgba(0,0,0,0.0) 100%)"
                  }}
                >
                  <video autoPlay muted loop playsInline preload="metadata" className="h-full w-full scale-[1.02] object-cover saturate-[1.06]">
                    <source src={heroVideoSrc} type="video/mp4" />
                  </video>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_54%,rgba(91,37,191,0.3)_92%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_22%,transparent_78%,rgba(9,230,99,0.12))]" />
                </div>
              </div>

              <motion.div
                animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
                transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[7%] top-[22%] border-[3px] border-[#3fe7ff] bg-[#f6f1ff] px-4 py-3 text-[#4d1aa7] shadow-[0_14px_34px_rgba(63,231,255,0.14)]"
              >
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.22em] text-[#14dd69]">
                  <Sparkles className="h-4 w-4" />
                  VIDEO MASK
                </div>
                <p className="mt-2 max-w-[160px] text-sm font-semibold leading-6">边缘减淡，直接融进网页本身。</p>
              </motion.div>

              <motion.div
                animate={{ x: [0, -6, 0], y: [0, 6, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-[12%] right-[10%] border-[3px] border-[#14dd69] bg-[#f7f3ff] px-4 py-3 text-[#4d1aa7] shadow-[0_14px_34px_rgba(20,221,105,0.14)]"
              >
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.22em] text-[#14dd69]">
                  <Play className="h-4 w-4" />
                  DEMO
                </div>
                <p className="mt-2 max-w-[180px] text-sm font-semibold leading-6">这里就是你的衣橱 demo 视频主舞台。</p>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onEnterCloset}
          whileHover={{ y: 3 }}
          className="mx-auto mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.34em] text-[#b9fff1]"
        >
          Scroll To Closet
          <ChevronDown className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}

function AvatarStage({ scene }: { scene: CategoryScene }) {
  return (
    <div className="relative flex h-full min-h-[620px] flex-col overflow-hidden border-[3px] border-[#5320b8] bg-white shadow-[0_22px_50px_rgba(78,42,165,0.08)]">
      <div className="flex items-center justify-between border-b-[3px] border-[#5320b8] px-5 py-4">
        <div className="border-[3px] border-[#25e25b] px-3 py-2 text-[0.92rem] font-black uppercase tracking-[0.12em] text-[#25e25b]">
          MODEL / 2.5D
        </div>
        <div className="text-xs font-black uppercase tracking-[0.28em] text-[#5320b8]">{scene.code}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={scene.key} variants={panelEntrance} initial="initial" animate="animate" exit="exit" className="flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
            <div className="absolute inset-x-0 top-0 h-[40%] bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(98,46,182,0.03))]" />
            <div className="absolute left-5 top-6 border-[3px] border-[#3fe7ff] px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-[#3f50cf]">
              拖拽逻辑预留
            </div>
            <div className="absolute right-5 top-6 border-[3px] border-[#25e25b] bg-[#25e25b] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#5320b8]">
              {scene.key}
            </div>

            <motion.div
              animate={{ rotate: [0, -1.5, 0, 1.2, 0], y: [0, -6, 0] }}
              transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-[420px] w-[290px]"
            >
              <div className="absolute left-1/2 top-[76%] h-12 w-[180px] -translate-x-1/2 rounded-full bg-[#8a6cf3]/16 blur-[6px]" />
              <div className="absolute left-1/2 top-[10%] h-16 w-16 -translate-x-1/2 rounded-full bg-[#f6dfd2] shadow-[0_10px_20px_rgba(106,46,216,0.08)]" />
              <div className="absolute left-1/2 top-[6%] h-8 w-10 -translate-x-1/2 rounded-b-[18px] rounded-t-full bg-[#452130]" />

              <div className="absolute left-[34px] top-[165px] h-[16px] w-[72px] rotate-[-28deg] rounded-full bg-[#f6dfd2]" />
              <div className="absolute right-[34px] top-[165px] h-[16px] w-[72px] rotate-[28deg] rounded-full bg-[#f6dfd2]" />

              <div
                className="absolute left-1/2 top-[27%] h-[124px] w-[108px] -translate-x-1/2 rounded-[38px_38px_24px_24px] border-[3px] border-white/70 shadow-[0_18px_36px_rgba(76,25,139,0.12)]"
                style={{ backgroundColor: scene.stage.top }}
              />
              <div
                className="absolute left-1/2 top-[49%] h-[116px] w-[136px] -translate-x-1/2 rounded-[26px_26px_52px_52px] border-[3px] border-white/80 shadow-[0_18px_34px_rgba(76,25,139,0.1)]"
                style={{ backgroundColor: scene.stage.bottom }}
              />

              <div className="absolute left-[95px] top-[302px] h-[82px] w-[18px] rounded-full bg-[#f9e5db]" />
              <div className="absolute right-[95px] top-[302px] h-[82px] w-[18px] rounded-full bg-[#f9e5db]" />

              <div className="absolute left-[84px] top-[370px] h-[24px] w-[42px] rounded-[18px] shadow-[0_10px_18px_rgba(0,0,0,0.08)]" style={{ backgroundColor: scene.stage.shoes }} />
              <div className="absolute right-[84px] top-[370px] h-[24px] w-[42px] rounded-[18px] shadow-[0_10px_18px_rgba(0,0,0,0.08)]" style={{ backgroundColor: scene.stage.shoes }} />

              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-[42px] top-[120px] flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white/80 shadow-[0_12px_20px_rgba(77,26,167,0.1)]"
                style={{ backgroundColor: scene.stage.accessory }}
              >
                <Star className="h-4 w-4 text-white" />
              </motion.div>

              <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3">
                {[scene.stage.top, scene.stage.bottom, scene.stage.shoes, scene.stage.accessory].map((swatch) => (
                  <span key={swatch} className="h-8 w-8 rounded-full border-[3px] border-white shadow-[0_8px_14px_rgba(77,26,167,0.08)]" style={{ backgroundColor: swatch }} />
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 border-t-[3px] border-[#5320b8]">
            <div className="border-r-[3px] border-[#5320b8] bg-[#25e25b] px-5 py-4 text-[#5320b8]">
              <p className="text-xs font-black uppercase tracking-[0.28em]">DETAILS</p>
              <p className="mt-2 text-sm font-semibold leading-6">这里先放 2.5D 默认人像，后面可继续接你的真实拖拽逻辑。</p>
            </div>
            <div className="px-5 py-4 text-[#5320b8]">
              <p className="text-xs font-black uppercase tracking-[0.28em]">QUOTE</p>
              <p className="mt-2 text-sm font-semibold leading-6">{scene.quote}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ClosetBoard({
  activeCategory,
  onCategoryChange
}: {
  activeCategory: CategoryKey;
  onCategoryChange: (category: CategoryKey) => void;
}) {
  const activeScene = useMemo(
    () => categoryScenes.find((scene) => scene.key === activeCategory) ?? categoryScenes[0],
    [activeCategory]
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf7ef] text-[#5320b8]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_calc(25%-1px),rgba(102,62,200,0.14)_calc(25%-1px),rgba(102,62,200,0.14)_25%,transparent_25%,transparent_calc(50%-1px),rgba(102,62,200,0.14)_calc(50%-1px),rgba(102,62,200,0.14)_50%,transparent_50%,transparent_calc(75%-1px),rgba(102,62,200,0.14)_calc(75%-1px),rgba(102,62,200,0.14)_75%,transparent_75%),linear-gradient(180deg,transparent_calc(33.3%-1px),rgba(102,62,200,0.14)_calc(33.3%-1px),rgba(102,62,200,0.14)_33.3%,transparent_33.3%,transparent_calc(66.6%-1px),rgba(102,62,200,0.14)_calc(66.6%-1px),rgba(102,62,200,0.14)_66.6%,transparent_66.6%)]" />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-[1880px] flex-col px-6 pb-6 pt-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="border-[4px] border-[#3fe7ff] px-4 py-3 shadow-[0_14px_36px_rgba(63,231,255,0.08)]">
              <span className="text-[clamp(2rem,3.3vw,3.8rem)] font-black uppercase leading-none tracking-[-0.05em] text-[#14dd69]">
                WARDROBE
              </span>
              <span className="ml-4 text-[1.15rem] font-black tracking-[0.16em] text-[#5320b8]">我的衣橱</span>
            </div>
            <div className="max-w-[520px] text-[0.96rem] font-semibold leading-7 text-[#5f48a6]">
              第二屏完全独立成一个全页，按你的布局改成“左侧 2.5D 小人 + 右侧内容从右到左动态展示”的结构。
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categoryScenes.map((scene) => {
              const Icon = categoryIcons[scene.key];
              const active = scene.key === activeCategory;

              return (
                <motion.button
                  key={scene.key}
                  type="button"
                  onClick={() => onCategoryChange(scene.key)}
                  onPointerMove={updatePointerGlow}
                  onPointerLeave={resetPointerGlow}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`inline-flex items-center gap-2 border-[3px] px-4 py-3 text-sm font-black tracking-[0.08em] transition ${
                    active ? "border-[#25e25b] text-[#5320b8]" : "border-[#5320b8] text-[#5320b8]"
                  }`}
                  style={glowStyle(
                    active
                      ? "linear-gradient(180deg, rgba(37,226,91,0.92), rgba(214,255,225,0.9))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,243,255,0.8))",
                    active ? "rgba(255,255,255,0.4)" : "rgba(63,231,255,0.24)"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {scene.key}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid flex-1 gap-5 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]">
          <AvatarStage scene={activeScene} />

          <div className="flex min-h-0 flex-col gap-5">
            <div className="overflow-hidden border-[3px] border-[#5320b8] bg-[#25e25b]">
              <motion.div
                key={activeScene.key}
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="flex w-max gap-3 px-3 py-3"
              >
                {[...activeScene.rail, ...activeScene.rail].map((item, index) => (
                  <span
                    key={`${activeScene.key}-${item}-${index}`}
                    className="flex min-w-[170px] items-center justify-center border-[3px] border-[#5320b8] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#5320b8]"
                  >
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.key}
                variants={panelEntrance}
                initial="initial"
                animate="animate"
                exit="exit"
                className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.16fr_0.84fr]"
              >
                <article className="flex min-h-0 flex-col overflow-hidden border-[3px] border-[#5320b8] bg-white shadow-[0_22px_50px_rgba(78,42,165,0.08)]">
                  <div className="grid flex-1 lg:grid-cols-[0.42fr_0.58fr]">
                    <div className={`relative min-h-[340px] overflow-hidden border-b-[3px] border-[#5320b8] bg-gradient-to-br ${activeScene.cards[0].color} lg:border-b-0 lg:border-r-[3px]`}>
                      <div className="absolute left-5 top-5 rounded-full border-[3px] border-white/90 bg-white px-4 py-2 text-sm font-black text-[#5320b8]">
                        {activeScene.cards[0].meta}
                      </div>
                      <div className="absolute left-[14%] top-[22%] h-[58%] w-[24%] rounded-[38px] bg-white/72 shadow-[0_16px_30px_rgba(118,84,151,0.08)]" />
                      <div className="absolute left-[43%] top-[18%] h-[64%] w-[26%] rounded-[38px] bg-white/82 shadow-[0_16px_30px_rgba(118,84,151,0.08)]" />
                      <div className="absolute left-[72%] top-[29%] h-[45%] w-[14%] rounded-[30px] bg-white/72 shadow-[0_16px_30px_rgba(118,84,151,0.08)]" />
                      <div className="absolute bottom-8 left-8 right-8 rounded-full border-[3px] border-white/90 bg-white/74 px-4 py-3 text-center text-sm font-semibold text-[#5c3ba6]">
                        {activeScene.cards[0].detail}
                      </div>
                    </div>

                    <div className="flex flex-col p-6">
                      <div className="text-[12px] font-black uppercase tracking-[0.32em] text-[#5c43c0]">{activeScene.code}</div>
                      <h2 className="mt-4 text-[clamp(2rem,3vw,4rem)] font-black leading-[0.96] tracking-[-0.05em] text-[#24164d]">
                        {activeScene.title}
                      </h2>
                      <p className="mt-4 max-w-[520px] text-[1rem] font-semibold leading-8 text-[#6b58a6]">{activeScene.summary}</p>

                      <div className="mt-5 grid gap-3">
                        {activeScene.rail.slice(0, 3).map((item) => (
                          <div key={item} className="border-[3px] border-[#e7def7] bg-[#fbf9ff] px-4 py-3 text-sm font-semibold text-[#5c43c0]">
                            {item}
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto grid grid-cols-2 border-t-[3px] border-[#5320b8] pt-4">
                        <button type="button" className="flex items-center justify-center gap-2 bg-[#25e25b] px-4 py-4 text-sm font-black uppercase tracking-[0.22em] text-[#5320b8]">
                          DETAILS
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button type="button" className="flex items-center justify-center gap-2 bg-[#5320b8] px-4 py-4 text-sm font-black uppercase tracking-[0.22em] text-[#25e25b]">
                          APPLY LOOK
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                <div className="grid min-h-0 gap-5 lg:grid-rows-3">
                  {activeScene.cards.slice(1).map((card, index) => (
                    <motion.article
                      key={`${activeScene.key}-${card.title}`}
                      initial={{ opacity: 0, x: 70 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.08 * (index + 1), ease: [0.22, 1, 0.36, 1] }}
                      className={`relative overflow-hidden border-[3px] border-[#5320b8] bg-gradient-to-br ${card.color} px-6 py-5 shadow-[0_18px_42px_rgba(78,42,165,0.08)]`}
                    >
                      <div className="absolute right-5 top-5 rounded-full border-[3px] border-white/90 bg-white/82 px-4 py-2 text-sm font-black text-[#5320b8]">
                        {card.meta}
                      </div>
                      <p className="text-[12px] font-black uppercase tracking-[0.3em] text-[#5c43c0]">右到左切换</p>
                      <h3 className="mt-4 max-w-[360px] text-[clamp(1.7rem,2vw,2.8rem)] font-black leading-[0.98] tracking-[-0.04em] text-[#25174d]">
                        {card.title}
                      </h3>
                      <p className="mt-4 max-w-[420px] text-[0.98rem] font-semibold leading-7 text-[#66539f]">{card.detail}</p>
                    </motion.article>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function FuturePlaceholder({ onBackToTop }: { onBackToTop: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-[linear-gradient(180deg,#efe1ff_0%,#fdf7f0_100%)] px-6 py-8 text-[#5320b8] lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(20,221,105,0.14),transparent_22%),radial-gradient(circle_at_82%_28%,rgba(63,231,255,0.16),transparent_24%),radial-gradient(circle_at_54%_72%,rgba(90,36,191,0.14),transparent_26%)]" />

      <div className="relative mx-auto grid w-full max-w-[1680px] gap-6 xl:grid-cols-[0.5fr_0.5fr]">
        <div className="border-[4px] border-[#3fe7ff] bg-[#5a24bf] px-6 py-6 text-[#14dd69] shadow-[0_28px_80px_rgba(77,26,167,0.16)]">
          <p className="text-sm font-black uppercase tracking-[0.34em]">PAGE 03</p>
          <h2 className="mt-4 text-[clamp(2.3rem,4vw,4.8rem)] font-black leading-[0.94] tracking-[-0.06em]">
            第三屏先留白，
            <br />
            等你继续加功能。
          </h2>
          <p className="mt-5 max-w-[560px] text-[1rem] font-semibold leading-8 text-[#dcfff0]">
            这一页先作为后续功能的预留舞台，现在保留同样的视觉语言和整页滚动节奏，后面可以继续往这里接 AI 助手、试穿、推荐池等内容。
          </p>

          <motion.button
            type="button"
            onClick={onBackToTop}
            onPointerMove={updatePointerGlow}
            onPointerLeave={resetPointerGlow}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="mt-7 inline-flex items-center gap-3 border-[3px] border-[#14dd69] px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-[#4d1aa7]"
            style={glowStyle(
              "linear-gradient(180deg, rgba(244,239,255,0.96), rgba(235,255,243,0.92))",
              "rgba(20,221,105,0.58)"
            )}
          >
            BACK TO TOP
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="grid gap-5">
          <div className="border-[4px] border-[#5320b8] bg-white/82 px-6 py-6 shadow-[0_20px_48px_rgba(77,26,167,0.08)] backdrop-blur-sm">
            <div className="flex items-center gap-3 text-[#25e25b]">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-black uppercase tracking-[0.3em]">COMING SOON</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {["AI 助手区", "试穿场景区", "推荐池", "个人衣橱统计"].map((item) => (
                <div key={item} className="min-h-[120px] border-[3px] border-dashed border-[#d8cff1] bg-[#fcfaff] px-4 py-4 text-sm font-semibold text-[#5d4aa3]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="border-[4px] border-[#25e25b] bg-[#25e25b] px-6 py-6 text-[#5320b8]">
            <p className="text-sm font-black uppercase tracking-[0.34em]">UI2</p>
            <p className="mt-4 max-w-[540px] text-[1rem] font-semibold leading-8">
              这一版已经改成三屏结构：第一页视频开场，第二页分类衣橱，第三页功能留白。后面继续扩展时，不需要再把页面拖得很长。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionDots({
  activeSection,
  onJump
}: {
  activeSection: SectionKey;
  onJump: (section: SectionKey) => void;
}) {
  return (
    <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
      {sectionOrder.map((section) => {
        const active = section === activeSection;
        return (
          <button
            key={section}
            type="button"
            onClick={() => onJump(section)}
            className={`group relative h-4 w-4 rounded-full border-[2px] transition ${
              active ? "border-[#14dd69] bg-[#14dd69]" : "border-white/80 bg-transparent hover:border-[#3fe7ff]"
            }`}
            aria-label={sectionTitles[section]}
          >
            <span
              className={`pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/18 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] transition ${
                active ? "bg-[#5a24bf] text-[#d5fff3] opacity-100" : "bg-[#5a24bf]/82 text-[#d5fff3] opacity-0 group-hover:opacity-100"
              }`}
            >
              {sectionTitles[section]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function UI2HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const closetRef = useRef<HTMLElement>(null);
  const futureRef = useRef<HTMLElement>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("套装");

  useEffect(() => {
    const root = scrollRef.current;
    const sections = [
      { key: "hero" as const, element: heroRef.current },
      { key: "closet" as const, element: closetRef.current },
      { key: "future" as const, element: futureRef.current }
    ];

    if (!root || sections.some((section) => !section.element)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const match = sections.find((section) => section.element === visible.target);
        if (match) {
          setActiveSection(match.key);
        }
      },
      {
        root,
        threshold: [0.35, 0.55, 0.72]
      }
    );

    sections.forEach((section) => {
      if (section.element) {
        observer.observe(section.element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const jumpToSection = (section: SectionKey, category?: CategoryKey) => {
    if (category) {
      setActiveCategory(category);
    }

    const target =
      section === "hero" ? heroRef.current : section === "closet" ? closetRef.current : futureRef.current;

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <CuteInteractionLayer>
      <div ref={scrollRef} className="h-screen snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-[#5a24bf]">
        <SectionDots activeSection={activeSection} onJump={jumpToSection} />

        <section ref={heroRef} className="relative flex min-h-screen snap-start flex-col overflow-hidden bg-[#5a24bf]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <HeroHeader activeSection={activeSection} activeCategory={activeCategory} onAction={jumpToSection} />
          <HeroStage onEnterCloset={() => jumpToSection("closet", "套装")} />
        </section>

        <section ref={closetRef} className="snap-start">
          <ClosetBoard activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        </section>

        <section ref={futureRef} className="snap-start">
          <FuturePlaceholder onBackToTop={() => jumpToSection("hero")} />
        </section>
      </div>
    </CuteInteractionLayer>
  );
}
