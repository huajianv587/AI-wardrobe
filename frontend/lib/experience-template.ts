import { readFile } from "node:fs/promises";
import path from "node:path";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

const PAGE_SCRIPT_MAP: Record<string, string> = {
  "wardrobe-management.html": "/experience/wardrobe-management.js",
  "smart-wardrobe.html": "/experience/smart-wardrobe.js",
  "outfit-diary.html": "/experience/outfit-diary.js",
  "closet-analysis.html": "/experience/closet-analysis.js",
  "style-profile.html": "/experience/style-profile.js",
};

const SHARED_TEMPLATE_OVERRIDES = `
html,body{scrollbar-gutter:stable both-edges}
body{overscroll-behavior-y:contain}
a,button,[role="button"],input,select,textarea{touch-action:manipulation}
`;

const PAGE_STYLE_MAP: Record<string, string> = {
  "wardrobe-management.html": `
body > nav{display:none !important}
.hero{
  min-height:min(640px,calc(100vh - 8px)) !important;
  padding-top:8px !important;
  grid-template-columns:minmax(0,1.08fr) minmax(320px,.82fr) !important;
  align-items:start !important;
  gap:18px !important;
  overflow:hidden !important;
}
.hl{
  justify-content:flex-start !important;
  padding:12px 40px 14px 48px !important;
}
.ribbon{margin-bottom:12px !important}
.htb{margin-bottom:16px !important}
.feat-rows{margin-bottom:18px !important}
.hang-tags{margin-top:0 !important}
.hr{
  min-height:460px !important;
  align-self:start !important;
}
.stage{width:min(170px,72%) !important}
.phone{border-radius:22px !important}
.scroll-h,.chip.ca,.chip.cb,.vt{display:none !important}
.panel{
  padding:18px 36px 54px !important;
  min-height:100vh !important;
  scroll-margin-top:0 !important;
}
.ph{
  padding-bottom:14px !important;
  margin-bottom:18px !important;
}
.pb{
  min-height:calc(100vh - 194px) !important;
  align-items:stretch !important;
}
.pb > div:last-child{
  min-height:calc(100vh - 194px) !important;
}
.stats{margin-bottom:18px !important}
`,
  "smart-wardrobe.html": `
body > nav{display:none !important}
.page{
  min-height:auto !important;
  padding:28px 34px 42px !important;
}
.pg-header{
  padding-bottom:16px !important;
  margin-bottom:18px !important;
}
.stat-row{margin-bottom:20px !important}
.main-grid{gap:16px !important}
.lp{top:20px !important}
`,
  "outfit-diary.html": `
body{padding-top:0 !important}
.top-bar{margin-bottom:0 !important}
.stats-bar{margin-bottom:0 !important}
`,
  "closet-analysis.html": `
body{padding-top:22px !important}
.top-bar{margin-bottom:16px !important}
.tab-bar{margin-bottom:18px !important}
.section.show{padding-top:0 !important}
`,
  "style-profile.html": `
body{padding-top:0 !important}
.hero{
  min-height:280px !important;
  padding:34px 34px 26px !important;
}
.content{
  padding-top:20px !important;
}
`
};

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/wardrobe", label: "衣橱管理" },
  { href: "/smart-wardrobe", label: "智能衣物" },
  { href: "/outfit-diary", label: "穿搭日志" },
  { href: "/closet-analysis", label: "衣橱分析" },
  { href: "/style-profile", label: "风格雷达" },
];

function buildBrandNav(activeHref: string) {
  const links = NAV_ITEMS.map((item) => {
    const activeClass = item.href === activeHref ? ' class="active"' : "";
    return `<a href="${item.href}"${activeClass}>${item.label}</a>`;
  }).join("");

  return `
<nav>
  <a class="logo" href="/">
    <div class="lm">
      <svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.02 7 6.5c0 1.4.65 2.64 1.65 3.5H5.5L6.5 21h11l1-11h-3.15A4.47 4.47 0 0 0 17 6.5C17 4.02 14.76 2 12 2zm0 2c1.38 0 2.5 1.01 2.5 2.5S13.38 9 12 9s-2.5-1.01-2.5-2.5S10.62 4 12 4z"/></svg>
    </div>
    <div>
      <div class="lcn">文文的衣橱</div>
      <span class="len">WENWEN WARDROBE</span>
    </div>
  </a>
  <div class="nl">${links}</div>
  <div class="nr"><a href="/register" class="reg">注册</a><a href="/login">登录</a></div>
</nav>`;
}

function replaceDesktopNav(html: string, filename: string) {
  if (filename === "wardrobe-management.html") {
    return html.replace(/<nav>[\s\S]*?<\/nav>/, buildBrandNav("/wardrobe"));
  }
  if (filename === "smart-wardrobe.html") {
    return html.replace(/<nav>[\s\S]*?<\/nav>/, buildBrandNav("/smart-wardrobe"));
  }
  return html;
}

function stripInlineScript(html: string) {
  return html.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, "</body>");
}

export async function loadExperienceTemplate(filename: string) {
  const templatePath = path.join(process.cwd(), "templates", "experience", filename);
  const pageScript = PAGE_SCRIPT_MAP[filename];

  let html = await readFile(templatePath, "utf8");
  html = replaceDesktopNav(html, filename);
  html = stripInlineScript(html)
    .replace(/<head>/, "<head><base target=\"_top\">")
    .replace(/云衣橱/g, "文文的衣橱")
    .replace(/AI衣橱/g, "文文的衣橱")
    .replace(/AI WARDROBE/g, "WENWEN WARDROBE");

  html = html.replace(
    /<\/head>/,
    `<style id="wenwen-template-overrides">${SHARED_TEMPLATE_OVERRIDES}${PAGE_STYLE_MAP[filename] ?? ""}</style><script>
window.__WENWEN_API_BASE__=${JSON.stringify(API_BASE_URL)};
window.__WENWEN_BRAND__="文文的衣橱";
window.__WENWEN_BRAND_EN__="WENWEN WARDROBE";
window.__WENWEN_TEMPLATE__=${JSON.stringify(filename)};
</script></head>`,
  );

  html = html.replace(
    /<\/body>/,
    `<script src="/experience/common.js"></script><script src="${pageScript}"></script></body>`,
  );

  return html;
}
