"use client";

import { motion } from "framer-motion";

const floatEase = { duration: 7.6, repeat: Infinity, ease: "easeInOut" } as const;

export function AnimeClosetScene() {
  return (
    <svg viewBox="0 0 800 940" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wallBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8ddd5" />
          <stop offset="54%" stopColor="#f7e9e2" />
          <stop offset="100%" stopColor="#f0d6ca" />
        </linearGradient>
        <linearGradient id="floorBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ddb09e" />
          <stop offset="100%" stopColor="#c99684" />
        </linearGradient>
        <linearGradient id="panelWash" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff5f0" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#fff5f0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="roomBloom" cx="54%" cy="24%" r="56%">
          <stop offset="0%" stopColor="#fff8f4" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#fff8f4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffde9" />
          <stop offset="100%" stopColor="#ffe6a5" />
        </radialGradient>
        <linearGradient id="windowGlass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fffcf8" />
          <stop offset="100%" stopColor="#ffe7cf" />
        </linearGradient>
        <linearGradient id="curtainTint" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff7f2" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#fff7f2" stopOpacity="0.36" />
        </linearGradient>
        <linearGradient id="woodMain" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e7b7a2" />
          <stop offset="100%" stopColor="#d69d88" />
        </linearGradient>
        <linearGradient id="woodSoft" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f0c8b7" />
          <stop offset="100%" stopColor="#e4ad98" />
        </linearGradient>
        <linearGradient id="creamFabric" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff2dc" />
          <stop offset="100%" stopColor="#f3d599" />
        </linearGradient>
        <linearGradient id="roseFabric" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd9d3" />
          <stop offset="100%" stopColor="#efb7aa" />
        </linearGradient>
        <linearGradient id="mintFabric" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e3f2eb" />
          <stop offset="100%" stopColor="#b9dccd" />
        </linearGradient>
        <linearGradient id="sheetTint" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fffaf6" />
          <stop offset="100%" stopColor="#f3ddd3" />
        </linearGradient>
        <linearGradient id="mirrorGlass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff8f4" />
          <stop offset="100%" stopColor="#eed8cc" />
        </linearGradient>
        <linearGradient id="rugTint" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f4e1d6" />
          <stop offset="100%" stopColor="#e5eee6" />
        </linearGradient>
        <linearGradient id="skinTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff0ea" />
          <stop offset="100%" stopColor="#efc4b7" />
        </linearGradient>
        <linearGradient id="hairTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6b4a4c" />
          <stop offset="100%" stopColor="#493338" />
        </linearGradient>
        <linearGradient id="cardiganTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff6f1" />
          <stop offset="100%" stopColor="#f2ddd2" />
        </linearGradient>
        <linearGradient id="skirtTone" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#eab7a9" />
          <stop offset="100%" stopColor="#d89284" />
        </linearGradient>
        <linearGradient id="reflectionDress" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6ddd4" />
          <stop offset="100%" stopColor="#e8b9ac" />
        </linearGradient>
        <pattern id="grainPattern" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="8" r="1" fill="#fff" fillOpacity="0.14" />
          <circle cx="24" cy="14" r="1" fill="#fff" fillOpacity="0.1" />
          <circle cx="17" cy="27" r="1" fill="#fff" fillOpacity="0.08" />
        </pattern>
        <filter id="shadowSoft" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#9b705d" floodOpacity="0.16" />
        </filter>
        <filter id="shadowLight" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#a77967" floodOpacity="0.12" />
        </filter>
        <filter id="windowGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      <rect width="800" height="642" fill="url(#wallBase)" />
      <rect y="642" width="800" height="298" fill="url(#floorBase)" />
      <rect width="800" height="642" fill="url(#roomBloom)" />
      <rect width="800" height="940" fill="url(#grainPattern)" opacity="0.18" />

      <g opacity="0.46">
        <path d="M56 126 h258 v344 h-258 z" fill="none" stroke="#f0cbc0" strokeWidth="2" />
        <path d="M74 148 h222 v300 h-222 z" fill="url(#panelWash)" />
        <path d="M324 126 h226 v344 h-226 z" fill="none" stroke="#f0cbc0" strokeWidth="2" />
        <path d="M344 148 h186 v300 h-186 z" fill="url(#panelWash)" />
      </g>

      <ellipse cx="606" cy="118" rx="204" ry="124" fill="#fff8f1" opacity="0.42" filter="url(#windowGlow)" />
      <path d="M624 18 L784 18 L684 524 Z" fill="#fff8f2" opacity="0.24" />

      <motion.g animate={{ y: [0, -5, 0] }} transition={floatEase}>
        <path d="M584 86 q0 -52 56 -52 q56 0 56 52 v242 h-112 z" fill="#fff4ed" opacity="0.58" />
        <path d="M600 94 q0 -40 40 -40 q40 0 40 40 v218 h-80 z" fill="url(#windowGlass)" />
        <circle cx="654" cy="122" r="38" fill="url(#sunGlow)" />
        <path d="M618 96 C628 168 628 238 620 312" stroke="rgba(255,255,255,0.82)" strokeWidth="12" strokeLinecap="round" />
        <path d="M682 96 C672 168 672 238 680 312" stroke="rgba(255,255,255,0.82)" strokeWidth="12" strokeLinecap="round" />
        <motion.path
          animate={{ d: ["M600 98 C582 164 590 240 620 312", "M600 98 C590 168 596 242 620 312", "M600 98 C582 164 590 240 620 312"] }}
          transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut" }}
          fill="url(#curtainTint)"
        />
        <motion.path
          animate={{ d: ["M680 98 C698 164 690 240 660 312", "M680 98 C690 168 684 242 660 312", "M680 98 C698 164 690 240 660 312"] }}
          transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          fill="url(#curtainTint)"
        />
      </motion.g>

      <g filter="url(#shadowLight)">
        <rect x="78" y="106" width="104" height="74" rx="20" fill="#fff6f2" stroke="#f1d6cb" />
        <rect x="94" y="122" width="72" height="42" rx="14" fill="#f7dfd5" />
        <path d="M104 154 q26 -20 52 0" stroke="#c69584" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="78" y="186" width="236" height="344" rx="40" fill="url(#woodMain)" />
        <rect x="96" y="204" width="198" height="308" rx="30" fill="url(#woodSoft)" />
        <path d="M120 238 h148" stroke="#bd8e7b" strokeWidth="8" strokeLinecap="round" />
        <rect x="112" y="244" width="164" height="68" rx="22" fill="#f4cfbf" opacity="0.7" />
        <path d="M134 320 h126" stroke="#d7a694" strokeWidth="4" strokeLinecap="round" opacity="0.62" />
        <path d="M142 252 q20 16 0 32" stroke="#d7a694" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M184 252 q20 16 0 32" stroke="#d7a694" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M226 252 q20 16 0 32" stroke="#d7a694" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M140 286 q-10 14 -2 30 v108 q18 30 44 0 V316 q4 -18 -6 -30 z" fill="url(#roseFabric)" />
        <path d="M186 282 q-10 14 -2 30 v134 q22 32 50 0 V312 q4 -18 -6 -30 z" fill="url(#creamFabric)" />
        <path d="M240 288 q-10 14 -2 30 v118 q20 30 46 0 V318 q4 -18 -6 -30 z" fill="url(#mintFabric)" />
        <rect x="116" y="458" width="160" height="40" rx="18" fill="#fff4ef" opacity="0.44" />
        <path d="M314 228 l54 -24 v286 l-54 20 z" fill="#ebb9a8" opacity="0.9" />
        <path d="M326 246 q18 52 18 152 q0 118 -18 170" stroke="#f4d9ce" strokeWidth="5" fill="none" opacity="0.68" />
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="84" y="724" width="254" height="142" rx="40" fill="#ebc2b2" />
        <rect x="100" y="742" width="224" height="102" rx="34" fill="url(#sheetTint)" />
        <rect x="116" y="752" width="88" height="58" rx="24" fill="#fff7f3" />
        <rect x="212" y="748" width="92" height="60" rx="24" fill="#f8eae3" />
        <rect x="132" y="778" width="56" height="68" rx="22" fill="#f6e1d8" />
      </g>

      <g filter="url(#shadowLight)">
        <rect x="338" y="700" width="132" height="96" rx="28" fill="#ebc4b5" />
        <rect x="354" y="718" width="100" height="62" rx="22" fill="#fff7f3" />
        <ellipse cx="404" cy="788" rx="40" ry="12" fill="rgba(192,137,116,0.14)" />
        <circle cx="366" cy="694" r="7" fill="#f1b8ab" />
        <rect x="378" y="684" width="14" height="26" rx="7" fill="#fff5ef" />
        <circle cx="406" cy="694" r="6" fill="#fde7c5" />
        <rect x="418" y="686" width="10" height="22" rx="5" fill="#fff7ef" />
      </g>

      <ellipse cx="476" cy="808" rx="178" ry="54" fill="url(#rugTint)" opacity="0.96" />
      <ellipse cx="478" cy="808" rx="116" ry="30" fill="#fdf2eb" opacity="0.82" />

      <g filter="url(#shadowSoft)">
        <rect x="624" y="628" width="108" height="216" rx="32" fill="#e8bfae" />
        <rect x="638" y="644" width="80" height="184" rx="26" fill="url(#mirrorGlass)" />
        <rect x="632" y="636" width="92" height="200" rx="30" fill="none" stroke="#f6dacd" strokeWidth="8" />
        <ellipse cx="674" cy="802" rx="22" ry="48" fill="#ecd1c7" opacity="0.52" />
        <ellipse cx="662" cy="790" rx="11" ry="30" fill="#f6e8e0" opacity="0.6" />
      </g>

      <g filter="url(#shadowLight)">
        <rect x="508" y="688" width="108" height="72" rx="30" fill="#f8ece6" />
        <rect x="522" y="704" width="80" height="44" rx="18" fill="#fff8f3" />
        <ellipse cx="562" cy="760" rx="56" ry="16" fill="rgba(176,118,96,0.18)" />
      </g>

      <motion.g animate={{ y: [0, -6, 0] }} transition={{ ...floatEase, delay: 0.25 }}>
        <ellipse cx="460" cy="692" rx="94" ry="24" fill="rgba(161,109,88,0.16)" />
        <g transform="translate(360 356)">
          <ellipse cx="118" cy="332" rx="74" ry="20" fill="rgba(144,100,86,0.16)" />

          <motion.g
            animate={{ rotate: [4, 8, 4], x: [0, 5, 0], y: [0, -3, 0] }}
            transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "38px 128px" }}
          >
            <path d="M4 100 q44 -28 70 0 l-10 18 q-28 -12 -48 0 z" fill="#bb8d7a" />
            <path d="M26 120 q26 -20 46 0 v92 q-10 18 -23 18 q-13 0 -23 -18 z" fill="url(#creamFabric)" />
            <path d="M42 94 q8 -18 22 0" stroke="#cb9f8d" strokeWidth="4" fill="none" strokeLinecap="round" />
          </motion.g>

          <path
            d="M118 34 q52 0 60 56 q4 30 -10 62 q-8 22 -2 52 q8 40 8 92 q0 66 -20 108 q-16 34 -38 34 q-20 0 -34 -32 q-20 -44 -20 -118 q0 -54 8 -96 q6 -28 -8 -52 q-18 -30 -12 -62 q10 -44 68 -44 z"
            fill="url(#hairTone)"
          />
          <ellipse cx="118" cy="110" rx="42" ry="54" fill="url(#skinTone)" />
          <path d="M90 100 q26 16 56 0 q-4 24 -2 54 q-24 22 -52 0 q4 -30 -2 -54 z" fill="#f8d8cf" opacity="0.68" />
          <path d="M94 72 q18 14 48 0" stroke="#7b5755" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="102" cy="108" r="2.8" fill="#654745" />
          <circle cx="132" cy="108" r="2.8" fill="#654745" />
          <path d="M104 124 q14 12 28 0" stroke="#d2958b" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M104 148 q14 28 28 0 v42 q-14 14 -28 0 z" fill="#f2c4b7" />

          <path
            d="M58 196 q26 -18 60 -18 q46 0 80 20 q-10 58 -10 126 q-36 34 -138 0 q0 -64 4 -86 q4 -26 4 -42 z"
            fill="url(#cardiganTone)"
          />
          <path d="M80 192 q38 18 76 0" stroke="#ead5cb" strokeWidth="3" fill="none" opacity="0.72" />
          <path
            d="M74 318 q22 -18 44 -18 q24 0 48 20 q-6 60 -14 96 q-22 18 -72 18 q-14 -42 -6 -116 z"
            fill="url(#skirtTone)"
          />
          <path d="M82 336 q0 42 8 82 M102 332 q2 52 0 94 M126 332 q0 52 -4 92 M148 338 q-2 38 -10 82" stroke="#ebb7a8" strokeWidth="2.4" opacity="0.72" />

          <path d="M62 216 q-22 10 -42 38" stroke="#fbece5" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M182 216 q22 12 42 42" stroke="#fbece5" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M84 432 q-10 50 -2 96" stroke="#fbefe8" strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M146 432 q2 52 -10 96" stroke="#fbefe8" strokeWidth="11" strokeLinecap="round" fill="none" />
          <ellipse cx="82" cy="538" rx="14" ry="6" fill="#e9c9bb" />
          <ellipse cx="136" cy="538" rx="14" ry="6" fill="#e9c9bb" />
        </g>
      </motion.g>

      <g opacity="0.54" filter="url(#shadowLight)">
        <path d="M664 700 q10 24 6 70 q-6 38 -12 54 q24 -10 34 -28 q14 -22 14 -58 q0 -28 -8 -44 q-10 -18 -34 -24 z" fill="url(#reflectionDress)" />
      </g>

      <motion.g animate={{ opacity: [0.36, 0.74, 0.36] }} transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="560" cy="188" r="5" fill="#fffaf2" />
        <circle cx="524" cy="148" r="4" fill="#fff8ef" />
        <circle cx="238" cy="136" r="4" fill="#fff7f1" />
        <circle cx="468" cy="86" r="3" fill="#fff7f1" />
        <circle cx="612" cy="244" r="4" fill="#fff8ee" />
      </motion.g>
    </svg>
  );
}
