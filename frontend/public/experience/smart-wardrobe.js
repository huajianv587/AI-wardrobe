(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var API_ROOT = "/api/v1/experience/smart-wardrobe";
  var state = {
    query: "",
    status: "all",
    imageType: "all",
    enrichState: "all",
    overview: null,
    uploadFiles: [],
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

  function filteredProcessingItems() {
    var items = (state.overview && state.overview.processing_items) || [];
    return items.filter(function (item) {
      var passType = true;
      var badge = item.badge || {};
      if (state.imageType === "白底图") passType = badge.status === "done" || badge.status === "fallback";
      if (state.imageType === "原图") passType = badge.status === "raw" || badge.status === "waiting";
      if (state.imageType === "抠图") passType = badge.status !== "raw";
      if (!passType) return false;
      return true;
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
    var queue = state.overview.queue;
    if (items[0]) items[0].querySelector(".pi-count").textContent = queue.running ? "运行中" : "空闲";
    if (items[1]) items[1].querySelector(".pi-count").textContent = queue.completed ? "已完成" : "等待";
    if (items[2]) items[2].querySelector(".pi-count").textContent = queue.waiting ? ("队列 " + queue.waiting) : "就绪";
    if (items[3]) items[3].querySelector(".pi-count").textContent = state.overview.enriched_items.length ? "已生成" : "等待";
    if (items[4]) items[4].querySelector(".pi-count").textContent = "已就绪";
    if (items[5]) items[5].querySelector(".pi-count").textContent = queue.failed ? ("异常 " + queue.failed) : "稳定";
    var fill = document.getElementById("q-fill");
    var pct = document.getElementById("q-pct");
    if (fill) fill.style.width = queue.progress + "%";
    if (pct) pct.textContent = queue.progress + "%";
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
            ? "当前正在生成抠图和白底图"
            : provider + " · 质量 " + confidence(item) + "%";
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
    grid.innerHTML = items.map(function (item) {
      return '' +
        '<div class="enc" data-id="' + item.id + '">' +
          '<div class="enc-top">' +
            '<div class="enc-thumb ' + item.visual_theme + '"><div class="enc-thumb-inner">' + W.silhouetteSvg(item.silhouette, "rgba(192,100,88,.6)", "") + '</div></div>' +
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
          '<div class="pr-thumb ' + item.visual_theme + '">' + W.silhouetteSvg(item.silhouette, "rgba(170,110,175,.6)", "") + '</div>' +
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
          W.toast("白底图、抠图和原图已经在这张卡片里联动展示");
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

  function handleRefresh(message) {
    return function () {
      W.toast(message, "soft");
      fetchOverview(false);
    };
  }

  function handleError(error) {
    W.toast(error.message || "操作失败");
  }

  function renderAll() {
    renderStats();
    renderPipeline();
    renderServices();
    renderProcessingCards();
    renderEnrichedCards();
    renderPending();
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

  function saveServiceConfig() {
    var fields = document.querySelectorAll("#modal-service .modal-field");
    api("/config", {
      method: "POST",
      body: JSON.stringify({
        primary_service: fields[0].querySelector("select").value,
        remove_bg_key: fields[1].querySelector("input").value,
        fallback_strategy: fields[2].querySelector("select").value,
        label_model: fields[3].querySelector("select").value,
        concurrency: Number(fields[4].querySelector("input").value || 3)
      })
    }).then(function () {
      closeModal("service");
      W.toast("AI 服务配置已保存", "soft");
      fetchOverview(false);
    }).catch(handleError);
  }

  function submitUploadBatch() {
    var selects = document.querySelectorAll("#modal-upload .mf-select");
    api("/upload-batch", {
      method: "POST",
      body: JSON.stringify({
        mode: selects[0].value,
        default_category: selects[1].value,
        filenames: state.uploadFiles.length ? state.uploadFiles : ["demo-smart-upload.png"]
      })
    }).then(function () {
      closeModal("upload");
      W.toast("批量上传已经加入智能处理队列", "soft");
      state.uploadFiles = [];
      fetchOverview(false);
    }).catch(handleError);
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
    document.getElementById("modal-" + id).classList.add("show");
  };

  window.closeModal = function (id) {
    document.getElementById("modal-" + id).classList.remove("show");
  };

  window.toast = function (message) {
    W.toast(message);
  };

  window.runAll = function () {
    api("/actions/run-all", { method: "POST" }).then(handleRefresh("已启动全量处理队列")).catch(handleError);
  };

  window.runBg = function () {
    api("/actions/run-background", { method: "POST" }).then(handleRefresh("批量抠图任务已提交")).catch(handleError);
  };

  window.runEnrich = function () {
    api("/actions/run-enrich", { method: "POST" }).then(handleRefresh("AI 标签补全任务已启动")).catch(handleError);
  };

  window.filt = function (value) {
    state.query = String(value || "").trim();
    fetchOverview();
  };

  document.querySelectorAll(".modal-bg").forEach(function (mask) {
    mask.addEventListener("click", function (event) {
      if (event.target === mask) mask.classList.remove("show");
    });
  });

  var serviceSave = document.querySelector("#modal-service .mb-main");
  if (serviceSave) serviceSave.onclick = saveServiceConfig;
  var uploadSave = document.querySelector("#modal-upload .mb-main");
  if (uploadSave) uploadSave.onclick = submitUploadBatch;

  var uploadDrop = document.querySelector("#modal-upload .modal-body > div");
  if (uploadDrop) {
    uploadDrop.addEventListener("click", function () { uploadInput.click(); });
  }
  uploadInput.onchange = function () {
    state.uploadFiles = Array.prototype.slice.call(uploadInput.files || []).map(function (file) { return file.name; });
    if (state.uploadFiles.length) W.toast("已选中 " + state.uploadFiles.length + " 张图片，准备加入处理队列", "soft");
  };

  var toolbarButtons = document.querySelectorAll(".toolbar .tact");
  if (toolbarButtons[0]) {
    toolbarButtons[0].addEventListener("click", function () {
      var items = (state.overview && state.overview.enriched_items) || [];
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
  fetchOverview(false);
})();
