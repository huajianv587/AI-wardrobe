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
html,body{scrollbar-gutter:stable both-edges;max-width:100%;overflow-x:hidden}
body{overscroll-behavior-y:contain}
img,svg,video,canvas{max-width:100%}
a,button,[role="button"],input,select,textarea{touch-action:manipulation}
@media (max-width:780px){
html,body{scrollbar-gutter:auto}
html{-webkit-text-size-adjust:100%}
body{padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}
input,select,textarea{font-size:16px !important}
.page,.panel,.content,.hero,.main-grid,.pb{max-width:100%}
.pagi{flex-wrap:wrap !important;justify-content:center !important;gap:8px !important}
.pg,.pgdots{flex-shrink:0 !important}
.modal-bg{padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px)) !important}
.modal{max-height:min(88dvh,calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)));overflow:auto !important}
}
`;

const PAGE_STYLE_MAP: Record<string, string> = {
  "wardrobe-management.html": `
body > nav{display:none !important}
body{
  overflow-y:auto !important;
}
.hero{
  min-height:calc(100vh - 34px) !important;
  padding-top:0 !important;
  grid-template-columns:minmax(0,.98fr) minmax(500px,1.08fr) !important;
  align-items:center !important;
  gap:18px !important;
  overflow:hidden !important;
}
.hl{
  justify-content:flex-start !important;
  padding:30px 42px 8px 48px !important;
  min-height:auto !important;
}
.ribbon{margin-bottom:12px !important}
.htb{margin-bottom:10px !important}
.feat-rows{margin-bottom:2px !important}
.feat-row{
  position:relative !important;
  cursor:pointer !important;
  overflow:hidden !important;
  transition:transform .26s ease,background .26s ease,box-shadow .26s ease !important;
}
.feat-row::after{
  content:"" !important;
  position:absolute !important;
  inset:-1px !important;
  background:linear-gradient(118deg,transparent 22%,rgba(255,255,255,.52) 48%,transparent 74%) !important;
  opacity:0 !important;
  transform:translateX(-42%) !important;
  transition:transform .76s cubic-bezier(.22,1,.36,1),opacity .24s ease !important;
  pointer-events:none !important;
}
.feat-row:hover{
  background:rgba(255,252,249,.92) !important;
  transform:translateX(10px) !important;
  box-shadow:0 16px 30px rgba(192,122,110,.11) !important;
}
.feat-row:hover::after{
  opacity:.92 !important;
  transform:translateX(42%) !important;
}
.hang-tags{
  margin-top:26px !important;
  align-self:flex-start !important;
  gap:10px !important;
}
.hr{
  min-height:100% !important;
  align-self:stretch !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  position:relative !important;
}
.hr::before{
  content:"" !important;
  position:absolute !important;
  width:420px !important;
  height:420px !important;
  border-radius:999px !important;
  background:radial-gradient(circle,rgba(255,223,228,.56) 0%,rgba(255,237,218,.18) 48%,transparent 74%) !important;
  filter:blur(10px) !important;
  opacity:.96 !important;
}
.stage{
  width:min(332px,94%) !important;
  position:relative !important;
  transform-style:preserve-3d !important;
  transition:transform .34s ease,filter .34s ease !important;
  animation:wenwenStageFloat 8.8s ease-in-out infinite !important;
}
.stage::after{
  content:"" !important;
  position:absolute !important;
  left:50% !important;
  bottom:-18px !important;
  width:72% !important;
  height:26px !important;
  transform:translateX(-50%) !important;
  border-radius:999px !important;
  background:radial-gradient(circle,rgba(176,142,120,.26) 0%,transparent 72%) !important;
  filter:blur(8px) !important;
}
.phone{
  position:relative !important;
  border-radius:34px !important;
  box-shadow:0 34px 86px rgba(30,20,16,.15),0 12px 28px rgba(192,122,110,.18) !important;
}
.phone::before{
  content:"" !important;
  position:absolute !important;
  inset:0 !important;
  background:linear-gradient(125deg,rgba(255,255,255,.5),transparent 32%,transparent 62%,rgba(255,225,210,.22)) !important;
  pointer-events:none !important;
}
.icsource{
  display:flex !important;
  flex-wrap:wrap !important;
  gap:6px !important;
  margin-top:8px !important;
}
.icsource-platform,.icsource-status{
  display:inline-flex !important;
  align-items:center !important;
  min-height:22px !important;
  padding:0 9px !important;
  border-radius:999px !important;
  font-size:10.5px !important;
  letter-spacing:.04em !important;
}
.icsource-platform{
  background:rgba(248,236,226,.96) !important;
  color:#bf7f69 !important;
}
.icsource-status{
  background:rgba(238,244,239,.96) !important;
  color:#6b937b !important;
}
.scroll-h,.chip.ca,.chip.cb,.vt{display:none !important}
.panel{
  padding:26px 34px 36px !important;
  min-height:calc(100vh - 34px) !important;
  scroll-margin-top:0 !important;
}
.ph{
  padding-bottom:10px !important;
  margin-bottom:14px !important;
}
.pb{
  min-height:auto !important;
  gap:16px !important;
  align-items:stretch !important;
}
.pb > div:last-child{
  min-height:auto !important;
  display:flex !important;
  flex-direction:column !important;
}
.stats{margin-bottom:14px !important}
.cg{
  grid-template-columns:repeat(auto-fill,minmax(176px,1fr)) !important;
  gap:12px !important;
}
.uptile,.ic-img{aspect-ratio:.72 !important}
.pagi{
  margin-top:14px !important;
  padding-top:12px !important;
}
@keyframes wenwenStageFloat{
  0%,100%{transform:translateY(-10px) rotateX(0deg) rotateY(0deg)}
  50%{transform:translateY(-20px) rotateX(1.8deg) rotateY(-2.6deg)}
}
@media (max-width:780px){
body{padding-top:0 !important}
.hero{
  min-height:auto !important;
  grid-template-columns:1fr !important;
  gap:0 !important;
  overflow:visible !important;
}
.hl{
  padding:20px 16px 14px !important;
}
.ht-r1,.ht-r2{
  font-size:clamp(30px,10vw,40px) !important;
  gap:8px !important;
}
.feat-rows{margin-bottom:10px !important}
.feat-row:hover{transform:none !important}
.hang-tags{
  gap:8px !important;
  margin-top:0 !important;
}
.hang-tag{width:100% !important;justify-content:center !important}
.hr{
  min-height:unset !important;
  padding:14px 16px 20px !important;
}
.cx,.vt{display:none !important}
.stage{
  width:min(274px,78vw) !important;
  animation:none !important;
}
.phone{border-radius:22px !important}
.panel{
  padding:12px 16px 28px !important;
  min-height:auto !important;
}
.ph{
  grid-template-columns:1fr !important;
  gap:12px !important;
}
.ph-acts{
  width:100% !important;
  flex-wrap:wrap !important;
}
.ph-acts .pa{
  flex:1 1 calc(50% - 4px) !important;
  justify-content:center !important;
}
.tb{gap:10px !important}
.tbs{
  min-width:0 !important;
  max-width:none !important;
  flex:1 1 100% !important;
}
.fp{
  width:100% !important;
  overflow:auto !important;
  flex-wrap:nowrap !important;
  padding-bottom:2px !important;
}
.tbsort,.vtw{
  width:100% !important;
  margin-left:0 !important;
}
.vtw{justify-content:space-between !important}
.pb{
  grid-template-columns:1fr !important;
  min-height:auto !important;
}
.sb{position:static !important}
.stats{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
}
.cg{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
}
.cg.lv{grid-template-columns:1fr !important}
.ic-acts,.ic-chk{opacity:1 !important}
.pagi{margin-top:14px !important}
}
@media (max-width:560px){
.ph-acts .pa{flex:1 1 100% !important}
}
@media (max-width:430px){
.hl{
  padding:16px 12px 12px !important;
}
.ribbon{
  padding:5px 12px 5px 8px !important;
  margin-bottom:10px !important;
}
.ribbon-text{font-size:10px !important}
.htb{margin-bottom:8px !important}
.ht-r1,.ht-r2{
  font-size:clamp(28px,9vw,36px) !important;
  line-height:1.08 !important;
}
.nb{
  font-size:10px !important;
  padding:3px 8px !important;
}
.feat-row{
  gap:10px !important;
  padding:10px 12px !important;
}
.fr-icon{
  width:28px !important;
  height:28px !important;
}
.fr-label{font-size:12px !important}
.hang-tags{
  width:100% !important;
}
.hang-tag{
  min-height:40px !important;
  padding:8px 14px !important;
  font-size:11.5px !important;
}
.hr{
  padding:8px 12px 18px !important;
}
.stage{
  width:min(250px,76vw) !important;
}
.panel{
  padding:10px 12px 24px !important;
}
.ph-title{font-size:24px !important}
.tb{margin-bottom:14px !important}
.sb{
  display:flex !important;
  flex-wrap:wrap !important;
  gap:8px !important;
  background:transparent !important;
  border:none !important;
  padding:0 !important;
  overflow:visible !important;
}
.sb-sec{
  width:100% !important;
  padding:6px 2px 2px !important;
  border:none !important;
  background:transparent !important;
}
.sbi{
  flex:1 1 calc(50% - 4px) !important;
  min-width:0 !important;
  border:.5px solid var(--border) !important;
  border-radius:18px !important;
  padding:9px 12px !important;
  background:var(--panel) !important;
}
.sbi.on{
  border-left:.5px solid var(--rose) !important;
}
.sb-colors{
  width:100% !important;
  padding:4px 0 0 !important;
}
.stats{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:8px !important;
}
.sc{
  padding:12px 12px !important;
}
.sclbl{font-size:8px !important}
.scval{font-size:18px !important}
.scsub{font-size:9px !important}
.cg{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:8px !important;
}
.uptile,.ic-img{aspect-ratio:.7 !important}
.ic{
  border-radius:18px !important;
}
.icfoot{
  padding:10px 10px 12px !important;
}
.icname{
  font-size:12px !important;
  line-height:1.4 !important;
}
.ictags{
  gap:4px !important;
}
.ict{
  font-size:9px !important;
  padding:2px 6px !important;
}
.pagi{
  margin-top:12px !important;
  padding-top:10px !important;
}
}
@media (max-width:390px){
.hl{
  padding:14px 10px 10px !important;
}
.ht-r1,.ht-r2{
  font-size:clamp(26px,8.6vw,32px) !important;
}
.feat-row{
  padding:9px 10px !important;
}
.fr-num{font-size:9px !important}
.fr-label{font-size:11.5px !important}
.hang-tag{
  padding:8px 12px !important;
  font-size:11px !important;
}
.stage{
  width:min(232px,74vw) !important;
}
.panel{
  padding:10px 10px 22px !important;
}
.ph-title{font-size:22px !important}
.ph-eyebrow{font-size:9px !important}
.ph-acts .pa{
  min-height:40px !important;
  font-size:11px !important;
}
.tbs input{
  padding-left:32px !important;
  font-size:12px !important;
}
.fpp{
  padding:6px 11px !important;
  font-size:10px !important;
}
.sbi{
  padding:8px 10px !important;
}
.sbin{font-size:11px !important}
.sbict{
  font-size:9px !important;
  padding:1px 6px !important;
}
.stats{
  gap:7px !important;
}
.sc{
  padding:11px 10px !important;
}
.scval{font-size:17px !important}
.cg{
  gap:7px !important;
}
.icfoot{
  padding:9px 9px 11px !important;
}
.icname{font-size:11.5px !important}
.ict{font-size:8.5px !important}
}
`,
  "smart-wardrobe.html": `
