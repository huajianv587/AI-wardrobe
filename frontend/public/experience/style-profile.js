(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var state = {
    overview: null,
    hasLoadedOnce: false
  };

  function api(path, options) {
    return W.request("/api/v1/experience/style-profile" + path, options);
  }

  function patch(payload, successMessage) {
    return api("", {
      method: "PUT",
      body: JSON.stringify(payload)
    }).then(function () {
      W.toast(successMessage || "风格画像已保存", "soft");
      fetchOverview(false);
    }).catch(function (error) {
      W.toast(error.message || "保存失败");
    });
  }

  function renderHero() {
    if (!state.overview) return;
    var subtitle = document.querySelector(".hero-sub");
    if (subtitle) subtitle.textContent = state.overview.hero_subtitle;
  }

  function renderDNA() {
    if (!state.overview) return;
    var bar = document.querySelector(".dna-bar");
    var legend = document.querySelector(".dna-legend");
    bar.innerHTML = (state.overview.dna || []).map(function (entry) {
      return '<div class="dna-seg" style="width:' + entry.value + '%;background:' + entry.color + '"></div>';
    }).join("");
    legend.innerHTML = (state.overview.dna || []).map(function (entry) {
      return '<div class="dna-legend-item"><div class="dna-legend-dot" style="background:' + entry.color + '"></div>' + W.escapeHtml(entry.label) + " " + entry.value + "%</div>";
    }).join("");
  }

  function renderColorSection(selector, colors, avoid) {
    var wrap = document.querySelector(selector);
    if (!wrap) return;
    wrap.innerHTML = colors.map(function (entry) {
      return '<div class="color-chip' + (avoid ? " avoid-chip" : "") + '"><div class="color-dot" style="background:' + entry.hex + '"></div><span class="color-name">' + W.escapeHtml(entry.name) + "</span></div>";
    }).join("");
    wrap.querySelectorAll(".color-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.body.style.transition = "background 0.5s";
        document.body.style.background = (chip.querySelector(".color-dot").style.background || "#F8F5F0") + "15";
        setTimeout(function () { document.body.style.background = "var(--bg)"; }, 1200);
      });
    });
  }

  function renderSilhouettes() {
    var grid = document.querySelector(".silhouette-grid");
    if (!grid || !state.overview) return;
    grid.innerHTML = (state.overview.silhouettes || []).map(function (entry) {
      return '<div class="silhouette-card' + (entry.preferred ? " preferred" : "") + '"><div class="sil-icon">' + (entry.name === "H型" ? "📐" : entry.name === "V型" ? "🔺" : entry.name === "X型" ? "⏳" : entry.name === "宽松廓形" ? "🔷" : entry.name === "修身" ? "📏" : "🌊") + '</div><div class="sil-name">' + W.escapeHtml(entry.name) + '</div><div class="sil-desc">' + W.escapeHtml(entry.desc) + '</div>' + (entry.badge ? '<span class="sil-pref">' + W.escapeHtml(entry.badge) + "</span>" : "") + "</div>";
    }).join("");
  }

  function renderKeywords() {
    var cloud = document.querySelector(".keyword-cloud");
    if (!cloud || !state.overview) return;
    cloud.innerHTML = (state.overview.keywords || []).map(function (entry) {
      return '<span class="keyword kw-' + entry.tone + '">' + W.escapeHtml(entry.label) + "</span>";
    }).join("");
  }

  function renderRules() {
    var list = document.querySelector(".rules-list");
    if (!list || !state.overview) return;
    list.innerHTML = (state.overview.rules || []).map(function (entry, index) {
      return '<div class="rule-item"><div class="rule-num">' + (index + 1) + '</div><div class="rule-text">' + W.escapeHtml(entry) + "</div></div>";
    }).join("");
  }

  function renderNote() {
    if (!state.overview) return;
    var note = document.querySelector(".note-area p");
    var time = document.querySelector(".note-time");
    if (note) note.textContent = state.overview.personal_note;
    if (time) time.textContent = "最后编辑：" + state.overview.updated_at_label;
  }

  function renderAll() {
    renderHero();
    renderDNA();
    renderColorSection(".section-block:nth-child(2) .color-grid", state.overview.favorite_colors || [], false);
    renderColorSection(".section-block:nth-child(3) .color-grid", state.overview.avoid_colors || [], true);
    renderSilhouettes();
    renderKeywords();
    renderRules();
    renderNote();
  }

  function fetchOverview(withToast) {
    return api("", { method: "GET" }).then(function (data) {
      state.overview = data;
      renderAll();
      state.hasLoadedOnce = true;
      if (withToast) W.toast("风格画像已更新", "soft");
    }).catch(function (error) {
      if (withToast || state.hasLoadedOnce) {
        W.toast(error.message || "加载风格画像失败");
      }
      state.hasLoadedOnce = true;
    });
  }

  function bindEditors() {
    var buttons = document.querySelectorAll(".edit-btn");
    if (buttons[0]) {
      buttons[0].addEventListener("click", function () {
        W.openFormModal({
          title: "编辑喜欢颜色",
          submitLabel: "保存颜色",
          fields: [{ name: "favorite_colors", label: "喜欢颜色", value: (state.overview.profile.favorite_colors || []).join("，"), full: true }],
          note: "多个颜色用逗号分开，比如：驼色，深蓝，米白"
        }).then(function (values) {
          if (!values) return;
          patch({ favorite_colors: W.parseList(values.favorite_colors) }, "喜欢颜色已更新");
        });
      });
    }
    if (buttons[1]) {
      buttons[1].addEventListener("click", function () {
        W.openFormModal({
          title: "编辑避开颜色",
          submitLabel: "保存避开项",
          fields: [{ name: "avoid_colors", label: "避开颜色", value: (state.overview.profile.avoid_colors || []).join("，"), full: true }]
        }).then(function (values) {
          if (!values) return;
          patch({ avoid_colors: W.parseList(values.avoid_colors) }, "避开颜色已更新");
        });
      });
    }
    if (buttons[2]) {
      buttons[2].addEventListener("click", function () {
        W.openFormModal({
          title: "编辑偏好轮廓",
          submitLabel: "保存轮廓",
          fields: [
            { name: "favorite_silhouettes", label: "喜欢轮廓", value: (state.overview.profile.favorite_silhouettes || []).join("，"), full: true },
            { name: "avoid_silhouettes", label: "避开轮廓", value: (state.overview.profile.avoid_silhouettes || []).join("，"), full: true }
          ]
        }).then(function (values) {
          if (!values) return;
          patch({
            favorite_silhouettes: W.parseList(values.favorite_silhouettes),
            avoid_silhouettes: W.parseList(values.avoid_silhouettes)
          }, "轮廓偏好已更新");
        });
      });
    }
    if (buttons[3]) {
      buttons[3].addEventListener("click", function () {
        W.openFormModal({
          title: "编辑风格关键词",
          submitLabel: "保存关键词",
          fields: [
            { name: "style_keywords", label: "核心关键词", value: (state.overview.profile.style_keywords || []).join("，"), full: true },
            { name: "comfort_priorities", label: "舒适优先级", value: (state.overview.profile.comfort_priorities || []).join("，"), full: true }
          ]
        }).then(function (values) {
          if (!values) return;
          patch({
            style_keywords: W.parseList(values.style_keywords),
            comfort_priorities: W.parseList(values.comfort_priorities)
          }, "风格关键词已更新");
        });
      });
    }
    if (buttons[4]) {
      buttons[4].addEventListener("click", function () {
        W.openFormModal({
          title: "编辑衣橱规则",
          description: "一行一条，会直接影响推荐和筛选时的偏好表达。",
          submitLabel: "保存规则",
          fields: [{ name: "wardrobe_rules", label: "衣橱规则", type: "textarea", full: true, value: (state.overview.profile.wardrobe_rules || []).join("\n") }]
        }).then(function (values) {
          if (!values) return;
          patch({ wardrobe_rules: W.parseList(values.wardrobe_rules) }, "衣橱规则已保存");
        });
      });
    }
    if (buttons[5]) {
      buttons[5].addEventListener("click", editNote);
    }

    var fab = document.querySelector(".fab");
    if (fab) fab.onclick = editNote;
  }

  function editNote() {
    W.openFormModal({
      title: "编辑私人备注",
      submitLabel: "保存备注",
      fields: [{ name: "personal_note", label: "私人备注", type: "textarea", full: true, value: state.overview.profile.personal_note || state.overview.personal_note }]
    }).then(function (values) {
      if (!values) return;
      patch({ personal_note: values.personal_note }, "私人备注已更新");
    });
  }

  bindEditors();
  fetchOverview(false);
})();
