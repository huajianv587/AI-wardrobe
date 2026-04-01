export function HomeStoryScene() {
  return (
    <div className="story-stage-shell" aria-hidden="true">
      <span className="story-stage-tag story-stage-tag-top">粉粉衣橱小屋</span>
      <span className="story-stage-tag story-stage-tag-right">今天穿哪件呀</span>
      <div className="story-stage-bubble">
        <span className="story-stage-bubble-emoji">💗</span>
        <span>轻轻选一件，今天也会很好看。</span>
      </div>

      <svg className="story-stage-svg" viewBox="0 0 760 520" role="presentation">
        <defs>
          <linearGradient id="roomBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff6f3" />
            <stop offset="46%" stopColor="#ffe7eb" />
            <stop offset="100%" stopColor="#fff2df" />
          </linearGradient>
          <linearGradient id="floorBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe6df" />
            <stop offset="100%" stopColor="#ffd8cf" />
          </linearGradient>
          <linearGradient id="wardrobeDoor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd8dd" />
            <stop offset="100%" stopColor="#f7bfd0" />
          </linearGradient>
          <linearGradient id="wardrobeFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9f5" />
            <stop offset="100%" stopColor="#ffe6e6" />
          </linearGradient>
          <linearGradient id="dressCoral" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffc7b8" />
            <stop offset="100%" stopColor="#ff9eb0" />
          </linearGradient>
          <linearGradient id="dressMint" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e7fff5" />
            <stop offset="100%" stopColor="#bce8d3" />
          </linearGradient>
          <linearGradient id="dressButter" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff0bf" />
            <stop offset="100%" stopColor="#ffdca0" />
          </linearGradient>
          <linearGradient id="girlDress" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd7df" />
            <stop offset="100%" stopColor="#ffb7cb" />
          </linearGradient>
        </defs>

        <rect x="32" y="30" width="696" height="432" rx="52" fill="url(#roomBg)" />
        <circle cx="566" cy="138" r="92" fill="rgba(255, 239, 211, 0.86)" />
        <circle cx="562" cy="138" r="52" fill="rgba(255, 249, 238, 0.72)" />

        <rect x="54" y="326" width="652" height="118" rx="32" fill="url(#floorBg)" opacity="0.92" />
        <ellipse cx="386" cy="366" rx="220" ry="44" fill="rgba(255,255,255,0.36)" />

        <g className="story-stage-window">
          <rect x="96" y="86" width="146" height="118" rx="26" fill="rgba(255,255,255,0.72)" />
          <path d="M170 86v118M96 146h146" stroke="rgba(255, 200, 200, 0.65)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="198" cy="120" r="12" fill="rgba(255, 229, 170, 0.92)" />
          <path d="M120 116c12-16 22-16 34 0" stroke="rgba(255,255,255,0.76)" strokeWidth="6" strokeLinecap="round" />
        </g>

        <g className="story-stage-wardrobe">
          <rect x="440" y="120" width="192" height="200" rx="36" fill="url(#wardrobeFrame)" />
          <rect x="458" y="138" width="70" height="164" rx="24" fill="url(#wardrobeDoor)" />
          <rect x="544" y="138" width="70" height="164" rx="24" fill="url(#wardrobeDoor)" opacity="0.84" />
          <path d="M474 162h126" stroke="rgba(204, 134, 156, 0.42)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="516" cy="220" r="5.5" fill="rgba(206, 124, 148, 0.78)" />
          <circle cx="557" cy="220" r="5.5" fill="rgba(206, 124, 148, 0.78)" />

          <g className="story-stage-hangers">
            <path d="M490 166c0-9 12-9 12 0" stroke="rgba(185, 122, 146, 0.68)" strokeWidth="4" fill="none" />
            <path d="M560 166c0-9 12-9 12 0" stroke="rgba(185, 122, 146, 0.68)" strokeWidth="4" fill="none" />
          </g>

          <g className="story-stage-dress-sway">
            <path d="M478 172h34l12 52c2 8-4 18-14 18h-30c-10 0-16-10-14-18z" fill="url(#dressCoral)" />
            <path d="M545 172h38l11 58c1 8-5 16-14 16h-32c-10 0-16-8-14-16z" fill="url(#dressMint)" />
          </g>
        </g>

        <g className="story-stage-rug">
          <ellipse cx="264" cy="376" rx="112" ry="38" fill="rgba(255,255,255,0.58)" />
          <ellipse cx="264" cy="376" rx="88" ry="26" fill="rgba(255, 224, 230, 0.72)" />
        </g>

        <g className="story-stage-mirror">
          <rect x="112" y="214" width="70" height="122" rx="28" fill="rgba(255,255,255,0.86)" />
          <rect x="124" y="228" width="46" height="96" rx="20" fill="rgba(227, 242, 251, 0.72)" />
          <rect x="139" y="336" width="14" height="34" rx="7" fill="rgba(255, 233, 227, 0.92)" />
        </g>

        <g className="story-stage-girl">
          <ellipse cx="296" cy="312" rx="28" ry="16" fill="rgba(69, 54, 31, 0.09)" />
          <circle cx="300" cy="210" r="30" fill="#ffead8" />
          <path d="M273 212c2-34 20-52 46-44 22 7 28 27 24 52-6-12-17-17-31-17-19 0-28 4-39 9z" fill="#6a4a4d" />
          <path d="M282 234c5 8 12 11 18 11 7 0 15-3 23-11" stroke="#e9a7b3" strokeWidth="4" strokeLinecap="round" />
          <rect x="286" y="238" width="28" height="32" rx="14" fill="#ffead8" />
          <path d="M262 276c14-18 28-26 38-26 12 0 26 8 41 27l16 58c2 8-4 16-13 16h-88c-9 0-15-8-13-16z" fill="url(#girlDress)" />
          <path className="story-stage-girl-arm" d="M337 260c22-6 33-13 46-26" stroke="#ffead8" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M266 266c-18 4-30 12-38 24" stroke="#ffead8" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M282 354c-4 24-6 44-8 60" stroke="#ffead8" strokeWidth="13" strokeLinecap="round" />
          <path d="M320 354c4 24 7 44 12 60" stroke="#ffead8" strokeWidth="13" strokeLinecap="round" />
          <path d="M266 417h26" stroke="#d17f92" strokeWidth="10" strokeLinecap="round" />
          <path d="M323 417h26" stroke="#d17f92" strokeWidth="10" strokeLinecap="round" />
        </g>

        <g className="story-stage-picked">
          <path d="M380 202h34l12 54c2 8-5 18-14 18h-31c-9 0-15-10-13-18z" fill="url(#dressButter)" />
          <path d="M393 188c0-9 13-9 13 0" stroke="rgba(188, 145, 104, 0.72)" strokeWidth="4" fill="none" />
        </g>

        <g className="story-stage-sparkles">
          <path className="story-stage-sparkle story-stage-sparkle-one" d="M160 260l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#ffd0db" />
          <path className="story-stage-sparkle story-stage-sparkle-two" d="M610 88l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#ffd8a1" />
          <path className="story-stage-sparkle story-stage-sparkle-three" d="M520 292l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#d2f3e2" />
        </g>
      </svg>
    </div>
  );
}