body > nav{display:none !important}
.page{
  min-height:auto !important;
  padding:28px 34px 42px !important;
}
.pgh-r{
  gap:10px !important;
  align-items:center !important;
}
.pgh-r .btn-hero{
  min-width:156px !important;
  justify-content:center !important;
  box-shadow:0 18px 38px rgba(192,122,110,.12) !important;
}
.pg-header{
  padding-bottom:16px !important;
  margin-bottom:18px !important;
}
.stat-row{margin-bottom:20px !important}
.main-grid{gap:16px !important}
.lp{top:20px !important}
.decomp-shell{
  display:none !important;
  margin-bottom:0 !important;
}
.decomp-shell.show.is-preview{
  display:block !important;
  margin-bottom:18px !important;
  padding:18px 20px !important;
  border-radius:26px !important;
  box-shadow:0 24px 54px rgba(80,56,43,.1) !important;
}
.decomp-shell.show.is-preview .decomp-head{
  display:grid !important;
  grid-template-columns:minmax(0,1fr) auto !important;
  gap:14px !important;
  align-items:end !important;
}
.decomp-shell.show.is-preview .decomp-title{
  font-size:24px !important;
  line-height:1.15 !important;
}
.decomp-shell.show.is-preview .decomp-sub{
  max-width:680px !important;
}
.enrich-stats{
  display:none !important;
}
.enrich-grid.report-layout{
  grid-template-columns:340px repeat(2,minmax(0,1fr)) !important;
  gap:16px !important;
  align-items:start !important;
}
.enrich-report{
  position:sticky !important;
  top:20px !important;
  grid-row:1 / span 2 !important;
  display:grid !important;
  gap:16px !important;
  padding:22px !important;
  border:.5px solid rgba(192,122,110,.14) !important;
  border-radius:28px !important;
  background:
    radial-gradient(circle at 16% 18%,rgba(255,220,225,.42),transparent 28%),
    radial-gradient(circle at 82% 20%,rgba(209,232,227,.34),transparent 30%),
    linear-gradient(145deg,rgba(255,252,249,.98),rgba(248,242,237,.94)) !important;
  box-shadow:0 26px 58px rgba(79,56,44,.1) !important;
  overflow:hidden !important;
}
.enrich-report::after{
  content:"" !important;
  position:absolute !important;
  inset:auto -28px -48px auto !important;
  width:180px !important;
  height:180px !important;
  border-radius:999px !important;
  background:radial-gradient(circle,rgba(192,122,110,.12) 0%,transparent 70%) !important;
  pointer-events:none !important;
}
.enrich-report-kicker{
  width:max-content !important;
  padding:7px 12px !important;
  border-radius:999px !important;
  background:rgba(192,122,110,.11) !important;
  color:var(--rose) !important;
  font-size:10px !important;
  letter-spacing:.12em !important;
  text-transform:uppercase !important;
}
.enrich-report-head{
  display:grid !important;
  grid-template-columns:minmax(0,1fr) auto !important;
  gap:14px !important;
  align-items:start !important;
}
.enrich-report-title{
  font-family:var(--serif-jp) !important;
  font-size:28px !important;
  line-height:1.05 !important;
  color:var(--ink) !important;
}
.enrich-report-copy{
  margin:10px 0 0 !important;
  font-size:12px !important;
  line-height:1.75 !important;
  color:var(--ink2) !important;
}
.enrich-report-progress{
  display:grid !important;
  gap:2px !important;
  min-width:92px !important;
  padding:12px 14px !important;
  border-radius:18px !important;
  background:rgba(255,255,255,.72) !important;
  text-align:center !important;
  box-shadow:0 12px 24px rgba(96,74,58,.08) !important;
}
.enrich-report-progress strong{
  font-family:var(--serif-en) !important;
  font-size:28px !important;
  color:var(--ink) !important;
}
.enrich-report-progress span{
  font-size:10px !important;
  letter-spacing:.08em !important;
  color:var(--ink3) !important;
}
.enrich-report-grid{
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
}
.enrich-report-card{
  display:grid !important;
  gap:4px !important;
  padding:14px 14px 12px !important;
  border-radius:20px !important;
  border:1px solid rgba(232,224,214,.8) !important;
  background:rgba(255,255,255,.8) !important;
  box-shadow:0 10px 20px rgba(96,74,58,.05) !important;
}
.enrich-report-card.saved{background:linear-gradient(145deg,rgba(237,246,242,.95),rgba(255,255,255,.86)) !important}
.enrich-report-card.edited{background:linear-gradient(145deg,rgba(255,244,231,.95),rgba(255,255,255,.86)) !important}
.enrich-report-card.new{background:linear-gradient(145deg,rgba(238,245,252,.95),rgba(255,255,255,.86)) !important}
.enrich-report-card.pending{background:linear-gradient(145deg,rgba(253,242,240,.96),rgba(255,255,255,.86)) !important}
.enrich-report-value{
  font-family:var(--serif-en) !important;
  font-size:32px !important;
  line-height:1 !important;
  color:var(--ink) !important;
}
.enrich-report-label{
  font-size:12px !important;
  font-weight:600 !important;
  color:var(--ink) !important;
}
.enrich-report-detail{
  font-size:10.5px !important;
  line-height:1.55 !important;
  color:var(--ink3) !important;
}
.enrich-report-footer{
  display:flex !important;
  flex-wrap:wrap !important;
  gap:8px !important;
}
.enrich-report-footer span{
  display:inline-flex !important;
  align-items:center !important;
  min-height:30px !important;
  padding:0 12px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.8) !important;
  border:1px solid rgba(232,224,214,.86) !important;
  font-size:11px !important;
  color:var(--ink2) !important;
}
.enc-thumb.has-photo,.pr-thumb.has-photo{
  padding:0 !important;
  overflow:hidden !important;
  background:#fff !important;
}
.enc-thumb.has-photo img,.pr-thumb.has-photo img{
  width:100% !important;
  height:100% !important;
  object-fit:cover !important;
  display:block !important;
}
.enc-thumb{
  border-radius:8px !important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.6) !important;
}
@media (max-width:780px){
body{padding-top:0 !important}
.page{padding:22px 16px 28px !important}
.pg-header{
  grid-template-columns:1fr !important;
  gap:12px !important;
}
.pgh-r{
  flex-wrap:wrap !important;
  justify-content:flex-start !important;
}
.stat-row{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
}
.main-grid{grid-template-columns:1fr !important}
.lp{position:static !important}
.decomp-shell.show.is-preview .decomp-head{
  grid-template-columns:1fr !important;
}
.enrich-grid.report-layout{
  grid-template-columns:1fr !important;
}
.enrich-report{
  position:relative !important;
  top:auto !important;
  grid-row:auto !important;
}
.toolbar{align-items:stretch !important}
.tsearch{
  min-width:0 !important;
  max-width:none !important;
  flex:1 1 100% !important;
}
.tsort{
  flex:1 1 calc(50% - 4px) !important;
}
.toolbar .tact{
  flex:1 1 calc(50% - 4px) !important;
  justify-content:center !important;
}
.ml-auto{margin-left:0 !important}
.ip-grid,.enrich-grid{grid-template-columns:1fr !important}
.enc-acts,.ipc-acts,.batch-bar{flex-wrap:wrap !important}
.enc-acts .ia,.ipc-acts .ia,.batch-bar .bba{
  flex:1 1 calc(50% - 6px) !important;
  justify-content:center !important;
}
.modal{
  width:min(100vw - 24px, 480px) !important;
  padding:20px !important;
}
}
@media (max-width:560px){
.enc-acts .ia,.ipc-acts .ia,.batch-bar .bba{flex:1 1 100% !important}
.pr-item{
  flex-direction:column !important;
  align-items:flex-start !important;
}
.pr-status{
  width:100% !important;
  justify-content:space-between !important;
}
}
@media (max-width:430px){
.page{
  padding:18px 12px 24px !important;
}
.pg-header{
  margin-bottom:14px !important;
  padding-bottom:14px !important;
}
.pgh-title{
  font-size:24px !important;
}
.pgh-sub{
  font-size:11.5px !important;
  line-height:1.65 !important;
}
.pgh-r{
  gap:8px !important;
}
.pgh-r > *{
  flex:1 1 calc(50% - 4px) !important;
}
.pgh-r > :first-child{
  flex:1 1 100% !important;
}
.stat-row{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:8px !important;
  margin-bottom:14px !important;
}
.stc{
  padding:12px 12px !important;
}
.stc-ico{
  width:26px !important;
  height:26px !important;
  margin-bottom:8px !important;
}
.stc-val{font-size:18px !important}
.stc-lbl{font-size:8px !important}
.main-grid{
  gap:14px !important;
}
.lp{
  order:2 !important;
}
.rp{
  order:1 !important;
}
.lcard-hd{
  padding:11px 12px !important;
}
.lcard-body{
  padding:12px !important;
}
.pipe-item,.svc-item{
  gap:8px !important;
}
.pi-label,.svc-name{
  font-size:11px !important;
}
.toolbar{
  gap:8px !important;
}
.tsearch input{
  font-size:12px !important;
}
.tsort,.toolbar .tact{
  min-height:40px !important;
}
.ip-grid,.enrich-grid{
  gap:10px !important;
}
.ipc-visual{
  height:132px !important;
}
.ipc-info{
  padding:10px !important;
}
.ipc-name,.enc-name,.pr-name{
  font-size:12px !important;
}
.enc{
  border-radius:18px !important;
}
.enc-top{
  padding:12px 12px 10px !important;
}
.enc-enriched{
  padding:10px 12px !important;
}
.enc-acts{
  padding:10px 12px !important;
}
.pr-item{
  padding:11px 12px !important;
}
}
@media (max-width:390px){
.page{
  padding:16px 10px 22px !important;
}
.pgh-title{
  font-size:22px !important;
}
.pgh-sub{
  font-size:11px !important;
}
.pgh-r > *{
  flex:1 1 100% !important;
}
.stat-row{
  gap:7px !important;
}
.stc{
  padding:10px 10px !important;
}
.stc-val{font-size:17px !important}
.main-grid{
  gap:12px !important;
}
.lcard-body{
  padding:10px !important;
}
.toolbar{
  gap:7px !important;
}
.tsort,.toolbar .tact{
  flex:1 1 100% !important;
}
.batch-bar{
  padding:10px 12px !important;
  gap:8px !important;
}
.batch-bar .bba{
  flex:1 1 100% !important;
  justify-content:center !important;
}
.ipc{
  border-radius:18px !important;
}
.ipc-visual{
  height:124px !important;
}
.ipc-info{
  padding:9px !important;
}
.ipc-name,.enc-name,.pr-name{
  font-size:11.5px !important;
}
.ipc-service,.enc-score,.pr-pct{
  font-size:9.5px !important;
}
.enc-top{
  gap:10px !important;
  padding:10px !important;
}
.enc-enriched,.enc-acts{
  padding-left:10px !important;
  padding-right:10px !important;
}
.pr-item{
  padding:10px !important;
}
.pr-status{
  flex-direction:column !important;
  align-items:stretch !important;
}
.pr-progress{
  width:100% !important;
}
}
`,
  "outfit-diary.html": `
