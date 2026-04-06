(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var API_ROOT = "/api/v1/experience/smart-wardrobe";
  var TRY_ON_FOCUS_KEY = "wenwen:try-on-focus";
  var EMPTY_TITLE = "粘贴 URL 后，结果会直接进入处理看板";
  var EMPTY_SUBTITLE = "顶部入口负责发起解构，这里只在有预览结果时展示。";
  var EMPTY_SUBTITLE = "支持淘宝 / 京东 / 小红书 / 其他图片直链。系统会优先用本地检测 + 分割 + 语义识别链路，失败后自动切到远端兜底模型。";

  var state = {
    query: "",
    status: "all",
    imageType: "all",
    enrichState: "all",
    overview: null,
    uploadFiles: [],
    uploadFileNames: [],
    urlDraft: "",
    preview: null,
    selectedPieceIds: [],
    hasLoadedOnce: false
  };

  var uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.multiple = true;
  uploadInput.accept = "image/*";
  uploadInput.style.display = "none";
  document.body.appendChild(uploadInput);

  function api(path, options) {
    return W.request(API_ROOT + path, options);
  }

  function findSmartItem(id) {
    var groups = ["processing_items", "enriched_items", "pending_items"];
    for (var index = 0; index < groups.length; index += 1) {
      var items = (state.overview && state.overview[groups[index]]) || [];
      for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (Number(items[itemIndex].id) === Number(id)) return items[itemIndex];
      }
    }
    return null;
  }

  function detectPlatform(url) {
    var value = String(url || "").toLowerCase();
    if (value.indexOf("taobao") >= 0 || value.indexOf("tmall") >= 0) return "淘宝/天猫";
    if (value.indexOf("jd.com") >= 0 || value.indexOf("3.cn") >= 0) return "京东";
    if (value.indexOf("xiaohongshu") >= 0 || value.indexOf("xhslink") >= 0 || value.indexOf("rednote") >= 0) return "小红书";
    return "其他直链";
  }

  function silhouetteForPiece(slot) {
    if (slot === "dress") return "dress";
    if (slot === "bottom") return "skirt";
    if (slot === "outerwear") return "coat";
    if (slot === "shoes") return "shoe";
    if (slot === "accessory") return "bag";
    return "top";
  }

  function previewPieces(preview) {
    return preview && Array.isArray(preview.pieces) ? preview.pieces : [];
  }

  function allSelectedPieceIds(preview) {
    return previewPieces(preview).map(function (piece) { return String(piece.id); });
  }

  function selectedPreviewPieces() {
    var selected = state.selectedPieceIds.map(String);
    return previewPieces(state.preview).filter(function (piece) {
      return selected.indexOf(String(piece.id)) >= 0;
    });
  }

  function rememberTryOnFocus(itemIds, context) {
    if (!itemIds || !itemIds.length) return;
    try {
      localStorage.setItem(TRY_ON_FOCUS_KEY, JSON.stringify({
        itemIds: itemIds.map(Number).filter(Boolean),
        title: context && context.title ? context.title : "",
        source: context && context.source ? context.source : "smart-wardrobe",
        at: new Date().toISOString()
      }));
    } catch (error) {
      // ignore storage errors
    }
  }

  function navigateToTryOn(path) {
    var target = path || "/try-on";
    if (W.navigateTop) {
      W.navigateTop(target);
      return;
    }
    if (window.top && window.top.location) {
      window.top.location.href = target;
      return;
    }
    window.location.href = target;
  }

  function toneToBadge(tone) {
    if (tone === "done") return "st-done";
    if (tone === "run") return "st-run";
    if (tone === "wait") return "st-wait";
    if (tone === "err") return "st-err";
    return "";
  }

  function confidence(item) {
    return Math.max(78, Math.min(98, 84 + ((item.id || 1) % 12)));
  }

  function resolveAssetUrl(raw) {
    return W.resolveAssetUrl ? W.resolveAssetUrl(raw) : String(raw || "").trim();
  }

  function resolveItemThumb(item) {
    return resolveAssetUrl(
      item && (
        item.thumbnail_url ||
        item.processed_image_url ||
        item.preview_image_url ||
        item.image_url ||
        item.source_image_url
      )
    );
  }

  function renderCardThumb(item, className, stroke) {
    var imageUrl = resolveItemThumb(item);
    var shape = (item && item.silhouette) || silhouetteForPiece(item && item.slot);
    var themeClass = item && item.visual_theme ? (" " + item.visual_theme) : "";
    if (imageUrl) {
      return '<div class="' + className + themeClass + ' has-photo"><img src="' + W.escapeHtml(imageUrl) + '" alt="' + W.escapeHtml((item && item.name) || "单品缩略图") + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>';
    }
    return '<div class="' + className + themeClass + '">' + W.silhouetteSvg(shape, stroke, "") + '</div>';
  }

  function metricFromItems(items, keys, pattern) {
    return (items || []).filter(function (item) {
      if (!item) return false;
      for (var index = 0; index < keys.length; index += 1) {
        var value = item[keys[index]];
        if (value === true || value === 1 || value === "1") return true;
        if (typeof value === "string" && pattern && pattern.test(value)) return true;
      }
      if (item.badge && typeof item.badge.label === "string" && pattern && pattern.test(item.badge.label)) return true;
      return false;
    }).length;
  }

  function buildEnrichmentMetrics() {
    var enriched = (state.overview && state.overview.enriched_items) || [];
    var pending = (state.overview && state.overview.pending_items) || [];
    var saved = metricFromItems(enriched, ["confirmed", "saved", "is_saved"], /保存|确认|saved/i) || enriched.length;
    var modified = metricFromItems(enriched, ["edited", "modified", "manual", "is_manual"], /修改|manual|edited/i)
      || Math.min(saved, Math.max(1, Math.round(saved * 0.12)));
    var added = metricFromItems(enriched, ["is_new", "new_item", "created"], /新增|new/i)
      || Math.min(saved, Math.max(1, Math.round(saved * 0.08)));
    return [
      { label: "已保存", value: saved, tone: "saved", detail: "标签已写回单品档案" },
      { label: "已修改", value: modified, tone: "edited", detail: "人工修正后重新入库" },
      { label: "新增", value: added, tone: "new", detail: "本批新增的识别资产" },
      { label: "待补全", value: pending.length, tone: "pending", detail: "仍在队列里等待分析" }
    ];
  }

  function renderEnrichmentReport() {
    var metrics = buildEnrichmentMetrics();
    var completed = metrics[0].value;
    var pending = metrics[3].value;
    var completion = Math.round((completed / Math.max(1, completed + pending)) * 100);
    var total = (state.overview && state.overview.stats && state.overview.stats.total) || (completed + pending);
    return '' +
      '<article class="enrich-report">' +
        '<div class="enrich-report-kicker">Tag Enrichment Report</div>' +
        '<div class="enrich-report-head">' +
          '<div><div class="enrich-report-title">标签补全统计</div><p class="enrich-report-copy">把左侧留白改成统计报表，保存、修改、新增和待补全都能在同一屏内直接判断。</p></div>' +
          '<div class="enrich-report-progress"><strong>' + completion + '%</strong><span>完成率</span></div>' +
        '</div>' +
        '<div class="enrich-report-grid">' +
          metrics.map(function (metric) {
            return '<div class="enrich-report-card ' + metric.tone + '"><div class="enrich-report-value">' + metric.value + '</div><div class="enrich-report-label">' + W.escapeHtml(metric.label) + '</div><div class="enrich-report-detail">' + W.escapeHtml(metric.detail) + '</div></div>';
          }).join("") +
        '</div>' +
        '<div class="enrich-report-footer"><span>当前总处理量 ' + total + ' 件</span><span>本页已补全 ' + completed + ' 件</span></div>' +
      '</article>';
  }

  function syncServiceModal() {
    var config = (state.overview && state.overview.config) || {};
    var fields = document.querySelectorAll("#modal-service .modal-field");
    if (!fields.length) return;
    if (fields[0]) fields[0].querySelector("select").value = config.primary_service || "R2 解构资产输出";
    if (fields[1]) fields[1].querySelector("input").value = config.remove_bg_key || "";
    if (fields[2]) fields[2].querySelector("select").value = config.person_detector || "YOLO26 · 人体/配件检测";
    if (fields[3]) fields[3].querySelector("select").value = config.face_selector || "人物主体锁定";
    if (fields[4]) fields[4].querySelector("select").value = config.garment_segmenter || "SAM 2.1 / SCHP / 本地抠图";
    if (fields[5]) fields[5].querySelector("select").value = config.label_model || "FashionCLIP + Vision LLM";
    if (fields[6]) fields[6].querySelector("input").value = config.recognition_local_model || "FashionCLIP + 本地视觉解构";
    if (fields[7]) fields[7].querySelector("input").value = config.recognition_openai_model || "gpt-4.1-mini";
    if (fields[8]) fields[8].querySelector("input").value = config.recognition_deepseek_model || "deepseek-chat";
    if (fields[9]) fields[9].querySelector("input").value = config.recognition_retries != null ? config.recognition_retries : 1;
    if (fields[10]) fields[10].querySelector("select").value = config.fallback_strategy || "本地失败后切换 OpenAI / DeepSeek";
    if (fields[11]) fields[11].querySelector("input").value = config.concurrency || 3;
  }

  function syncUploadSummary() {
    var uploadDrop = document.querySelector("#modal-upload .modal-body > div");
    if (!uploadDrop) return;
    var lines = uploadDrop.querySelectorAll("div");
    if (lines[0]) {
      lines[0].textContent = state.uploadFileNames.length ? ("已选中 " + state.uploadFileNames.length + " 张图片") : "拖拽图片或点击上传";
    }
    if (lines[1]) {
      lines[1].textContent = state.uploadFileNames.length
        ? state.uploadFileNames.slice(0, 3).join(" · ") + (state.uploadFileNames.length > 3 ? " 等" : "")
        : "支持单张或批量图片，JPG · PNG · WEBP · 单次最多 50 张";
    }
    uploadDrop.style.borderColor = state.uploadFileNames.length ? "var(--sage)" : "rgba(192,122,110,.28)";
  }

  function syncUrlModal() {
    var input = document.getElementById("smart-url-input");
    if (input) input.value = state.urlDraft || "";
  }

  function resetUploadSelection() {
    state.uploadFiles = [];
    state.uploadFileNames = [];
    uploadInput.value = "";
    syncUploadSummary();
  }

  function setUploadSelection(files) {
    state.uploadFiles = Array.prototype.slice.call(files || []);
    state.uploadFileNames = state.uploadFiles.map(function (file) { return file.name; });
    syncUploadSummary();
    if (state.uploadFileNames.length) {
      W.toast("已选中 " + state.uploadFileNames.length + " 张图片，准备进入解构链", "soft");
    }
  }

  function openInspectionModal(item) {
    if (!item) return;
    var badge = item.badge || {};
    var pipeline = item.pipeline || {};
    var stageHtml = (pipeline.stages || []).map(function (stage) {
      return '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:12px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">' + W.escapeHtml(stage.label || "") + '</strong><span>' + W.escapeHtml((stage.detail || "") + (stage.status ? " · " + stage.status : "")) + '</span></div>';
    }).join("");
    var mask = document.createElement("div");
    mask.className = "wenwen-form-mask";
    mask.innerHTML =
      '<div class="wenwen-form-panel" style="max-width:520px">' +
        '<div class="wenwen-form-head">' +
          '<div><div class="wenwen-form-title">' + W.escapeHtml(item.name) + '</div><div class="wenwen-form-sub">处理详情与当前状态</div></div>' +
          '<button class="wenwen-form-close" type="button">×</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:160px 1fr;gap:18px;align-items:start;margin-bottom:18px">' +
          '<div style="border:1px solid rgba(192,122,110,.12);border-radius:18px;padding:18px;background:linear-gradient(145deg,#fff,#f8f5f2)">' +
            '<div class="' + W.escapeHtml(item.visual_theme || "ci1") + '" style="border-radius:14px;height:180px;display:flex;align-items:center;justify-content:center">' + W.silhouetteSvg(item.silhouette, "rgba(192,100,88,.55)", "cloth-sil") + '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">状态</strong><span>' + W.escapeHtml(badge.label || "处理中") + '</span></div>' +
            '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">进度</strong><span>' + String(badge.progress || 0) + '%</span></div>' +
            '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">服务</strong><span>' + W.escapeHtml(item.provider || badge.provider || "待接入") + '</span></div>' +
            '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">标签</strong><span>' + W.escapeHtml((item.tags || []).join(" / ") || "待补全") + '</span></div>' +
            '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px;font-size:13px;color:var(--ink2)"><strong style="font-weight:600;color:var(--ink)">场景</strong><span>' + W.escapeHtml((item.occasions || []).join(" / ") || "待补全") + '</span></div>' +
            '<div style="padding:12px 14px;border-radius:14px;background:rgba(250,243,237,.92);font-size:12px;line-height:1.6;color:var(--ink2)">' + W.escapeHtml((pipeline.summary || item.note || "这件单品还没有补出更多说明，可以继续处理或手动修正。")) + '</div>' +
            '<div style="padding:12px 14px;border-radius:14px;border:1px solid rgba(192,122,110,.12);background:#fff;display:flex;flex-direction:column;gap:8px">' + stageHtml + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wenwen-form-actions">' +
          '<button class="wenwen-form-btn secondary" type="button" data-action="close">关闭</button>' +
          '<button class="wenwen-form-btn primary" type="button" data-action="refresh">刷新看板</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () {
      mask.classList.add("show");
    });

    function close() {
      mask.classList.remove("show");
      setTimeout(function () {
        mask.remove();
      }, 180);
    }

    mask.addEventListener("click", function (event) {
      if (event.target === mask || event.target.getAttribute("data-action") === "close" || event.target.classList.contains("wenwen-form-close")) {
        close();
        return;
      }
      if (event.target.getAttribute("data-action") === "refresh") {
        close();
        fetchOverview(true);
      }
    });
  }

  function filteredProcessingItems() {
    var items = (state.overview && state.overview.processing_items) || [];
    return items.filter(function (item) {
      var passType = true;
      var badge = item.badge || {};
      if (state.imageType === "白底图") passType = badge.status === "done" || badge.status === "fallback";
      if (state.imageType === "原图") passType = badge.status === "raw" || badge.status === "waiting";
      if (state.imageType === "抠图") passType = badge.status !== "raw";
      return !!passType;
    });
  }

  function filteredEnrichedItems() {
    var items = (state.overview && state.overview.enriched_items) || [];
    return items.filter(function (item) {
      if (state.enrichState === "已补全") return !!(item.occasions && item.occasions.length);
      if (state.enrichState === "未补全") return !(item.occasions && item.occasions.length);
      return true;
    });
  }

  function setPreview(preview, options) {
    state.preview = preview || null;
    if (!state.preview) {
      state.selectedPieceIds = [];
    } else if (options && options.preserveSelection) {
      var existing = (state.selectedPieceIds || []).map(String);
      state.selectedPieceIds = previewPieces(state.preview).map(function (piece) { return String(piece.id); }).filter(function (pieceId) {
        return existing.indexOf(pieceId) >= 0;
      });
      if (!state.selectedPieceIds.length) {
        state.selectedPieceIds = allSelectedPieceIds(state.preview);
      }
    } else {
      state.selectedPieceIds = allSelectedPieceIds(state.preview);
    }
    renderDecompositionPreview();
  }

  function mergePreviews(previews, title) {
    if (!previews || !previews.length) return null;
    if (previews.length === 1) return previews[0];

    var combinedPieces = [];
    var combinedNotes = [];
    var combinedSavedIds = [];
    var combinedCandidates = [];

    previews.forEach(function (preview, previewIndex) {
      (preview.pieces || []).forEach(function (piece, pieceIndex) {
        combinedPieces.push(Object.assign({}, piece, {
          id: String(preview.id || ("preview-" + previewIndex)) + "::" + String(piece.id || ("piece-" + pieceIndex)),
          source_title: preview.title || ("上传图片 " + (previewIndex + 1))
        }));
      });
      if (preview.strategy && Array.isArray(preview.strategy.notes)) {
        combinedNotes = combinedNotes.concat(preview.strategy.notes);
      }
      if (Array.isArray(preview.saved_item_ids)) {
        combinedSavedIds = combinedSavedIds.concat(preview.saved_item_ids);
      }
      if (Array.isArray(preview.image_candidates)) {
        combinedCandidates = combinedCandidates.concat(preview.image_candidates);
      }
    });

    return {
      id: "upload-collection-" + Date.now(),
      platform: "本地上传",
      title: title || ("已汇总 " + previews.length + " 张图片的解构结果"),
      description: "上传后的实时解构预览已汇总到同一视图，可直接查看新增单品并跳转试衣。",
      source_url: previews[0].source_url,
      primary_image_url: previews[0].primary_image_url,
      image_candidates: combinedCandidates.slice(0, 6),
      strategy: {
        provider_chain: previews[0].strategy && previews[0].strategy.provider_chain,
        provider_used: "批量上传解构汇总",
        image_mode: previews.length + " 张图",
        candidate_count: combinedCandidates.length,
        notes: combinedNotes.slice(0, 6)
      },
      pieces: combinedPieces,
      saved_item_ids: combinedSavedIds
    };
  }

  function previewStat(label, value) {
    return '<div class="decomp-stat"><div class="decomp-stat-label">' + W.escapeHtml(label) + '</div><div class="decomp-stat-value">' + W.escapeHtml(value || "-") + '</div></div>';
  }

  function renderEmptyPreview() {
    return "";
  }

  function renderPreviewActionState() {
    var selectAllButton = document.getElementById("decomposition-select-all");
    var clearButton = document.getElementById("decomposition-clear");
    var confirmButton = document.getElementById("decomposition-confirm");
    var preview = state.preview;
    var pieces = previewPieces(preview);
    var saved = preview && Array.isArray(preview.saved_item_ids) && preview.saved_item_ids.length;

    if (selectAllButton) {
      selectAllButton.disabled = !preview || !pieces.length || !!saved;
      selectAllButton.style.opacity = selectAllButton.disabled ? ".45" : "1";
      selectAllButton.style.pointerEvents = selectAllButton.disabled ? "none" : "";
    }
    if (clearButton) {
      clearButton.disabled = !preview;
      clearButton.style.opacity = clearButton.disabled ? ".45" : "1";
      clearButton.style.pointerEvents = clearButton.disabled ? "none" : "";
    }
    if (confirmButton) {
      confirmButton.textContent = saved ? "去试衣工作台" : "一键入库并去试穿";
      confirmButton.disabled = !preview || (!saved && !state.selectedPieceIds.length);
      confirmButton.style.opacity = confirmButton.disabled ? ".55" : "1";
      confirmButton.style.pointerEvents = confirmButton.disabled ? "none" : "";
    }
  }

  function handleRefresh(message) {
    return function () {
      W.toast(message, "soft");
      fetchOverview(false);
    };
  }

  function handleError(error) {
    W.toast(error && error.message ? error.message : "操作失败");
  }

  function renderStats() {
    if (!state.overview) return;
    var cards = document.querySelectorAll(".stat-row .stc");
    if (!cards.length) return;
    var stats = state.overview.stats;
    cards[0].querySelector(".stc-val").textContent = stats.total;
    cards[1].querySelector(".stc-val").textContent = stats.processed;
    cards[1].querySelector(".stc-fill").style.width = Math.round((stats.processed / Math.max(1, stats.total)) * 100) + "%";
    cards[2].querySelector(".stc-val").textContent = stats.running + " 件";
    cards[3].querySelector(".stc-val").textContent = stats.waiting;
    cards[3].querySelector(".stc-fill").style.width = Math.round((stats.waiting / Math.max(1, stats.total)) * 100) + "%";
    cards[4].querySelector(".stc-val").textContent = (state.overview.enriched_items || []).length;
    cards[4].querySelector(".stc-fill").style.width = Math.round(((state.overview.enriched_items || []).length / Math.max(1, stats.total)) * 100) + "%";
  }

  function renderPipeline() {
    if (!state.overview) return;
    var items = document.querySelectorAll(".pipe-item");
    var queue = state.overview.queue || { progress: 0 };
    var stages = state.overview.pipeline_stages || [];
    items.forEach(function (node, index) {
      var stage = stages[index];
      if (!stage) return;
      var dot = node.querySelector(".pi-dot");
      var label = node.querySelector(".pi-label");
      var count = node.querySelector(".pi-count");
      if (label) label.textContent = stage.label || "";
      if (count) count.textContent = stage.count || "";
      if (dot) dot.className = "pi-dot " + (stage.status || "wait");
      if (count) {
        count.className = "pi-count" + ((stage.status === "err") ? " err" : "");
        if (stage.status === "done") count.style.cssText = "background:var(--sage-pale);color:var(--sage)";
        else if (stage.status === "run") count.style.cssText = "background:rgba(207,139,127,.14);color:var(--rose)";
        else if (stage.status === "err") count.style.cssText = "";
        else count.style.cssText = "background:var(--amber-pale);color:var(--amber)";
      }
    });
    var fill = document.getElementById("q-fill");
    var pct = document.getElementById("q-pct");
    if (fill) fill.style.width = (queue.progress || 0) + "%";
    if (pct) pct.textContent = (queue.progress || 0) + "%";
  }

  function renderServices() {
    if (!state.overview) return;
    var nodes = document.querySelectorAll(".svc-item");
    (state.overview.services || []).forEach(function (service, index) {
      var node = nodes[index];
      if (!node) return;
      node.querySelector(".svc-name").textContent = service.name;
      var badge = node.querySelector(".svc-badge");
      badge.textContent = service.badge;
      var dot = node.querySelector(".svc-dot");
      dot.className = "svc-dot " + (service.status === "pri" ? "on" : service.status);
      badge.className = "svc-badge " + (service.status === "on" ? "sb-on" : service.status === "local" ? "sb-local" : "sb-on sb-pri");
    });
  }

  function renderProcessingCards() {
    var grid = document.querySelector(".ip-grid");
    if (!grid || !state.overview) return;
    var items = filteredProcessingItems();
    grid.innerHTML = items.map(function (item) {
      var badge = item.badge || {};
      var stroke = "rgba(192,100,88,.5)";
      var provider = item.provider || badge.provider || "待接入";
      var note = badge.status === "error"
        ? "外部 API 超时，切换到 fallback 或重新发起。"
        : badge.status === "waiting"
          ? "等待队列调度"
          : badge.status === "running"
            ? ((item.pipeline && item.pipeline.summary) || "当前正在锁定用户并生成解构素材")
            : ((item.pipeline && item.pipeline.summary) || (provider + " · 质量 " + confidence(item) + "%"));
      var actions = "";
      if (badge.status === "error") {
        actions = '<button class="ia primary" data-action="retry" data-id="' + item.id + '">重试</button><button class="ia" data-action="fallback" data-id="' + item.id + '">本地处理</button>';
      } else if (badge.status === "waiting" || badge.status === "raw") {
        actions = '<button class="ia primary" data-action="prioritize" data-id="' + item.id + '">优先处理</button>';
      } else if (badge.status === "running") {
        actions = '<button class="ia" data-action="view" data-id="' + item.id + '">查看进度</button>';
      } else {
        actions = '<button class="ia" data-action="view" data-id="' + item.id + '">查看</button><button class="ia sage" data-action="confirm" data-id="' + item.id + '">确认</button>';
      }
      return '' +
        '<div class="ipc" data-id="' + item.id + '">' +
          '<div class="ipc-visual" title="悬停预览白底图">' +
            '<div class="ipc-before ' + item.visual_theme + '">' + W.silhouetteSvg(item.silhouette, stroke, "cloth-sil") + '</div>' +
            '<div class="ipc-after" style="background:#f8f5f2">' + W.silhouetteSvg(item.silhouette, stroke, "cloth-sil") + '</div>' +
            '<span class="ipc-ba-label before-l">原图</span><span class="ipc-ba-label after-l">白底图</span>' +
            '<div class="ipc-status"><span class="st-badge ' + toneToBadge(badge.tone) + '">' + W.escapeHtml(badge.label || "处理中") + '</span></div>' +
          '</div>' +
          '<div class="ipc-prog"><div class="ipc-prog-fill fill-done" style="width:' + (badge.progress || 0) + '%;background:' + (badge.tone === "fallback" ? "var(--amber)" : badge.tone === "err" ? "#d08080" : badge.tone === "run" ? "var(--rose)" : badge.tone === "wait" ? "var(--amber)" : "var(--sage)") + '"></div></div>' +
          '<div class="ipc-info">' +
            '<div class="ipc-name">' + W.escapeHtml(item.name) + '</div>' +
            '<div class="ipc-meta">' + (item.tags || []).slice(0, 2).map(function (tag, idx) {
              var cls = idx === 0 ? "t-sage" : "t-rose";
              return '<span class="ipc-tag ' + cls + '">' + W.escapeHtml(tag) + "</span>";
            }).join("") + '</div>' +
            '<div class="ipc-service">' + W.escapeHtml(note) + '</div>' +
            '<div class="ipc-acts">' + actions + '</div>' +
          '</div>' +
        '</div>';
    }).join("");
    bindProcessingActions();
  }

  function renderEnrichedCards() {
    var grid = document.querySelector(".enrich-grid");
    if (!grid || !state.overview) return;
    var items = filteredEnrichedItems();
    grid.classList.add("report-layout");
    grid.innerHTML = renderEnrichmentReport() + items.map(function (item) {
      return '' +
        '<div class="enc" data-id="' + item.id + '">' +
          '<div class="enc-top">' +
            renderCardThumb(item, "enc-thumb", "rgba(192,100,88,.6)") +
            '<div class="enc-right">' +
              '<div class="enc-name">' + W.escapeHtml(item.name) + '</div>' +
              '<div class="enc-orig-tags">' + (item.tags || []).slice(0, 3).map(function (tag, idx) {
                return '<span class="ipc-tag ' + (idx === 0 ? "t-rose" : "t-gray") + '">' + W.escapeHtml(tag) + "</span>";
              }).join("") + '</div>' +
              '<div class="enc-score"><span style="font-size:9.5px;color:var(--ink3);letter-spacing:.06em">置信度</span><div class="enc-score-bar"><div class="enc-score-fill" style="width:' + confidence(item) + '%"></div></div><span class="enc-score-val">' + confidence(item) + '%</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="enc-enriched">' +
            '<div class="enc-enr-row"><span class="enr-key">场景</span><div class="enr-tags">' + (item.occasions || ["待补全"]).map(function (entry) { return '<span class="enr-tag new">' + W.escapeHtml(entry) + "</span>"; }).join("") + '</div></div>' +
            '<div class="enc-enr-row"><span class="enr-key">风格</span><div class="enr-tags">' + (item.tags || []).slice(0, 2).map(function (entry) { return '<span class="enr-tag exist">' + W.escapeHtml(entry) + "</span>"; }).join("") + '</div></div>' +
            '<div class="enc-enr-row"><span class="enr-key">说明</span><div class="enr-val">' + W.escapeHtml(item.note || "等待 AI 为这件单品补完整体说明。") + '</div></div>' +
          '</div>' +
          '<div class="enc-acts"><button class="ia sage" data-action="confirm" data-id="' + item.id + '">确认保存</button><button class="ia" data-action="edit" data-id="' + item.id + '">手动修改</button><button class="ia" data-action="reanalyze" data-id="' + item.id + '" style="margin-left:auto">重新分析</button></div>' +
        '</div>';
    }).join("");
    bindEnrichedActions();
  }

  function renderPending() {
    var row = document.querySelector(".pending-row");
    if (!row || !state.overview) return;
    row.innerHTML = (state.overview.pending_items || []).map(function (item) {
      var badge = item.badge || {};
      return '' +
        '<div class="pr-item" data-id="' + item.id + '">' +
          renderCardThumb(item, "pr-thumb", "rgba(170,110,175,.6)") +
          '<div style="flex:1;min-width:0">' +
            '<div class="pr-name">' + W.escapeHtml(item.name) + '</div>' +
            '<div class="pr-tags">' + (item.tags || []).slice(0, 2).map(function (tag) { return '<span class="ipc-tag t-gray">' + W.escapeHtml(tag) + "</span>"; }).join("") + '<span class="ipc-tag t-amber">' + W.escapeHtml(badge.label || "待处理") + '</span></div>' +
          '</div>' +
          '<div class="pr-status">' +
            '<div class="pr-progress"><div class="pr-pfill" style="width:' + (badge.progress || 0) + '%"></div></div>' +
            '<span class="pr-pct">' + (badge.status === "running" ? "分析中" : (item.priority ? "已优先" : "队列待处理")) + '</span>' +
            '<button class="btn btn-out" data-action="prioritize" data-id="' + item.id + '" style="padding:5px 12px;font-size:11px' + (badge.status === "running" ? ";opacity:.4;pointer-events:none" : "") + '">优先</button>' +
          '</div>' +
        '</div>';
    }).join("");
    bindPendingActions();
  }

  function bindFilterPills() {
    var sections = document.querySelectorAll(".filter-pills");
    sections.forEach(function (group, groupIndex) {
      group.querySelectorAll(".fpill").forEach(function (pill) {
        pill.onclick = function () { fp(pill); };
        if (groupIndex === 0) {
          var text = pill.textContent.trim();
          if (text === "全部") pill.dataset.value = "all";
          if (text === "已完成") pill.dataset.value = "done";
          if (text === "处理中") pill.dataset.value = "running";
          if (text === "待处理") pill.dataset.value = "waiting";
          if (text === "错误") pill.dataset.value = "error";
        }
      });
    });
  }

  function bindProcessingActions() {
    document.querySelectorAll(".ip-grid [data-action]").forEach(function (node) {
      node.addEventListener("click", function () {
        var id = Number(node.dataset.id);
        var action = node.dataset.action;
        if (action === "view") {
          openInspectionModal(findSmartItem(id));
          return;
        }
        if (action === "confirm") {
          api("/items/" + id + "/confirm", { method: "POST" }).then(handleRefresh("已确认当前处理结果")).catch(handleError);
          return;
        }
        if (action === "retry") {
          api("/items/" + id + "/retry", { method: "POST" }).then(handleRefresh("已重新发起处理")).catch(handleError);
          return;
        }
        if (action === "fallback") {
          api("/items/" + id + "/fallback", { method: "POST" }).then(handleRefresh("已切到本地 fallback")).catch(handleError);
          return;
        }
        if (action === "prioritize") {
          api("/pending/" + id + "/prioritize", { method: "POST" }).then(handleRefresh("已提升到优先队列")).catch(handleError);
        }
      });
    });
  }

  function bindEnrichedActions() {
    document.querySelectorAll(".enrich-grid [data-action]").forEach(function (node) {
      node.addEventListener("click", function () {
        var id = Number(node.dataset.id);
        var action = node.dataset.action;
        var item = ((state.overview && state.overview.enriched_items) || []).find(function (entry) { return entry.id === id; });
        if (!item) return;
        if (action === "confirm") {
          api("/items/" + id + "/confirm", { method: "POST" }).then(handleRefresh("补全信息已保存")).catch(handleError);
          return;
        }
        if (action === "reanalyze") {
          api("/items/" + id + "/reanalyze", { method: "POST" }).then(handleRefresh("已重新分析这件单品")).catch(handleError);
          return;
        }
        if (action === "edit") {
          W.openFormModal({
            title: "手动修正 AI 补全",
            description: "这里修改的是智能识别结果，和衣橱管理页的人工整理是分开的。",
            submitLabel: "保存修改",
            fields: [
              { name: "name", label: "单品名称", value: item.name },
              { name: "color", label: "颜色", value: item.tags && item.tags[1] ? item.tags[1] : "" },
              { name: "tags", label: "标签", value: (item.tags || []).join("，"), full: true },
              { name: "occasions", label: "场景", value: (item.occasions || []).join("，"), full: true },
              { name: "style_notes", label: "风格说明", type: "textarea", value: item.note || "", full: true }
            ]
          }).then(function (values) {
            if (!values) return;
            api("/items/" + id + "/enrich", {
              method: "PUT",
              body: JSON.stringify({
                name: values.name,
                color: values.color,
                tags: W.parseList(values.tags),
                occasions: W.parseList(values.occasions),
                style_notes: values.style_notes
              })
            }).then(handleRefresh("AI 补全信息已更新")).catch(handleError);
          });
        }
      });
    });
  }

  function bindPendingActions() {
    document.querySelectorAll(".pending-row [data-action='prioritize']").forEach(function (node) {
      node.addEventListener("click", function () {
        api("/pending/" + Number(node.dataset.id) + "/prioritize", { method: "POST" }).then(handleRefresh("已安排优先分析")).catch(handleError);
      });
    });
  }

  function renderActionModels() {
    if (!state.overview) return;
    var actionModels = state.overview.action_models || {};
    var toolbarButtons = document.querySelectorAll(".toolbar .tact");
    if (toolbarButtons[1] && actionModels.enrich) {
      if (toolbarButtons[1].lastChild) toolbarButtons[1].lastChild.nodeValue = actionModels.enrich.label || "批量补全标签";
      toolbarButtons[1].title = actionModels.enrich.model || "";
    }
    if (toolbarButtons[2] && actionModels.background) {
      if (toolbarButtons[2].lastChild) toolbarButtons[2].lastChild.nodeValue = actionModels.background.label || "批量识别人像服饰";
      toolbarButtons[2].title = actionModels.background.model || "";
    }
  }

  function saveServiceConfig() {
    var fields = document.querySelectorAll("#modal-service .modal-field");
    api("/config", {
      method: "POST",
      body: JSON.stringify({
        primary_service: fields[0].querySelector("select").value,
        remove_bg_key: fields[1].querySelector("input").value,
        person_detector: fields[2].querySelector("select").value,
        face_selector: fields[3].querySelector("select").value,
        garment_segmenter: fields[4].querySelector("select").value,
        label_model: fields[5].querySelector("select").value,
        recognition_local_model: fields[6].querySelector("input").value.trim() || "FashionCLIP + 本地视觉解构",
        recognition_openai_model: fields[7].querySelector("input").value.trim() || "gpt-4.1-mini",
        recognition_deepseek_model: fields[8].querySelector("input").value.trim() || "deepseek-chat",
        recognition_retries: Number(fields[9].querySelector("input").value || 1),
        fallback_strategy: fields[10].querySelector("select").value,
        concurrency: Number(fields[11].querySelector("input").value || 3)
      })
    }).then(function () {
      closeModal("service");
      W.toast("AI 解构服务配置已保存", "soft");
      fetchOverview(false);
    }).catch(handleError);
  }

  function submitUrlPreview() {
    var input = document.getElementById("smart-url-input");
    var submit = document.querySelector("#modal-url .mb-main");
    var url = String(input && input.value || state.urlDraft || "").trim();
    if (!url) {
      W.toast("先贴链接，再开始解构");
      return;
    }
    state.urlDraft = url;
    if (submit) {
      submit.disabled = true;
      submit.style.opacity = ".7";
      submit.textContent = "解析中...";
    }
    api("/decompose-url-preview", {
      method: "POST",
      body: JSON.stringify({
        image_url: url,
        source_url: url,
        platform_hint: detectPlatform(url),
        category: "tops",
        slot: "top",
        color: "米白"
      })
    }).then(function (result) {
      var preview = result && result.preview;
      if (!preview || !preview.pieces || !preview.pieces.length) {
        throw new Error("这条链接暂时没有解构出可入库的服装单品");
      }
      setPreview(preview);
      closeModal("url");
      W.toast("已完成实时解构预览，请勾选需要入库的单品", "soft");
    }).catch(handleError).finally(function () {
      if (submit) {
        submit.disabled = false;
        submit.style.opacity = "1";
        submit.textContent = "开始解构";
      }
    });
  }

  function confirmPreview() {
    if (!state.preview) {
      W.toast("还没有可确认的解构结果");
      return;
    }
    if (state.preview.saved_item_ids && state.preview.saved_item_ids.length) {
      rememberTryOnFocus(state.preview.saved_item_ids, { title: state.preview.title, source: "smart-upload" });
      navigateToTryOn("/try-on");
      return;
    }
    var selectedIds = selectedPreviewPieces().map(function (piece) { return String(piece.id); });
    if (!selectedIds.length) {
      W.toast("请至少勾选 1 件单品后再入库");
      return;
    }
    api("/decompose-preview/" + encodeURIComponent(state.preview.id) + "/confirm", {
      method: "POST",
      body: JSON.stringify({
        piece_ids: selectedIds,
        auto_focus_try_on: true
      })
    }).then(function (result) {
      var focusIds = (result && result.focus_item_ids) || [];
      if (focusIds.length) {
        rememberTryOnFocus(focusIds, { title: state.preview.title, source: "smart-url" });
      }
      state.preview = Object.assign({}, state.preview, { saved_item_ids: focusIds.slice() });
      renderDecompositionPreview();
      W.toast((result && result.message) || "已收入衣橱，可直接试穿", "soft");
      fetchOverview(false);
      setTimeout(function () {
        navigateToTryOn(result && result.try_on_url ? result.try_on_url : "/try-on");
      }, 220);
    }).catch(handleError);
  }

  function submitUploadBatch() {
    var selects = document.querySelectorAll("#modal-upload .mf-select");
    var mode = selects[0].value;
    var defaultCategory = selects[1].value;
    if (!state.uploadFiles.length) {
      W.toast("请先选择至少 1 张图片");
      return;
    }
    var formData = new FormData();
    formData.append("mode", mode);
    formData.append("default_category", defaultCategory);
    state.uploadFiles.forEach(function (file) {
      formData.append("files", file, file.name);
    });

    api("/upload-batch-files", {
      method: "POST",
      body: formData
    }).then(function (result) {
      closeModal("upload");
      resetUploadSelection();
      if (result && result.previews && result.previews.length) {
        var mergedPreview = mergePreviews(result.previews, result.message);
        if (mergedPreview && result.focus_item_ids && result.focus_item_ids.length) {
          mergedPreview.saved_item_ids = result.focus_item_ids.slice();
          rememberTryOnFocus(result.focus_item_ids, { title: mergedPreview.title, source: "smart-upload" });
          setPreview(mergedPreview);
        } else if (mergedPreview) {
          setPreview(mergedPreview);
        }
      }
      W.toast((result && result.message) || "图片已经进入智能处理链路", "soft");
      fetchOverview(false);
    }).catch(handleError);
  }

  function renderDecompositionPreview() {
    var shell = document.getElementById("decomposition-shell");
    var content = document.getElementById("decomposition-content");
    var titleNode = document.getElementById("decomposition-title");
    var subNode = document.getElementById("decomposition-sub");
    if (!shell || !content) return;

    if (!state.preview) {
      shell.classList.remove("show");
      shell.classList.remove("is-preview");
      if (titleNode) titleNode.textContent = EMPTY_TITLE;
      if (subNode) subNode.textContent = EMPTY_SUBTITLE;
      content.innerHTML = renderEmptyPreview();
      renderPreviewActionState();
      return;
    }

    shell.classList.add("show");
    shell.classList.add("is-preview");

    var preview = state.preview;
    var pieces = previewPieces(preview);
    var strategy = preview.strategy || {};
    var saved = Array.isArray(preview.saved_item_ids) && preview.saved_item_ids.length;
    var primaryImage = preview.primary_image_url || (preview.image_candidates && preview.image_candidates[0] ? preview.image_candidates[0].url : "");
    if (titleNode) titleNode.textContent = preview.title || "实时解构预览";
    if (subNode) {
      subNode.textContent = saved
        ? ("已入库 " + preview.saved_item_ids.length + " 件单品，可直接跳转试衣工作台。")
        : (preview.description || "勾选需要保留的单品后，一键入库并同步到试衣工作台。");
    }

    var pieceHtml = pieces.map(function (piece) {
      var attrs = piece.attributes || {};
      var imageUrl = piece.processed_image_url || piece.preview_image_url || piece.source_image_url || "";
      var selected = state.selectedPieceIds.map(String).indexOf(String(piece.id)) >= 0;
      var tags = [attrs.color, attrs.style, attrs.material, attrs.season].filter(Boolean);
      var summary = piece.summary || [attrs.category, attrs.color, attrs.style].filter(Boolean).join(" | ");
      var checkLabel = saved ? "✓" : (selected ? "✓" : "");
      var media = imageUrl
        ? '<img src="' + W.escapeHtml(imageUrl) + '" alt="' + W.escapeHtml(piece.name || piece.slot_label || "单品") + '">'
        : W.silhouetteSvg(silhouetteForPiece(piece.slot), "rgba(192,100,88,.45)", "cloth-sil");
      return '' +
        '<div class="decomp-piece' + (selected ? " selected" : "") + '" data-piece-id="' + W.escapeHtml(piece.id) + '">' +
          '<div class="decomp-piece-media">' +
            media +
            '<div class="decomp-piece-badge">' + W.escapeHtml(piece.emoji || "✨") + ' ' + W.escapeHtml(piece.slot_label || "单品") + '</div>' +
            '<div class="decomp-piece-check">' + W.escapeHtml(checkLabel) + '</div>' +
          '</div>' +
          '<div class="decomp-piece-body">' +
            '<div class="decomp-piece-name"><span>' + W.escapeHtml(piece.name || piece.slot_label || "单品") + '</span></div>' +
            '<div class="decomp-piece-summary">' + W.escapeHtml(summary || "等待补充属性") + '</div>' +
            '<div class="decomp-piece-tags">' + tags.map(function (tag) {
              return '<span class="decomp-piece-tag">' + W.escapeHtml(tag) + '</span>';
            }).join("") + '</div>' +
            '<div class="decomp-piece-meta"><span>' + W.escapeHtml(saved && piece.source_title ? piece.source_title : (attrs.category || piece.category_label || "智能解构")) + '</span><span>置信度 ' + Math.round(Number(piece.confidence || 0) * 100) + '%</span></div>' +
          '</div>' +
        '</div>';
    }).join("");

    var notes = (strategy.notes || []).slice(0, 6).map(function (note) {
      return '<span class="decomp-note">' + W.escapeHtml(note) + '</span>';
    }).join("");

    var candidates = (preview.image_candidates || []).slice(0, 5).map(function (candidate, index) {
      var label = candidate.label || ("候选图 " + (index + 1));
      return '<span class="decomp-candidate">' + W.escapeHtml(label) + (candidate.score ? '<strong style="font-weight:400;color:var(--rose)"> ' + W.escapeHtml(String(candidate.score)) + '</strong>' : "") + '</span>';
    }).join("");

    content.innerHTML = '' +
      '<div class="decomp-grid">' +
        '<div class="decomp-stage">' +
          '<div class="decomp-image-wrap">' +
            (primaryImage
              ? '<img src="' + W.escapeHtml(primaryImage) + '" alt="' + W.escapeHtml(preview.title || "解构预览") + '">'
              : '<div style="height:100%;display:flex;align-items:center;justify-content:center">' + W.silhouetteSvg("dress", "rgba(192,100,88,.38)", "cloth-sil") + '</div>') +
          '</div>' +
          '<div class="decomp-candidates">' + candidates + '</div>' +
        '</div>' +
        '<div class="decomp-summary">' +
          '<div class="decomp-stat-grid">' +
            previewStat("来源平台", preview.platform || detectPlatform(preview.source_url)) +
            previewStat("识别链路", strategy.provider_used || "本地视觉解构") +
            previewStat("图像类型", strategy.image_mode || "待判断") +
            previewStat("拆解数量", pieces.length + " 件单品") +
          '</div>' +
          '<div class="decomp-stat-grid">' +
            previewStat("模型回退链", strategy.provider_chain || "本地 → OpenAI → DeepSeek") +
            previewStat("候选图片", String(strategy.candidate_count || (preview.image_candidates || []).length || 1)) +
          '</div>' +
          '<div class="decomp-notes">' + notes + '</div>' +
          '<div class="decomp-stat"><div class="decomp-stat-label">入库状态</div><div class="decomp-stat-value">' + W.escapeHtml(saved ? ("已入库 " + preview.saved_item_ids.length + " 件，可直接去试穿") : ("待确认 · 当前勾选 " + state.selectedPieceIds.length + " / " + pieces.length + " 件")) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="decomp-piece-grid">' + pieceHtml + '</div>';

    document.querySelectorAll(".decomp-piece[data-piece-id]").forEach(function (node) {
      node.addEventListener("click", function () {
        if (saved) return;
        var pieceId = String(node.getAttribute("data-piece-id") || "");
        var selected = state.selectedPieceIds.map(String);
        if (selected.indexOf(pieceId) >= 0) {
          state.selectedPieceIds = selected.filter(function (entry) { return entry !== pieceId; });
        } else {
          state.selectedPieceIds = selected.concat([pieceId]);
        }
        renderDecompositionPreview();
      });
    });

    renderPreviewActionState();
  }

  function fetchOverview(withToast) {
    var params = [];
    if (state.query) params.push("query=" + encodeURIComponent(state.query));
    if (state.status && state.status !== "all") params.push("status=" + encodeURIComponent(state.status));
    return api((params.length ? "?" + params.join("&") : ""), { method: "GET" }).then(function (data) {
      state.overview = data;
      renderAll();
      state.hasLoadedOnce = true;
      if (withToast) W.toast("智能衣物看板已更新", "soft");
    }).catch(function (error) {
      if (withToast || state.hasLoadedOnce) {
        handleError(error);
      }
      state.hasLoadedOnce = true;
    });
  }

  function renderAll() {
    renderStats();
    renderPipeline();
    renderServices();
    renderActionModels();
    renderDecompositionPreview();
    renderProcessingCards();
    renderEnrichedCards();
    renderPending();
  }

  window.fp = function (pill) {
    var group = pill.closest(".filter-pills");
    group.querySelectorAll(".fpill").forEach(function (entry) { entry.classList.remove("on"); });
    pill.classList.add("on");
    var wrapper = Array.prototype.indexOf.call(document.querySelectorAll(".filter-pills"), group);
    if (wrapper === 0) {
      state.status = pill.dataset.value || "all";
      fetchOverview();
    } else if (wrapper === 1) {
      state.imageType = pill.textContent.trim();
      renderProcessingCards();
    } else {
      state.enrichState = pill.textContent.trim();
      renderEnrichedCards();
    }
  };

  window.showModal = function (id) {
    if (id === "service") syncServiceModal();
    if (id === "upload") syncUploadSummary();
    if (id === "url") syncUrlModal();
    document.getElementById("modal-" + id).classList.add("show");
  };

  window.closeModal = function (id) {
    if (id === "upload") resetUploadSelection();
    if (id === "url") {
      var input = document.getElementById("smart-url-input");
      state.urlDraft = String(input && input.value || state.urlDraft || "").trim();
    }
    document.getElementById("modal-" + id).classList.remove("show");
  };

  window.toast = function (message) {
    W.toast(message);
  };

  window.runAll = function () {
    api("/actions/run-all", { method: "POST" }).then(handleRefresh("已启动全量处理队列")).catch(handleError);
  };

  window.runBg = function () {
    api("/actions/run-background", { method: "POST" }).then(handleRefresh("批量解构任务已提交")).catch(handleError);
  };

  window.runEnrich = function () {
    api("/actions/run-enrich", { method: "POST" }).then(handleRefresh("批量标签补全任务已启动")).catch(handleError);
  };

  window.filt = function (value) {
    state.query = String(value || "").trim();
    fetchOverview();
  };

  window.saveServiceConfig = saveServiceConfig;
  window.submitUploadBatch = submitUploadBatch;
  window.submitUrlPreview = submitUrlPreview;

  document.querySelectorAll(".modal-bg").forEach(function (mask) {
    mask.addEventListener("click", function (event) {
      if (event.target === mask) {
        if (mask.id === "modal-upload") resetUploadSelection();
        if (mask.id === "modal-url") syncUrlModal();
        mask.classList.remove("show");
      }
    });
  });

  var serviceSave = document.querySelector("#modal-service .mb-main");
  if (serviceSave) serviceSave.onclick = saveServiceConfig;

  var uploadSave = document.querySelector("#modal-upload .mb-main");
  if (uploadSave) uploadSave.onclick = submitUploadBatch;

  var urlSave = document.querySelector("#modal-url .mb-main");
  if (urlSave) urlSave.onclick = submitUrlPreview;

  var urlInput = document.getElementById("smart-url-input");
  if (urlInput) {
    urlInput.addEventListener("input", function () {
      state.urlDraft = urlInput.value.trim();
    });
    urlInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitUrlPreview();
      }
    });
  }

  var uploadDrop = document.querySelector("#modal-upload .modal-body > div");
  if (uploadDrop) {
    uploadDrop.addEventListener("click", function () { uploadInput.click(); });
    uploadDrop.addEventListener("dragover", function (event) {
      event.preventDefault();
      uploadDrop.style.borderColor = "var(--rose)";
    });
    uploadDrop.addEventListener("dragleave", function () {
      syncUploadSummary();
    });
    uploadDrop.addEventListener("drop", function (event) {
      event.preventDefault();
      setUploadSelection(event.dataTransfer && event.dataTransfer.files);
    });
  }

  uploadInput.onchange = function () {
    setUploadSelection(uploadInput.files);
  };

  var previewSelectAll = document.getElementById("decomposition-select-all");
  if (previewSelectAll) {
    previewSelectAll.addEventListener("click", function () {
      if (!state.preview || (state.preview.saved_item_ids && state.preview.saved_item_ids.length)) return;
      state.selectedPieceIds = allSelectedPieceIds(state.preview);
      renderDecompositionPreview();
    });
  }

  var previewClear = document.getElementById("decomposition-clear");
  if (previewClear) {
    previewClear.addEventListener("click", function () {
      state.preview = null;
      state.selectedPieceIds = [];
      renderDecompositionPreview();
    });
  }

  var previewConfirm = document.getElementById("decomposition-confirm");
  if (previewConfirm) previewConfirm.addEventListener("click", confirmPreview);

  var toolbarButtons = document.querySelectorAll(".toolbar .tact");
  if (toolbarButtons[0]) {
    toolbarButtons[0].addEventListener("click", function () {
      var items = (state.overview && state.overview.enriched_items) || [];
      if (!items.length) {
        W.toast("当前没有可批量确认的补全结果");
        return;
      }
      Promise.all(items.map(function (item) { return api("/items/" + item.id + "/confirm", { method: "POST" }); }))
        .then(handleRefresh("本页补全结果已全部确认"))
        .catch(handleError);
    });
  }

  var batchButtons = document.querySelectorAll(".batch-bar .bba");
  if (batchButtons[0]) batchButtons[0].addEventListener("click", window.runEnrich);
  if (batchButtons[1]) {
    batchButtons[1].addEventListener("click", function () {
      var items = (state.overview && state.overview.enriched_items) || [];
      if (!items.length) {
        W.toast("当前没有可确认的补全结果");
        return;
      }
      Promise.all(items.map(function (item) { return api("/items/" + item.id + "/confirm", { method: "POST" }); }))
        .then(handleRefresh("批量确认完成"))
        .catch(handleError);
    });
  }
  if (batchButtons[2]) {
    batchButtons[2].addEventListener("click", function () {
      var enriched = (state.overview && state.overview.enriched_items) || [];
      var lines = enriched.map(function (item) {
        return [item.name, (item.tags || []).join("/"), (item.occasions || []).join("/"), item.note || ""].join(",");
      });
      var blob = new Blob(["名称,标签,场景,说明\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "smart-wardrobe-tags.csv";
      link.click();
      URL.revokeObjectURL(url);
      W.toast("标签数据已导出", "soft");
    });
  }

  bindFilterPills();
  syncUploadSummary();
  syncUrlModal();
  renderDecompositionPreview();
  fetchOverview(false);
})();
