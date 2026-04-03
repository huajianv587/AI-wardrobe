"use client";

import { motion } from "framer-motion";

const floatTransition = { duration: 6.8, repeat: Infinity, ease: "easeInOut" } as const;

export function AnimeClosetScene() {
  return (
    <svg viewBox="0 0 800 940" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sceneWall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f9dfd8" />
          <stop offset="58%" stopColor="#f8e7de" />
          <stop offset="100%" stopColor="#f4d8cc" />
        </linearGradient>
        <linearGradient id="sceneFloor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#dfb49f" />
          <stop offset="100%" stopColor="#cea08c" />
        </linearGradient>
        <radialGradient id="roomGlow" cx="50%" cy="26%" r="54%">
          <stop offset="0%" stopColor="#fff9f4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff9f4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunDisc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffce4" />
          <stop offset="100%" stopColor="#ffeab8" />
        </radialGradient>
        <linearGradient id="windowGlass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="100%" stopColor="#ffe6cd" />
        </linearGradient>
        <linearGradient id="sheerCurtain" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff7f2" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#fff7f2" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="woodOuter" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e7b8a3" />
          <stop offset="100%" stopColor="#d79f88" />
        </linearGradient>
        <linearGradient id="woodInner" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f1c7b6" />
          <stop offset="100%" stopColor="#e7b09c" />
        </linearGradient>
        <linearGradient id="fabricRose" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd8d2" />
          <stop offset="100%" stopColor="#efb6a9" />
        </linearGradient>
        <linearGradient id="fabricCream" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff0d7" />
          <stop offset="100%" stopColor="#f4d69d" />
        </linearGradient>
        <linearGradient id="fabricMint" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e3f2eb" />
          <stop offset="100%" stopColor="#bfdccc" />
        </linearGradient>
        <linearGradient id="bedBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#efc8ba" />
          <stop offset="100%" stopColor="#dcac98" />
        </linearGradient>
        <linearGradient id="sheetGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fffaf6" />
          <stop offset="100%" stopColor="#f7e6df" />
        </linearGradient>
        <linearGradient id="dresserGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f0d2c5" />
          <stop offset="100%" stopColor="#e2b7a4" />
        </linearGradient>
        <linearGradient id="mirrorFrame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6d2c3" />
          <stop offset="100%" stopColor="#e8b6a3" />
        </linearGradient>
        <linearGradient id="mirrorGlass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff8f4" />
          <stop offset="100%" stopColor="#efd9cd" />
        </linearGradient>
        <linearGradient id="rugGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f5e3d8" />
          <stop offset="100%" stopColor="#e8efe6" />
        </linearGradient>
        <linearGradient id="skinTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff0ea" />
          <stop offset="100%" stopColor="#f0c6ba" />
        </linearGradient>
        <linearGradient id="hairTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6b4c4d" />
          <stop offset="100%" stopColor="#4b3439" />
        </linearGradient>
        <linearGradient id="cardiganTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff5ee" />
          <stop offset="100%" stopColor="#f3ddd4" />
        </linearGradient>
        <linearGradient id="skirtTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e7b5a7" />
          <stop offset="100%" stopColor="#d99889" />
        </linearGradient>
        <filter id="shadowSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#b48776" floodOpacity="0.16" />
        </filter>
        <filter id="shadowMedium" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#9f6d59" floodOpacity="0.18" />
        </filter>
        <filter id="glowSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      <rect width="800" height="650" fill="url(#sceneWall)" />
      <rect y="650" width="800" height="290" fill="url(#sceneFloor)" />
      <rect width="800" height="650" fill="url(#roomGlow)" opacity="0.9" />

      <ellipse cx="550" cy="136" rx="186" ry="122" fill="#fff8f2" opacity="0.42" filter="url(#glowSoft)" />
      <path d="M618 40 L760 40 L668 520 Z" fill="#fff7ee" opacity="0.26" />

      <g opacity="0.72">
        <rect x="74" y="88" width="82" height="54" rx="16" fill="#fff6f1" stroke="#f1d6ca" />
        <rect x="88" y="102" width="22" height="26" rx="7" fill="#f7ddd4" />
        <rect x="118" y="102" width="24" height="10" rx="5" fill="#ecd0c3" />
        <rect x="118" y="118" width="30" height="10" rx="5" fill="#ecd0c3" />
        <rect x="168" y="118" width="68" height="40" rx="14" fill="#fff6f1" stroke="#f1d6ca" />
        <rect x="184" y="132" width="36" height="12" rx="6" fill="#efd8ce" />
      </g>

      <motion.g animate={{ y: [0, -4, 0] }} transition={floatTransition}>
        <rect x="596" y="86" width="138" height="248" rx="38" fill="#fff1eb" opacity="0.46" />
        <rect x="612" y="102" width="106" height="216" rx="30" fill="url(#windowGlass)" />
        <circle cx="666" cy="146" r="36" fill="url(#sunDisc)" opacity="0.95" />
        <path
          d="M620 110 C632 172 632 252 620 316"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M710 110 C698 172 698 252 710 316"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <motion.path
          animate={{ d: ["M612 112 C596 172 600 248 620 316", "M612 112 C602 168 604 250 620 316", "M612 112 C596 172 600 248 620 316"] }}
          transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut" }}
          fill="url(#sheerCurtain)"
        />
        <motion.path
          animate={{ d: ["M718 112 C734 172 730 248 710 316", "M718 112 C728 168 726 250 710 316", "M718 112 C734 172 730 248 710 316"] }}
          transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          fill="url(#sheerCurtain)"
        />
      </motion.g>

      <g filter="url(#shadowSoft)">
        <rect x="90" y="180" width="222" height="348" rx="42" fill="url(#woodOuter)" />
        <rect x="108" y="198" width="188" height="312" rx="34" fill="url(#woodInner)" />
        <path d="M132 234 h144" stroke="#c08d79" strokeWidth="8" strokeLinecap="round" />
        <path d="M152 248 q20 16 0 34" stroke="#d6a795" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M194 248 q20 16 0 34" stroke="#d6a795" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M236 248 q20 16 0 34" stroke="#d6a795" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M150 274 q-10 12 -2 28 v104 q18 28 42 0 V302 q4 -18 -6 -28 z" fill="url(#fabricRose)" />
        <path d="M194 268 q-10 12 -2 28 v126 q20 30 46 0 V296 q4 -18 -6 -28 z" fill="url(#fabricCream)" />
        <path d="M244 274 q-10 12 -2 28 v112 q18 28 42 0 V302 q4 -18 -6 -28 z" fill="url(#fabricMint)" />
        <rect x="128" y="444" width="148" height="48" rx="22" fill="#fff6f2" opacity="0.46" />
        <path d="M312 224 l54 -26 v278 l-54 22 z" fill="#ebb8a7" opacity="0.84" />
        <path d="M324 236 q20 58 20 164 q0 112 -20 176" stroke="#f4d8cb" strokeWidth="5" fill="none" opacity="0.7" />
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="70" y="718" width="256" height="142" rx="40" fill="url(#bedBase)" />
        <rect x="88" y="738" width="226" height="98" rx="34" fill="url(#sheetGrad)" />
        <rect x="104" y="748" width="88" height="56" rx="22" fill="#fff7f2" />
        <rect x="204" y="744" width="94" height="60" rx="24" fill="#faede7" />
        <rect x="118" y="774" width="60" height="72" rx="24" fill="#f5e0d6" />
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="308" y="720" width="144" height="88" rx="30" fill="url(#dresserGrad)" />
        <rect x="326" y="742" width="108" height="52" rx="22" fill="#fff7f2" opacity="0.9" />
        <rect x="350" y="676" width="66" height="48" rx="18" fill="#f8ddd3" />
        <ellipse cx="382" cy="786" rx="42" ry="14" fill="rgba(204,148,126,0.14)" />
        <circle cx="332" cy="694" r="7" fill="#f1b7aa" />
        <rect x="342" y="684" width="14" height="24" rx="7" fill="#fff4ef" />
        <circle cx="366" cy="692" r="8" fill="#fde8c8" />
        <rect x="377" y="680" width="13" height="28" rx="7" fill="#fff6ef" />
        <circle cx="404" cy="694" r="6" fill="#cfe7d9" />
        <rect x="412" y="684" width="12" height="24" rx="6" fill="#f5fbf7" />
      </g>

      <ellipse cx="482" cy="808" rx="178" ry="52" fill="url(#rugGrad)" opacity="0.95" />
      <ellipse cx="482" cy="808" rx="112" ry="32" fill="#fdf3ec" opacity="0.72" />

      <g filter="url(#shadowMedium)">
        <rect x="620" y="650" width="102" height="206" rx="30" fill="#e9c0af" opacity="0.88" />
        <rect x="634" y="664" width="74" height="178" rx="26" fill="url(#mirrorGlass)" />
        <rect x="628" y="658" width="86" height="190" rx="28" fill="none" stroke="#f9ddd1" strokeWidth="8" />
        <path d="M646 684 q25 18 50 0" stroke="rgba(255,255,255,0.7)" strokeWidth="7" fill="none" strokeLinecap="round" />
        <ellipse cx="670" cy="798" rx="18" ry="44" fill="#ecd0c6" opacity="0.6" />
        <ellipse cx="656" cy="792" rx="10" ry="30" fill="#f5e4dc" opacity="0.62" />
      </g>

      <g filter="url(#shadowSoft)">
        <ellipse cx="584" cy="728" rx="54" ry="18" fill="rgba(185,130,109,0.2)" />
        <rect x="536" y="666" width="94" height="68" rx="28" fill="#f8ece5" />
        <rect x="550" y="682" width="66" height="40" rx="18" fill="#fff8f4" opacity="0.9" />
      </g>

      <motion.g animate={{ y: [0, -7, 0] }} transition={{ ...floatTransition, delay: 0.3 }}>
        <ellipse cx="510" cy="674" rx="86" ry="24" fill="rgba(161,110,91,0.18)" />
        <g transform="translate(426 408)">
          <ellipse cx="112" cy="254" rx="72" ry="18" fill="rgba(144,100,86,0.18)" />

          <motion.g
            animate={{ rotate: [6, 10, 6], x: [0, 4, 0], y: [0, -2, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "36px 116px" }}
          >
            <path d="M8 84 q44 -26 70 0 l-10 16 q-28 -12 -48 0 z" fill="#bb8d7a" />
            <path d="M26 102 q26 -20 46 0 v84 q-10 18 -23 18 q-13 0 -23 -18 z" fill="url(#fabricCream)" />
            <path d="M44 78 q8 -16 22 0" stroke="#c79c89" strokeWidth="4" fill="none" strokeLinecap="round" />
          </motion.g>

          <path
            d="M108 22 q48 0 56 52 q4 30 -8 58 q-8 18 -4 46 q6 34 6 82 q0 66 -16 104 q-14 32 -30 32 q-18 0 -30 -30 q-20 -48 -20 -118 q0 -52 8 -92 q6 -28 -6 -50 q-16 -28 -10 -58 q10 -46 54 -46 z"
            fill="url(#hairTone)"
          />
          <ellipse cx="110" cy="92" rx="38" ry="48" fill="url(#skinTone)" />
          <path d="M86 86 q24 12 48 0 q-4 22 -2 50 q-20 18 -44 0 q2 -28 -2 -50 z" fill="#f8d7cd" opacity="0.66" />
          <path d="M90 62 q16 14 38 0" stroke="#7a5554" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M96 102 q14 10 28 0" stroke="#d4978e" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <circle cx="95" cy="90" r="2.8" fill="#6b4b49" />
          <circle cx="123" cy="90" r="2.8" fill="#6b4b49" />
          <path d="M96 124 q14 30 28 0 v42 q-14 12 -28 0 z" fill="#f4c6ba" />

          <path
            d="M50 170 q24 -18 60 -18 q40 0 68 18 q-8 52 -8 116 q-32 34 -122 0 q0 -58 2 -76 q4 -26 0 -40 z"
            fill="url(#cardiganTone)"
          />
          <path d="M68 166 q38 14 84 0" stroke="#ead4c9" strokeWidth="3" fill="none" opacity="0.7" />
          <path
            d="M70 280 q20 -16 40 -16 q22 0 44 18 q-4 56 -10 88 q-20 18 -66 18 q-12 -38 -8 -108 z"
            fill="url(#skirtTone)"
          />
          <path d="M78 300 q0 38 6 76 M96 296 q0 44 2 88 M116 296 q0 42 -2 86 M136 300 q-2 34 -10 74" stroke="#ebb7a8" strokeWidth="2.4" opacity="0.72" />

          <path d="M56 188 q-18 8 -34 30" stroke="#f8e7de" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M172 188 q20 12 36 34" stroke="#f8e7de" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M74 388 q-10 44 -2 94" stroke="#fbeee7" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M138 388 q4 42 -8 94" stroke="#fbeee7" strokeWidth="11" strokeLinecap="round" fill="none" />
          <ellipse cx="74" cy="494" rx="14" ry="6" fill="#e8c6b8" />
          <ellipse cx="128" cy="494" rx="14" ry="6" fill="#e8c6b8" />
        </g>
      </motion.g>

      <motion.g animate={{ opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="512" cy="172" r="7" fill="#fffaf4" />
        <circle cx="536" cy="150" r="4" fill="#fff8ee" />
        <circle cx="560" cy="204" r="5" fill="#fffaf2" />
        <circle cx="212" cy="160" r="5" fill="#fff7f1" />
        <circle cx="246" cy="122" r="4" fill="#fff5ee" />
      </motion.g>
    </svg>
  );
}