body{
  padding-top:0 !important;
  height:100vh !important;
  min-height:100vh !important;
  overflow:hidden !important;
  display:flex !important;
  flex-direction:column !important;
}
.stats-bar{
  width:min(100%,860px) !important;
  margin:0 auto !important;
  padding:12px 16px 6px !important;
  gap:10px !important;
  overflow:hidden !important;
  flex:0 0 auto !important;
}
.stat-chip{
  flex:1 1 0 !important;
  min-width:0 !important;
  padding:10px 14px !important;
  border-radius:16px !important;
}
.stat-chip .stat-num{font-size:20px !important}
.view-switch-row{
  width:min(100%,860px) !important;
  padding:0 16px 6px !important;
  flex:0 0 auto !important;
}
.calendar-section{
  width:min(100%,860px) !important;
  padding:8px 16px 14px !important;
  flex:1 1 auto !important;
  min-height:0 !important;
  display:flex !important;
  flex-direction:column !important;
}
.month-nav{
  margin-bottom:10px !important;
  gap:18px !important;
}
.month-label{
  font-size:22px !important;
  min-width:150px !important;
}
.weekday-row{
  margin-bottom:8px !important;
  flex:0 0 auto !important;
}
.days-grid{
  flex:1 1 auto !important;
  min-height:0 !important;
  gap:6px !important;
  grid-template-rows:repeat(6,minmax(0,1fr)) !important;
}
.day-cell{
  aspect-ratio:auto !important;
  min-height:0 !important;
  border-radius:14px !important;
}
.day-cell .day-num{font-size:13px !important}
.suitcase-section{
  width:min(100%,860px) !important;
  padding:8px 16px 16px !important;
  flex:1 1 auto !important;
  min-height:0 !important;
  overflow:auto !important;
}
.suitcase-header{margin-bottom:16px !important}
.trip-setup{padding:18px !important;margin-bottom:16px !important}
.suitcase-visual{padding:18px !important}
@media (max-width:780px){
body{
  display:block !important;
  height:auto !important;
  min-height:auto !important;
  overflow:visible !important;
}
.stats-bar,.view-switch-row,.calendar-section,.suitcase-section{
  width:100% !important;
  padding-left:16px !important;
  padding-right:16px !important;
}
.stats-bar{
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:10px !important;
  overflow:visible !important;
}
.stat-chip{min-width:0 !important}
.view-switch-row{padding-bottom:10px !important}
.calendar-section,.suitcase-section{
  flex:none !important;
  min-height:auto !important;
}
.month-nav{gap:12px !important}
.month-label{
  min-width:0 !important;
  font-size:20px !important;
}
.day-cell{min-height:52px !important}
.trip-setup,.suitcase-visual{padding:16px !important}
.suitcase-grid{
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
}
}
@media (max-width:560px){
.stats-bar{grid-template-columns:1fr !important}
.suitcase-grid{grid-template-columns:1fr !important}
}
`,
  "closet-analysis.html": `
