(function () {
  var apiBase = window.__WENWEN_API_BASE__ || "http://localhost:8000";
  var AUTH_STORAGE_KEY = "ai-wardrobe.auth.session";
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealObserver = null;
  var enhanceTimer = 0;
  var bodyObserver = null;

  function ensureStyle() {
    if (document.getElementById("wenwen-exp-style")) return;
    var style = document.createElement("style");
    style.id = "wenwen-exp-style";
    style.textContent = [
      "html{scroll-behavior:smooth}",
      "html,body{scrollbar-width:thin;scrollbar-color:rgba(192,122,110,.34) rgba(255,255,255,.28)}",
      "body{position:relative;overflow-x:hidden;overscroll-behavior-y:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}",
      "body::-webkit-scrollbar{width:8px;height:8px}",
      "body::-webkit-scrollbar-track{background:rgba(255,251,247,.82)}",
      "body::-webkit-scrollbar-thumb{border-radius:999px;background:linear-gradient(180deg,rgba(192,122,110,.78),rgba(227,174,151,.72));border:2px solid rgba(255,251,247,.92)}",
      "body::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(192,122,110,.92),rgba(227,174,151,.88))}",
      ".wenwen-fx-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}",
      ".wenwen-fx-glow{position:absolute;border-radius:999px;filter:blur(54px);opacity:.68;animation:wenwenFloat 12s ease-in-out infinite alternate;will-change:transform,opacity}",
      ".wenwen-fx-particle{position:absolute;width:var(--size);height:var(--size);border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.96) 0%,rgba(255,214,220,.86) 34%,rgba(244,201,138,.22) 100%);box-shadow:0 0 18px rgba(255,183,196,.32);animation:wenwenParticle var(--duration) linear infinite;animation-delay:var(--delay);opacity:.7}",
      ".wenwen-pointer-glow{position:fixed;left:0;top:0;width:240px;height:240px;border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.42) 0%,rgba(255,209,218,.22) 42%,rgba(244,201,138,.08) 74%,transparent 100%);filter:blur(16px);opacity:.58;transform:translate3d(-999px,-999px,0);transition:opacity .24s ease;will-change:transform}",
      ".wenwen-toast{position:fixed;right:22px;bottom:22px;z-index:9999;min-width:220px;max-width:360px;padding:14px 18px;border-radius:18px;background:rgba(33,24,20,.92);color:#fff;font:500 13px/1.6 'Noto Sans SC',sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.2),0 0 0 1px rgba(255,255,255,.08) inset;transform:translateY(18px);opacity:0;pointer-events:none;transition:transform .3s ease,opacity .3s ease}",
      ".wenwen-toast.show{opacity:1;transform:translateY(0)}",
      ".wenwen-toast.soft{background:linear-gradient(135deg,rgba(192,122,110,.96),rgba(227,174,151,.94))}",
      ".wenwen-form-mask{position:fixed;inset:0;z-index:9998;background:rgba(31,21,16,.28);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:24px}",
      ".wenwen-form-mask.show{display:flex}",
      ".wenwen-form-panel{position:relative;width:min(520px,calc(100vw - 48px));max-height:min(86vh,920px);overflow:auto;background:rgba(255,251,247,.98);border:1px solid rgba(192,122,110,.18);border-radius:30px;padding:24px 24px 20px;box-shadow:0 30px 80px rgba(49,29,20,.18),0 0 0 1px rgba(255,255,255,.38) inset}",
      ".wenwen-form-panel::before{content:'';position:absolute;inset:0 0 auto;height:120px;border-radius:inherit;background:radial-gradient(circle at 12% 20%,rgba(255,210,218,.22),transparent 42%),radial-gradient(circle at 88% 18%,rgba(244,201,138,.18),transparent 38%);pointer-events:none}",
      ".wenwen-form-head{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}",
      ".wenwen-form-title{font:400 24px/1.2 'Noto Serif SC',serif;color:#241814;letter-spacing:.08em}",
      ".wenwen-form-sub{margin-top:6px;font:300 12px/1.7 'Noto Sans SC',sans-serif;color:#9e827a}",
      ".wenwen-form-close{width:38px;height:38px;border:none;border-radius:50%;background:#f8efe9;color:#b37667;font-size:18px;cursor:pointer;transition:transform .24s ease,box-shadow .24s ease,background-color .24s ease}",
      ".wenwen-form-close:hover{transform:translateY(-2px);background:#fff3ed;box-shadow:0 12px 24px rgba(192,122,110,.14)}",
      ".wenwen-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px}",
      ".wenwen-form-field{display:flex;flex-direction:column;gap:6px}",
      ".wenwen-form-field.full{grid-column:1/-1}",
      ".wenwen-form-label{font:400 11px/1 'Noto Sans SC',sans-serif;color:#9b7f75;letter-spacing:.18em;text-transform:uppercase}",
      ".wenwen-form-input,.wenwen-form-select,.wenwen-form-textarea{width:100%;border:1px solid rgba(192,122,110,.16);background:rgba(255,255,255,.92);padding:12px 14px;border-radius:18px;font:300 13px/1.6 'Noto Sans SC',sans-serif;color:#261a16;outline:none;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}",
      ".wenwen-form-textarea{min-height:108px;resize:vertical}",
      ".wenwen-form-input:focus,.wenwen-form-select:focus,.wenwen-form-textarea:focus{border-color:#c07a6e;box-shadow:0 0 0 4px rgba(192,122,110,.08);transform:translateY(-1px)}",
      ".wenwen-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}",
      ".wenwen-form-btn{position:relative;overflow:hidden;border:none;border-radius:16px;padding:12px 18px;cursor:pointer;font:400 13px/1 'Noto Sans SC',sans-serif;letter-spacing:.06em;transition:transform .24s ease,box-shadow .24s ease,background-color .24s ease}",
      ".wenwen-form-btn::after{content:'';position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.55) 50%,transparent 62%);transform:translateX(-130%);transition:transform .72s cubic-bezier(.22,1,.36,1);pointer-events:none}",
      ".wenwen-form-btn:hover::after{transform:translateX(130%)}",
      ".wenwen-form-btn:hover{transform:translateY(-2px)}",
      ".wenwen-form-btn.primary{background:#231712;color:#fff;box-shadow:0 16px 30px rgba(35,23,18,.16)}",
      ".wenwen-form-btn.primary:hover{background:#c07a6e;box-shadow:0 18px 34px rgba(192,122,110,.22)}",
      ".wenwen-form-btn.secondary{background:#f5ece6;color:#7d625a}",
      ".wenwen-form-note{margin-top:10px;font:300 11px/1.7 'Noto Sans SC',sans-serif;color:#ab8b82}",
      ".wenwen-soft-card{position:relative;overflow:hidden;transition:transform .38s cubic-bezier(.22,1,.36,1),box-shadow .38s ease,border-color .32s ease,filter .32s ease;will-change:transform,box-shadow}",
      ".wenwen-soft-card::after{content:'';position:absolute;inset:-1px;border-radius:inherit;background:linear-gradient(118deg,transparent 24%,rgba(255,255,255,.54) 48%,transparent 72%);opacity:0;transform:translateX(-42%);transition:transform .86s cubic-bezier(.22,1,.36,1),opacity .34s ease;pointer-events:none}",
      ".wenwen-soft-card:hover{transform:translateY(-6px);box-shadow:0 28px 58px rgba(190,123,111,.14),0 0 0 1px rgba(255,255,255,.34) inset;filter:saturate(1.02)}",
      ".wenwen-soft-card:hover::after{opacity:.92;transform:translateX(42%)}",
      ".wenwen-soft-button{position:relative;overflow:hidden;isolation:isolate;transition:transform .26s ease,box-shadow .26s ease,border-color .26s ease,filter .26s ease;will-change:transform}",
      ".wenwen-soft-button::before{content:'';position:absolute;inset:-24%;z-index:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.56) 50%,transparent 60%);transform:translateX(-135%);transition:transform .78s cubic-bezier(.22,1,.36,1);pointer-events:none}",
      ".wenwen-soft-button:hover::before{transform:translateX(135%)}",
      ".wenwen-soft-button:hover{transform:translateY(-2px);box-shadow:0 16px 30px rgba(190,123,111,.12)}",
      ".wenwen-soft-button > *{position:relative;z-index:1}",
      ".wenwen-ripple{position:absolute;border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.7),rgba(255,221,227,.3) 42%,transparent 72%);transform:scale(0);opacity:.8;pointer-events:none;animation:wenwenRipple .68s cubic-bezier(.22,1,.36,1) forwards}",
      ".wenwen-reveal{opacity:0;transform:translateY(22px) scale(.985);transition:opacity .74s cubic-bezier(.22,1,.36,1),transform .74s cubic-bezier(.22,1,.36,1)}",
      ".wenwen-reveal.wenwen-in-view{opacity:1;transform:translateY(0) scale(1)}",
      ".wenwen-soft-link{transition:color .24s ease,text-shadow .24s ease}",
      ".wenwen-soft-link:hover{color:#c07a6e;text-shadow:0 0 18px rgba(192,122,110,.18)}",
      "@keyframes wenwenRipple{0%{transform:scale(0);opacity:.82}100%{transform:scale(1);opacity:0}}",
      "@keyframes wenwenFloat{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(0,-16px,0) scale(1.05)}}",
      "@keyframes wenwenParticle{0%{transform:translate3d(0,0,0) scale(.8);opacity:0}10%{opacity:.7}50%{opacity:.95}100%{transform:translate3d(var(--drift),-120px,0) scale(1.1);opacity:0}}",
      "@media (prefers-reduced-motion:reduce){.wenwen-fx-glow,.wenwen-fx-particle,.wenwen-soft-card,.wenwen-soft-button,.wenwen-reveal,.wenwen-form-btn{animation:none!important;transition:none!important}.wenwen-pointer-glow{display:none}}",
      "@media (max-width:720px){.wenwen-form-grid{grid-template-columns:1fr}.wenwen-form-panel{padding:18px 18px 16px}.wenwen-form-title{font-size:20px}.wenwen-toast{left:16px;right:16px;bottom:16px;max-width:none}.wenwen-pointer-glow{display:none}}"
    ].join("");
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message, tone) {
    ensureStyle();
    var node = document.getElementById("wenwen-global-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "wenwen-global-toast";
      node.className = "wenwen-toast";
      document.body.appendChild(node);
    }
    node.className = "wenwen-toast" + (tone === "soft" ? " soft" : "");
    node.textContent = message;
    requestAnimationFrame(function () {
      node.classList.add("show");
    });
    clearTimeout(node._timer);
    node._timer = setTimeout(function () {
      node.classList.remove("show");
    }, 2600);
  }

  function parseList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || "")
      .split(/[,\n，]/)
      .map(function (entry) { return entry.trim(); })
      .filter(Boolean);
  }

  function readSessionFromStorage(storage) {
    try {
      if (!storage) return null;
      var raw = storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.access_token ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function readStoredSession() {
    var scopes = [window];
    try {
      if (window.parent && scopes.indexOf(window.parent) < 0) scopes.push(window.parent);
    } catch (error) {}
    try {
      if (window.top && scopes.indexOf(window.top) < 0) scopes.push(window.top);
    } catch (error) {}

    for (var index = 0; index < scopes.length; index += 1) {
      try {
        var session = readSessionFromStorage(scopes[index].localStorage);
        if (session && session.access_token) return session;
      } catch (error) {}
    }

    return null;
  }

  function getAccessToken() {
    var session = readStoredSession();
    return session && session.access_token ? session.access_token : null;
  }

  function buildAuthHeaders(headers, includeJsonContentType) {
    var nextHeaders = Object.assign({}, headers || {});
    var accessToken = getAccessToken();

    if (includeJsonContentType !== false && !nextHeaders["Content-Type"] && !nextHeaders["content-type"]) {
      nextHeaders["Content-Type"] = "application/json";
    }

    if (accessToken && !nextHeaders.Authorization && !nextHeaders.authorization) {
      nextHeaders.Authorization = "Bearer " + accessToken;
    }

    return nextHeaders;
  }

  function normalizeRequestError(error) {
    var message = error && error.message ? String(error.message) : "";
    if (error && error.name === "AbortError") {
      return new Error("请求已中断，请再试一次");
    }
    if (/failed to fetch/i.test(message) || /networkerror/i.test(message) || /load failed/i.test(message)) {
      return new Error("后端接口暂时无法连接，请确认 Python 接口服务已经启动");
    }
    return error instanceof Error ? error : new Error(message || "请求失败");
  }

  function silhouetteSvg(kind, stroke, extraClass) {
    var content = "";
    if (kind === "dress") {
      content = '<path d="M20 5C20 5 10 15 10 30L10 75h40V30C50 15 40 5 40 5L30 12Z"/>';
    } else if (kind === "skirt") {
      content = '<path d="M10 5v70h40V5L30 15Z"/>';
    } else if (kind === "coat") {
      content = '<rect x="8" y="5" width="44" height="70" rx="4"/>';
    } else if (kind === "shoe") {
      content = '<path d="M6 55c3 0 9-4 14-4 4 0 7 5 16 5 6 0 10-3 10-7H6z"/><path d="M12 28c0 14 4 22 10 24"/>';
    } else if (kind === "bag") {
      content = '<rect x="12" y="20" width="36" height="42" rx="5"/><path d="M22 20c0-8 5-13 8-13s8 5 8 13"/>';
    } else {
      content = '<path d="M15 5L5 20l10-2v57h30V18l10 2L45 5c-5 5-10 7-15 7S20 10 15 5Z"/>';
    }
    return '<svg class="' + (extraClass || "") + '" viewBox="0 0 60 80" fill="none" stroke="' + (stroke || "rgba(192,100,88,.5)") + '" stroke-width="1.5">' + content + "</svg>";
  }

  function request(path, options) {
    var requestOptions = Object.assign({
      credentials: "include"
    }, options || {});
    var isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
    requestOptions.headers = buildAuthHeaders(options && options.headers, !isFormData);

    return fetch(apiBase + path, requestOptions).catch(function (error) {
      throw normalizeRequestError(error);
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (error) {
          data = { message: text || "请求失败" };
        }
        if (!response.ok) {
          throw new Error(data.detail || data.message || "请求失败");
        }
        return data;
      });
    });
  }

  function createFxLayer() {
    ensureStyle();
    if (!document.body || document.getElementById("wenwen-fx-layer")) return;
    var layer = document.createElement("div");
    layer.id = "wenwen-fx-layer";
    layer.className = "wenwen-fx-layer";

    var glows = [
      { left: "-5%", top: "12%", width: 340, height: 260, color: "rgba(255,190,202,.26)", delay: "0s" },
      { left: "38%", top: "22%", width: 280, height: 240, color: "rgba(244,201,138,.18)", delay: "1.3s" },
      { left: "70%", top: "68%", width: 320, height: 250, color: "rgba(255,212,219,.22)", delay: "2.4s" }
    ];

    var particles = [
      { left: "12%", top: "20%", size: 9, drift: "14px", duration: "9.8s", delay: "-1.4s" },
      { left: "18%", top: "62%", size: 7, drift: "-18px", duration: "10.6s", delay: "-3.2s" },
      { left: "34%", top: "28%", size: 10, drift: "20px", duration: "11.2s", delay: "-2s" },
      { left: "48%", top: "76%", size: 8, drift: "-14px", duration: "9.4s", delay: "-5.1s" },
      { left: "60%", top: "18%", size: 11, drift: "12px", duration: "10.8s", delay: "-1s" },
      { left: "72%", top: "54%", size: 8, drift: "-10px", duration: "9.2s", delay: "-4.3s" },
      { left: "84%", top: "24%", size: 7, drift: "16px", duration: "10.2s", delay: "-2.5s" },
      { left: "90%", top: "72%", size: 10, drift: "-12px", duration: "11.6s", delay: "-6.1s" }
    ];

    layer.innerHTML =
      glows.map(function (glow) {
        return '<div class="wenwen-fx-glow" style="left:' + glow.left + ";top:" + glow.top + ";width:" + glow.width + "px;height:" + glow.height + "px;background:" + glow.color + ";animation-delay:" + glow.delay + '"></div>';
      }).join("") +
      particles.map(function (particle) {
        return '<span class="wenwen-fx-particle" style="left:' + particle.left + ";top:" + particle.top + ";--size:" + particle.size + "px;--drift:" + particle.drift + ";--duration:" + particle.duration + ";--delay:" + particle.delay + '"></span>';
      }).join("") +
      '<div class="wenwen-pointer-glow"></div>';

    document.body.insertBefore(layer, document.body.firstChild || null);

    Array.prototype.slice.call(document.body.children).forEach(function (child) {
      if (child === layer || child.id === "wenwen-global-toast" || child.classList.contains("wenwen-form-mask")) return;
      var computed = window.getComputedStyle(child);
      if (computed.position === "static") {
        child.style.position = "relative";
      }
      if (!child.style.zIndex) {
        child.style.zIndex = "1";
      }
    });

    if (reducedMotion) {
      layer.querySelector(".wenwen-pointer-glow").style.display = "none";
      return;
    }

    var pointer = layer.querySelector(".wenwen-pointer-glow");
    pointer.style.transform = "translate3d(" + (window.innerWidth * 0.52 - 120) + "px," + (window.innerHeight * 0.24 - 120) + "px,0)";

    window.addEventListener("pointermove", function (event) {
      pointer.style.transform = "translate3d(" + (event.clientX - 120) + "px," + (event.clientY - 120) + "px,0)";
    }, { passive: true });
  }

  function getRevealObserver() {
    if (revealObserver) return revealObserver;
    if (reducedMotion || !window.IntersectionObserver) {
      revealObserver = {
        observe: function (node) { node.classList.add("wenwen-in-view"); },
        unobserve: function () {}
      };
      return revealObserver;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("wenwen-in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: "0px 0px -48px 0px"
    });
    return revealObserver;
  }

  function addRipple(node, event) {
    if (reducedMotion) return;
    var rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var size = Math.max(rect.width, rect.height) * 0.94;
    var ripple = document.createElement("span");
    ripple.className = "wenwen-ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = (event.clientX - rect.left - size / 2) + "px";
    ripple.style.top = (event.clientY - rect.top - size / 2) + "px";
    node.appendChild(ripple);
    setTimeout(function () {
      ripple.remove();
    }, 700);
  }

  function markReveal(node) {
    if (!node || node.dataset.wenwenReveal) return;
    node.dataset.wenwenReveal = "1";
    node.classList.add("wenwen-reveal");
    getRevealObserver().observe(node);
  }

  function decorateButton(node) {
    if (!node || node.dataset.wenwenButton) return;
    node.dataset.wenwenButton = "1";
    node.classList.add("wenwen-soft-button");
    node.addEventListener("pointerdown", function (event) {
      if (node.disabled || node.getAttribute("aria-disabled") === "true") return;
      addRipple(node, event);
    });
  }

  function decorateCard(node) {
    if (!node || node.dataset.wenwenCard) return;
    node.dataset.wenwenCard = "1";
    node.classList.add("wenwen-soft-card");
  }

  function decorateLink(node) {
    if (!node || node.dataset.wenwenLink) return;
    node.dataset.wenwenLink = "1";
    node.classList.add("wenwen-soft-link");
  }

  function enhanceDocument(root) {
    root = root || document;
    createFxLayer();

    var buttonSelector = [
      "button",
      ".btn",
      ".ia",
      ".bba",
      ".bb",
      ".mode-btn",
      ".tab-btn",
      ".edit-btn",
      ".generate-btn",
      ".care-action",
      ".fab",
      ".hang-tag",
      ".feat-row",
      ".pa",
      ".urlgo",
      ".pg",
      ".vtb",
      ".fpp",
      ".sbi",
      ".sbc",
      ".season-tab",
      ".fpill",
      ".mb-main",
      ".mb-sub",
      ".tesave",
      ".tecancel",
      ".teadd",
      ".panel-close",
      ".month-nav button",
      ".day-cell",
      ".color-chip",
      ".rule-item",
      ".silhouette-card",
      ".action-pill",
      ".nav-link",
      ".reg"
    ].join(",");

    var cardSelector = [
      ".analysis-card",
      ".section-block",
      ".ipc",
      ".enc",
      ".pr-item",
      ".svc-item",
      ".stc",
      ".pipe-item",
      ".ic",
      ".cat-gap",
      ".repeat-item",
      ".care-item",
      ".idle-item",
      ".top-bar",
      ".stats-bar",
      ".stat-chip",
      ".trip-setup",
      ".suitcase-visual",
      ".calendar-section",
      ".suitcase-section",
      ".suitcase-item",
      ".day-plan-card",
      ".color-chip",
      ".silhouette-card",
      ".rule-item",
      ".keyword",
      ".outfit-item",
      ".day-cell.has-outfit",
      ".outfit-panel",
      ".modal",
      ".modal-card",
      ".hang-tag",
      ".feat-row",
      ".stage",
      ".phone",
      ".sbi",
      ".feat-item",
      ".outfitCard",
      ".socialProof",
      ".lastLook",
      ".brandQuote"
    ].join(",");

    var revealSelector = [
      ".analysis-card",
      ".section-block",
      ".ipc",
      ".enc",
      ".pr-item",
      ".svc-item",
      ".stc",
      ".pipe-item",
      ".ic",
      ".cat-gap",
      ".repeat-item",
      ".care-item",
      ".idle-item",
      ".top-bar",
      ".stats-bar",
      ".stat-chip",
      ".trip-setup",
      ".suitcase-visual",
      ".calendar-section",
      ".suitcase-section",
      ".suitcase-item",
      ".day-plan-card",
      ".color-chip",
      ".silhouette-card",
      ".rule-item",
      ".outfit-item",
      ".feat-row",
      ".feat-item",
      ".outfitCard",
      ".socialProof",
      ".brandQuote",
      ".lastLook",
      ".gap-suggest"
    ].join(",");

    root.querySelectorAll(buttonSelector).forEach(decorateButton);
    root.querySelectorAll(cardSelector).forEach(decorateCard);
    root.querySelectorAll("a[href]").forEach(decorateLink);
    root.querySelectorAll(revealSelector).forEach(markReveal);
  }

  function scheduleEnhance() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(function () {
      enhanceDocument(document);
    }, 40);
  }

  function navigateTop(href) {
    try {
      var next = new URL(href, window.location.href).toString();
      if (window.top && window.top !== window) {
        window.top.location.href = next;
      } else {
        window.location.href = next;
      }
    } catch (error) {
      if (window.top && window.top !== window) {
        window.top.location.href = href;
      } else {
        window.location.href = href;
      }
    }
  }

  function bindNavigationGuards() {
    if (document.documentElement.dataset.wenwenNavBound) return;
    document.documentElement.dataset.wenwenNavBound = "1";

    document.addEventListener("click", function (event) {
      var anchor = event.target.closest("a[href]");
      if (anchor) {
        var href = anchor.getAttribute("href");
        if (
          href &&
          href.charAt(0) !== "#" &&
          !/^javascript:/i.test(href) &&
          !anchor.hasAttribute("download") &&
          href.indexOf("mailto:") !== 0 &&
          href.indexOf("tel:") !== 0 &&
          anchor.target !== "_blank"
        ) {
          if (/^https?:/i.test(href) || href.charAt(0) === "/") {
            event.preventDefault();
            navigateTop(href);
            return;
          }
        }
      }

      var hangTag = event.target.closest(".hang-tag");
      if (hangTag) {
        var label = (hangTag.textContent || "").replace(/\s+/g, "");
        if (label.indexOf("AI智能识别") >= 0) {
          event.preventDefault();
          navigateTop("/smart-wardrobe");
          return;
        }
        if (label.indexOf("穿搭历史") >= 0) {
          event.preventDefault();
          navigateTop("/outfit-diary");
          return;
        }
      }
    }, true);
  }

  function bindGlobalFeedback() {
    if (document.documentElement.dataset.wenwenGlobalBound) return;
    document.documentElement.dataset.wenwenGlobalBound = "1";

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".wenwen-form-mask.show,.modal-bg.show,.overlay.show").forEach(function (node) {
        node.classList.remove("show");
      });
      var editor = document.getElementById("te");
      if (editor) editor.classList.remove("show");
    });
  }

  function openFormModal(config) {
    ensureStyle();
    return new Promise(function (resolve) {
      var mask = document.createElement("div");
      mask.className = "wenwen-form-mask";
      var fields = config.fields || [];
      var fieldHtml = fields.map(function (field) {
        var type = field.type || "text";
        var cls = "wenwen-form-field" + (field.full ? " full" : "");
        var value = field.value == null ? "" : field.value;
        var control = "";
        if (type === "textarea") {
          control = '<textarea class="wenwen-form-textarea" data-field="' + field.name + '" placeholder="' + escapeHtml(field.placeholder || "") + '">' + escapeHtml(value) + "</textarea>";
        } else if (type === "select") {
          control = '<select class="wenwen-form-select" data-field="' + field.name + '">' +
            (field.options || []).map(function (option) {
              var selected = String(option.value) === String(value) ? ' selected' : "";
              return '<option value="' + escapeHtml(option.value) + '"' + selected + ">" + escapeHtml(option.label) + "</option>";
            }).join("") + "</select>";
        } else {
          control = '<input class="wenwen-form-input" data-field="' + field.name + '" type="' + escapeHtml(type) + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(field.placeholder || "") + '"/>';
        }
        return '<div class="' + cls + '"><label class="wenwen-form-label">' + escapeHtml(field.label || field.name) + "</label>" + control + "</div>";
      }).join("");

      mask.innerHTML =
        '<div class="wenwen-form-panel">' +
          '<div class="wenwen-form-head">' +
            '<div><div class="wenwen-form-title">' + escapeHtml(config.title || "编辑") + '</div>' +
            (config.description ? '<div class="wenwen-form-sub">' + escapeHtml(config.description) + "</div>" : "") +
            "</div>" +
            '<button class="wenwen-form-close" type="button">×</button>' +
          "</div>" +
          '<div class="wenwen-form-grid">' + fieldHtml + "</div>" +
          (config.note ? '<div class="wenwen-form-note">' + escapeHtml(config.note) + "</div>" : "") +
          '<div class="wenwen-form-actions">' +
            '<button class="wenwen-form-btn secondary" type="button" data-action="cancel">' + escapeHtml(config.cancelLabel || "取消") + "</button>" +
            '<button class="wenwen-form-btn primary" type="button" data-action="submit">' + escapeHtml(config.submitLabel || "保存") + "</button>" +
          "</div>" +
        "</div>";
      document.body.appendChild(mask);
      requestAnimationFrame(function () {
        mask.classList.add("show");
      });

      var firstInput = mask.querySelector(".wenwen-form-input,.wenwen-form-select,.wenwen-form-textarea");
      if (firstInput) {
        setTimeout(function () {
          firstInput.focus();
        }, 90);
      }

      function close(result) {
        mask.classList.remove("show");
        setTimeout(function () {
          mask.remove();
          resolve(result);
        }, 180);
      }

      mask.addEventListener("click", function (event) {
        if (event.target === mask || event.target.getAttribute("data-action") === "cancel" || event.target.classList.contains("wenwen-form-close")) {
          close(null);
        }
      });

      mask.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
          event.preventDefault();
          submitButton.click();
        }
      });

      var submitButton = mask.querySelector('[data-action="submit"]');
      submitButton.addEventListener("click", function () {
        var values = {};
        fields.forEach(function (field) {
          var input = mask.querySelector('[data-field="' + field.name + '"]');
          values[field.name] = input ? input.value : "";
        });
        close(values);
      });
    });
  }

  function bootstrap() {
    ensureStyle();
    createFxLayer();
    bindNavigationGuards();
    bindGlobalFeedback();
    scheduleEnhance();

    if (!bodyObserver && document.body) {
      bodyObserver = new MutationObserver(function () {
        scheduleEnhance();
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }

  window.addEventListener("load", scheduleEnhance, { once: true });

  window.WenwenExperience = {
    apiBase: apiBase,
    request: request,
    toast: toast,
    escapeHtml: escapeHtml,
    parseList: parseList,
    getAccessToken: getAccessToken,
    buildAuthHeaders: buildAuthHeaders,
    silhouetteSvg: silhouetteSvg,
    openFormModal: openFormModal,
    navigateTop: navigateTop,
    refreshEnhancements: scheduleEnhance
  };
})();