body{padding-top:18px !important}
.radar-premium-shell{
  position:relative !important;
  width:100% !important;
  min-height:100% !important;
  display:grid !important;
  grid-template-rows:auto 1fr auto auto auto !important;
  align-items:center !important;
  justify-items:center !important;
  gap:8px !important;
  overflow:hidden !important;
  padding:4px 0 8px !important;
}
.radar-premium-ribbon{
  position:relative !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  min-width:172px !important;
  min-height:56px !important;
  padding:0 34px !important;
  border-radius:999px !important;
  border:1px solid rgba(238,181,198,.72) !important;
  background:
    linear-gradient(180deg,rgba(255,246,249,.98),rgba(252,225,234,.94)) !important;
  box-shadow:
    0 18px 34px rgba(224,150,177,.16),
    inset 0 1px 0 rgba(255,255,255,.88) !important;
}
.radar-premium-ribbon::before,
.radar-premium-ribbon::after{
  content:"" !important;
  position:absolute !important;
  top:50% !important;
  width:34px !important;
  height:22px !important;
  transform:translateY(-50%) !important;
  border-radius:999px !important;
  background:linear-gradient(180deg,rgba(252,205,220,.9),rgba(245,175,199,.8)) !important;
  border:1px solid rgba(238,182,200,.7) !important;
  box-shadow:0 10px 20px rgba(224,150,177,.16) !important;
}
.radar-premium-ribbon::before{
  left:-14px !important;
}
.radar-premium-ribbon::after{
  right:-14px !important;
}
.radar-premium-ribbon span{
  font-family:var(--serif-jp) !important;
  font-size:26px !important;
  font-weight:400 !important;
  letter-spacing:.08em !important;
  color:#cd748f !important;
  text-shadow:0 6px 16px rgba(255,255,255,.88) !important;
}
.radar-premium-stage{
  position:relative !important;
  width:min(100%,420px) !important;
  min-height:410px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
}
.radar-premium-stage::before{
  content:"" !important;
  position:absolute !important;
  inset:8% 8% 10% !important;
  border-radius:40px !important;
  background:
    radial-gradient(circle at 50% 45%,rgba(255,252,253,.9) 0%,rgba(255,236,243,.7) 36%,transparent 72%),
    radial-gradient(circle at 18% 22%,rgba(251,205,222,.55),transparent 24%),
    radial-gradient(circle at 82% 28%,rgba(255,228,239,.52),transparent 20%),
    radial-gradient(circle at 22% 74%,rgba(255,230,240,.42),transparent 24%) !important;
  filter:blur(1px) !important;
  pointer-events:none !important;
}
.radar-premium-blush{
  position:absolute !important;
  border-radius:999px !important;
  filter:blur(26px) !important;
  opacity:.9 !important;
  pointer-events:none !important;
  animation:wenwenRadarFloat 10s ease-in-out infinite !important;
}
.radar-premium-blush.blush-a{
  width:152px !important;
  height:152px !important;
  left:8% !important;
  top:13% !important;
  background:rgba(248,192,210,.42) !important;
}
.radar-premium-blush.blush-b{
  width:188px !important;
  height:188px !important;
  right:10% !important;
  bottom:8% !important;
  background:rgba(255,228,238,.44) !important;
  animation-direction:reverse !important;
}
.radar-premium-spark{
  position:absolute !important;
  width:10px !important;
  height:10px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.94) !important;
  box-shadow:0 0 12px rgba(255,255,255,.9) !important;
  pointer-events:none !important;
  animation:wenwenRadarSpark 4.6s ease-in-out infinite !important;
}
.radar-premium-spark::before,
.radar-premium-spark::after{
  content:"" !important;
  position:absolute !important;
  left:50% !important;
  top:50% !important;
  background:rgba(255,255,255,.96) !important;
  transform:translate(-50%,-50%) !important;
  border-radius:999px !important;
}
.radar-premium-spark::before{
  width:2px !important;
  height:16px !important;
}
.radar-premium-spark::after{
  width:16px !important;
  height:2px !important;
}
.radar-premium-spark.spark-a{
  left:14% !important;
  top:24% !important;
}
.radar-premium-spark.spark-b{
  right:18% !important;
  top:18% !important;
  animation-delay:.8s !important;
}
.radar-premium-spark.spark-c{
  left:22% !important;
  bottom:18% !important;
  animation-delay:1.3s !important;
}
.radar-premium-svg{
  position:relative !important;
  z-index:2 !important;
  width:min(100%,360px) !important;
  overflow:visible !important;
  filter:drop-shadow(0 28px 42px rgba(221,140,169,.2)) !important;
}
.radar-premium-ring{
  fill:rgba(255,255,255,.09) !important;
  stroke:rgba(238,172,196,.42) !important;
  stroke-width:1 !important;
}
.radar-premium-grid line{
  stroke:rgba(238,172,196,.34) !important;
  stroke-width:1 !important;
}
.radar-premium-area-shadow{
  fill:rgba(243,147,176,.28) !important;
  opacity:.88 !important;
  filter:url(#gapGlow) !important;
}
.radar-premium-area{
  fill:url(#gapFill) !important;
  opacity:.98 !important;
  animation:wenwenRadarPulse 6s ease-in-out infinite !important;
}
.radar-premium-outline{
  fill:none !important;
  stroke:url(#gapStroke) !important;
  stroke-width:2.8 !important;
  stroke-linejoin:round !important;
}
.radar-premium-center-hex{
  fill:rgba(255,255,255,.06) !important;
  stroke:rgba(249,213,225,.72) !important;
  stroke-width:1 !important;
}
.radar-premium-center-light{
  fill:url(#gapCore) !important;
  opacity:.95 !important;
  filter:url(#gapGlow) !important;
}
.radar-premium-node-halo{
  opacity:.34 !important;
  filter:url(#gapGlow) !important;
}
.radar-premium-node-dot{
  stroke:rgba(255,255,255,.96) !important;
  stroke-width:2 !important;
  filter:url(#gapGlow) !important;
}
.radar-premium-core-glow{
  position:absolute !important;
  left:50% !important;
  top:50% !important;
  width:96px !important;
  height:96px !important;
  transform:translate(-50%,-50%) !important;
  border-radius:999px !important;
  background:radial-gradient(circle,rgba(255,255,255,.94) 0%,rgba(255,236,243,.78) 38%,rgba(245,171,197,.16) 72%,transparent 100%) !important;
  filter:blur(9px) !important;
  pointer-events:none !important;
  z-index:1 !important;
}
.radar-premium-axis-badge{
  position:absolute !important;
  transform:translate(-50%,-50%) !important;
  width:34px !important;
  height:34px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  border-radius:999px !important;
  border:2px solid rgba(255,255,255,.88) !important;
  background:color-mix(in srgb, var(--axis-tone) 32%, white) !important;
  box-shadow:0 14px 24px rgba(223,146,174,.18) !important;
  z-index:3 !important;
}
.radar-premium-axis-badge span{
  font-size:14px !important;
  line-height:1 !important;
}
.radar-premium-label{
  position:absolute !important;
  transform:translate(-50%,-50%) !important;
  display:grid !important;
  justify-items:center !important;
  gap:2px !important;
  min-width:72px !important;
  text-align:center !important;
  z-index:4 !important;
  pointer-events:none !important;
}
.radar-premium-label strong{
  font-family:var(--serif-jp) !important;
  font-size:17px !important;
  font-weight:400 !important;
  letter-spacing:.02em !important;
  color:#8c6565 !important;
  text-shadow:0 4px 16px rgba(255,255,255,.96) !important;
}
.radar-premium-scale{
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:12px !important;
}
.radar-premium-scale-edge{
  font-family:var(--serif-jp) !important;
  font-size:13px !important;
  color:#9d7c84 !important;
  letter-spacing:.08em !important;
}
.radar-premium-hearts{
  display:flex !important;
  align-items:center !important;
  gap:6px !important;
  padding:8px 14px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.54) !important;
  box-shadow:0 10px 22px rgba(220,145,173,.14) !important;
}
.radar-premium-heart{
  font-size:15px !important;
  line-height:1 !important;
  color:rgba(236,166,189,.32) !important;
  transform:translateY(0) scale(1) !important;
}
.radar-premium-heart.is-active{
  animation:wenwenRadarPulse 3.8s ease-in-out infinite !important;
}
.radar-premium-heart.level-1{color:#f7dce5 !important}
.radar-premium-heart.level-2{color:#f7c9d9 !important}
.radar-premium-heart.level-3{color:#f5b3c9 !important}
.radar-premium-heart.level-4{color:#f09fb9 !important}
.radar-premium-heart.level-5{color:#eb89a8 !important}
.radar-premium-heart.level-6{color:#e47397 !important}
.radar-premium-footnote{
  display:inline-flex !important;
  align-items:center !important;
  gap:8px !important;
  min-height:38px !important;
  padding:0 16px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.62) !important;
  box-shadow:0 12px 24px rgba(220,145,173,.12) !important;
  font-family:var(--serif-jp) !important;
  font-size:12.5px !important;
  color:#8f666d !important;
}
.radar-premium-footnote span{
  font-size:14px !important;
}
.radar-premium-metrics{
  display:flex !important;
  flex-wrap:wrap !important;
  justify-content:center !important;
  gap:8px !important;
  width:100% !important;
}
.radar-premium-chip{
  display:inline-flex !important;
  align-items:center !important;
  gap:7px !important;
  min-height:32px !important;
  padding:0 12px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.68) !important;
  border:1px solid rgba(250,219,229,.82) !important;
  font-size:11px !important;
  color:#8a6366 !important;
  box-shadow:0 10px 18px rgba(220,145,173,.1) !important;
}
.radar-premium-chip i{
  width:8px !important;
  height:8px !important;
  border-radius:50% !important;
  display:block !important;
}
@keyframes wenwenRadarFloat{
  0%,100%{transform:translate3d(0,0,0) scale(1)}
  50%{transform:translate3d(8px,-10px,0) scale(1.05)}
}
@keyframes wenwenRadarPulse{
  0%,100%{opacity:.96}
  50%{opacity:.72}
}
@keyframes wenwenRadarSpark{
  0%,100%{opacity:.7;transform:scale(.9)}
  50%{opacity:1;transform:scale(1.18)}
}
@media (min-width:781px){
html,body{
  height:100% !important;
}
body{
  height:100vh !important;
  min-height:100vh !important;
  padding:14px 18px !important;
  overflow:hidden !important;
  display:flex !important;
  flex-direction:column !important;
  gap:10px !important;
}
.top-bar{
  width:min(100%,1120px) !important;
  margin:0 auto !important;
  padding:20px 24px 16px !important;
  border-radius:26px !important;
  flex:0 0 auto !important;
}
.top-bar h1{
  font-size:38px !important;
  line-height:1 !important;
}
.top-bar .sub{
  margin-top:8px !important;
  font-size:12px !important;
  line-height:1.5 !important;
}
.tab-bar{
  width:min(100%,1120px) !important;
  margin:0 auto !important;
  gap:8px !important;
  padding-bottom:2px !important;
  position:relative !important;
  top:auto !important;
  flex:0 0 auto !important;
}
.tab-btn{
  padding:10px 16px !important;
  font-size:12px !important;
  border-radius:22px !important;
}
.section{
  width:min(100%,1120px) !important;
  margin:0 auto !important;
  flex:1 1 auto !important;
  min-height:0 !important;
}
.section.show{
  display:grid !important;
  height:100% !important;
  min-height:0 !important;
  gap:12px !important;
  padding-top:0 !important;
  overflow:hidden !important;
  align-content:stretch !important;
}
.analysis-card,
.gap-overview,
.gap-suggest,
.cat-gap{
  margin:0 !important;
  border-radius:16px !important;
}
.analysis-card{
  padding:16px !important;
}
.card-header{
  margin-bottom:10px !important;
}
.card-header h3{
  font-size:14px !important;
}
.card-badge{
  padding:3px 9px !important;
  font-size:10px !important;
}
.repeat-item,
.care-item,
.idle-item{
  padding:10px 12px !important;
  gap:10px !important;
  border-radius:12px !important;
  margin-bottom:8px !important;
}
.repeat-thumb{
  width:52px !important;
  height:52px !important;
  border-radius:14px !important;
  font-size:24px !important;
}
.repeat-item .repeat-info h4,
.care-info h4,
.idle-info h4{
  font-size:12px !important;
}
.repeat-item .repeat-info p,
.care-info p,
.idle-info p{
  font-size:10.5px !important;
  line-height:1.45 !important;
}
.repeat-count{
  font-size:24px !important;
}
.repeat-count small{
  font-size:9px !important;
}
.care-emoji{
  font-size:28px !important;
}
.care-action{
  padding:6px 12px !important;
  font-size:10.5px !important;
}
.action-row{
  gap:6px !important;
  margin-top:8px !important;
}
.action-pill{
  padding:4px 8px !important;
  font-size:10px !important;
}
.idle-days .num{
  font-size:20px !important;
}
.idle-days .label{
  font-size:9px !important;
}
#sec-gap{
  grid-template-columns:minmax(300px,.9fr) minmax(0,1.1fr) !important;
  grid-template-rows:minmax(0,1fr) auto !important;
}
#sec-gap .gap-overview,
#sec-gap .gap-suggest,
#sec-gap .category-gaps{
  min-height:0 !important;
}
#sec-gap .gap-overview{
  grid-column:1 !important;
  grid-row:1 !important;
  padding:18px 20px !important;
  display:flex !important;
  flex-direction:column !important;
  justify-content:center !important;
  margin-bottom:0 !important;
}
#sec-gap .gap-score{
  font-size:46px !important;
}
#sec-gap .gap-score-label{
  margin-top:4px !important;
  font-size:11px !important;
}
#sec-gap .gap-meter{
  margin-top:10px !important;
  height:7px !important;
}
#sec-gap .category-gaps{
  grid-column:2 !important;
  grid-row:1 / span 2 !important;
  height:100% !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  grid-auto-rows:minmax(0,1fr) !important;
  gap:10px !important;
  align-content:stretch !important;
}
#sec-gap .cat-gap{
  padding:12px 14px !important;
  display:flex !important;
  flex-direction:column !important;
  justify-content:center !important;
  min-height:0 !important;
}
#sec-gap .cat-gap .cat-icon{
  font-size:20px !important;
  margin-bottom:4px !important;
}
#sec-gap .cat-gap .cat-name{
  font-size:11px !important;
  margin-bottom:3px !important;
}
#sec-gap .cat-gap .cat-status{
  font-size:12px !important;
}
#sec-gap .cat-gap .cat-bar{
  margin-top:7px !important;
}
#sec-gap .gap-suggest{
  grid-column:1 !important;
  grid-row:2 !important;
  margin-top:0 !important;
  padding:14px 16px !important;
}
#sec-gap .gap-suggest h4{
  font-size:12px !important;
  margin-bottom:8px !important;
}
#sec-gap .gap-suggest ul{
  display:grid !important;
  gap:5px !important;
}
#sec-gap .gap-suggest li{
  font-size:11px !important;
  margin-bottom:0 !important;
  line-height:1.45 !important;
}
#sec-gap .gap-content{
  grid-column:2 !important;
  grid-row:1 / span 2 !important;
  display:grid !important;
  grid-template-columns:minmax(0,.74fr) minmax(430px,1.06fr) !important;
  gap:14px !important;
  margin-bottom:0 !important;
  align-items:stretch !important;
}
#sec-gap .gap-left{
  display:flex !important;
}
#sec-gap .gap-right{
  min-height:100% !important;
  padding:16px 14px 14px !important;
  border-radius:28px !important;
  display:flex !important;
  align-items:stretch !important;
  justify-content:center !important;
  position:relative !important;
  overflow:hidden !important;
  background:
    radial-gradient(circle at 50% 42%,rgba(255,252,253,.92),rgba(255,239,245,.7) 34%,transparent 68%),
    radial-gradient(circle at 12% 18%,rgba(250,202,219,.56),transparent 24%),
    radial-gradient(circle at 86% 22%,rgba(255,226,237,.48),transparent 20%),
    radial-gradient(circle at 22% 82%,rgba(255,229,239,.34),transparent 18%),
    linear-gradient(180deg,rgba(255,240,246,.96),rgba(251,230,238,.88) 54%,rgba(248,219,230,.84)) !important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.54),0 24px 44px rgba(211,129,159,.14) !important;
}
#sec-gap .gap-right::before{
  content:"" !important;
  position:absolute !important;
  inset:18px !important;
  border-radius:24px !important;
  border:1px solid rgba(255,255,255,.42) !important;
  pointer-events:none !important;
}
#sec-gap .radar-chart{
  width:100% !important;
  display:flex !important;
  align-items:stretch !important;
}
#sec-gap .category-gaps{
  grid-column:auto !important;
  grid-row:auto !important;
  grid-template-columns:1fr !important;
  gap:10px !important;
}
#sec-repeat{
  grid-template-columns:minmax(0,1.12fr) minmax(320px,.88fr) !important;
  grid-template-rows:repeat(2,minmax(0,1fr)) !important;
}
#sec-repeat > .analysis-card{
  display:flex !important;
  flex-direction:column !important;
  min-height:0 !important;
}
#sec-repeat > .analysis-card:nth-of-type(1){
  grid-column:1 !important;
  grid-row:1 / span 2 !important;
}
#sec-repeat > .analysis-card:nth-of-type(2){
  grid-column:2 !important;
  grid-row:1 !important;
}
#sec-repeat > .analysis-card:nth-of-type(3){
  grid-column:2 !important;
  grid-row:2 !important;
}
#sec-repeat .heatmap{
  flex:1 1 auto !important;
  min-height:0 !important;
  margin:10px 0 8px !important;
  gap:4px !important;
}
#sec-repeat .heatmap-cell{
  border-radius:16px !important;
  overflow:hidden !important;
  transition:transform .26s ease,box-shadow .26s ease !important;
}
#sec-repeat .heatmap-cell:hover{
  transform:translateY(-3px) scale(1.02) !important;
  box-shadow:0 20px 34px rgba(93,67,49,.16) !important;
}
#sec-repeat .heatmap-media{
  border-radius:inherit !important;
}
#sec-repeat .heatmap-overlay{
  backdrop-filter:blur(1.5px) !important;
}
#sec-care{
  grid-template-columns:repeat(3,minmax(0,1fr)) !important;
}
#sec-care > .analysis-card{
  display:flex !important;
  flex-direction:column !important;
  min-height:0 !important;
}
#sec-season{
  grid-template-columns:minmax(280px,.9fr) minmax(360px,1.15fr) minmax(220px,.7fr) !important;
}
#sec-season .season-tabs{
  grid-column:1 / -1 !important;
  display:grid !important;
  grid-template-columns:repeat(4,minmax(0,1fr)) !important;
  gap:8px !important;
  margin-bottom:0 !important;
}
#sec-season .season-tab{
  padding:8px 10px !important;
  min-height:86px !important;
  border-radius:20px !important;
  font-size:10.5px !important;
  box-shadow:0 10px 18px rgba(96,74,58,.05) !important;
}
#sec-season > .analysis-card:nth-of-type(2){
  grid-column:1 !important;
  display:flex !important;
  flex-direction:column !important;
}
#sec-season > .analysis-card:nth-of-type(3){
  grid-column:2 !important;
  display:grid !important;
  grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  gap:8px !important;
  align-content:start !important;
}
#sec-season > .analysis-card:nth-of-type(3) .card-header{
  grid-column:1 / -1 !important;
  margin-bottom:2px !important;
}
#sec-season > .analysis-card:nth-of-type(4){
  grid-column:3 !important;
  display:flex !important;
  flex-direction:column !important;
  justify-content:center !important;
}
#sec-season > .analysis-card:nth-of-type(3) .idle-item{
  margin-bottom:0 !important;
  align-items:flex-start !important;
}
#sec-season > .analysis-card:nth-of-type(3) .action-row{
  flex-wrap:wrap !important;
}
#sec-season > .analysis-card:nth-of-type(3) .action-pill{
  flex:1 1 calc(50% - 3px) !important;
  text-align:center !important;
}
#sec-season > .analysis-card:nth-of-type(3) .idle-days{
  margin-left:auto !important;
  min-width:42px !important;
  text-align:right !important;
}
}
@media (max-width:780px){
.radar-premium-ribbon{
  min-width:144px !important;
  min-height:48px !important;
}
.radar-premium-ribbon span{
  font-size:21px !important;
}
.radar-premium-stage{
  width:min(100%,340px) !important;
  min-height:340px !important;
}
.radar-premium-svg{
  width:min(100%,308px) !important;
}
.radar-premium-label strong{
  font-size:14px !important;
}
.radar-premium-axis-badge{
  width:30px !important;
  height:30px !important;
}
.radar-premium-chip{
  min-height:30px !important;
  font-size:10.5px !important;
}
.analysis-card{padding:16px !important}
.repeat-item,.care-item{
  align-items:flex-start !important;
}
.idle-item{
  flex-direction:column !important;
  align-items:flex-start !important;
}
.action-row{flex-wrap:wrap !important}
.action-pill{
  flex:1 1 calc(50% - 4px) !important;
  text-align:center !important;
}
.idle-days{
  width:100% !important;
  display:flex !important;
  justify-content:flex-end !important;
  gap:8px !important;
  align-items:baseline !important;
}
}
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
@media (max-width:780px){
body{padding-bottom:88px !important}
.hero{
  min-height:auto !important;
  padding:28px 18px 22px !important;
}
.hero h1{font-size:30px !important}
.hero .hero-sub{font-size:12px !important}
.radar-mini{
  width:64px !important;
  height:64px !important;
  top:16px !important;
  right:14px !important;
}
.content{padding:16px !important}
.section-block{
  padding:18px !important;
  border-radius:18px !important;
}
.silhouette-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}
.keyword-cloud{justify-content:flex-start !important}
.keyword{font-size:12px !important}
.kw-primary{
  font-size:13px !important;
  padding:9px 16px !important;
}
.fab{
  width:46px !important;
  height:46px !important;
  right:16px !important;
  bottom:16px !important;
  font-size:20px !important;
}
}
@media (max-width:560px){
.silhouette-grid{grid-template-columns:1fr !important}
.color-chip{width:100% !important}
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
