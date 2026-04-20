(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var state = {
    overview: null,
    activeSeason: "spring",
    hasLoadedOnce: false
  };

  function api(path, options) {
    return W.request("/api/v1/experience/closet-analysis" + path, options);
  }

  function resolvePreviewUrl(item) {
    var raw = (item && (item.thumbnail_url || item.processed_image_url || item.image_url)) || "";
    return W.resolveAssetUrl ? W.resolveAssetUrl(raw) : raw;
  }

  function renderRepeatThumb(item, className) {
    var imageUrl = resolvePreviewUrl(item);
    if (imageUrl) {
      return '<div class="' + className + '"><img src="' + W.escapeHtml(imageUrl) + '" alt="' + W.escapeHtml(item.name || "衣物缩略图") + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" /></div>';
    }
    return '<div class="' + className + '" style="background:' + (item.color_hex || item.color || "#eadfd5") + '">' + (item.emoji || "✨") + "</div>";
  }

  function seasonQuery() {
    return state.activeSeason ? "?season=" + encodeURIComponent(state.activeSeason) : "";
  }

  function polarPoint(index, radius, center) {
    var angle = (-90 + index * 60) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  }

  function buildRadarPolygon(values, minRadius, maxRadius, center) {
    return values.map(function (value, index) {
      var pct = Math.max(0, Math.min(Number(value || 0), 100));
      var point = polarPoint(index, minRadius + (pct / 100) * (maxRadius - minRadius), center);
      return point.x.toFixed(1) + "," + point.y.toFixed(1);
    }).join(" ");
  }

  function renderGapRadar(entries, gapScore) {
    var shell = document.querySelector(".radar-chart");
    if (!shell) return;
    var categories = (entries || []).slice(0, 6);
    var palette = ["#f4aac7", "#e7c394", "#baa4df", "#a8bfdc", "#eab3b8", "#bdd8bb"];
    while (categories.length < 6) {
      categories.push({
        name: "扩展",
        icon: "✦",
        pct: 18,
        color: palette[categories.length % palette.length],
        count: 0,
        max: 1
      });
    }

    var sourceEntries = (entries || []).slice();
    var focus = sourceEntries.length
      ? sourceEntries.slice().sort(function (a, b) { return Number(a.pct || 0) - Number(b.pct || 0); })[0]
      : categories[0];
    var center = 180;
    var values = categories.map(function (entry) { return Number(entry.pct || 0); });
    var rings = [44, 70, 96, 122, 148].map(function (radius) {
      return buildRadarPolygon([100, 100, 100, 100, 100, 100], radius, radius, center);
    });
    var areaPoints = buildRadarPolygon(values, 38, 118, center);
    var axes = categories.map(function (_, index) {
      var point = polarPoint(index, 148, center);
      return '<line x1="' + center + '" y1="' + center + '" x2="' + point.x.toFixed(1) + '" y2="' + point.y.toFixed(1) + '"></line>';
    }).join("");
    var badges = categories.map(function (entry, index) {
      var point = polarPoint(index, 122, center);
      var tone = palette[index % palette.length];
      return '<div class="radar-premium-axis-badge" style="left:' + ((point.x / 360) * 100).toFixed(2) + '%;top:' + ((point.y / 360) * 100).toFixed(2) + '%;--axis-tone:' + W.escapeHtml(tone) + '"><span>' + W.escapeHtml(entry.icon || "✦") + '</span></div>';
    }).join("");
    var labels = categories.map(function (entry, index) {
      var point = polarPoint(index, 156, center);
      return '<div class="radar-premium-label" style="left:' + ((point.x / 360) * 100).toFixed(2) + '%;top:' + ((point.y / 360) * 100).toFixed(2) + '%;"><strong>' + W.escapeHtml(entry.name || "分类") + '</strong></div>';
    }).join("");
    var nodes = categories.map(function (entry, index) {
      var pct = Math.max(0, Math.min(Number(entry.pct || 0), 100));
      var tone = palette[index % palette.length];
      var point = polarPoint(index, 38 + (pct / 100) * 80, center);
      return '' +
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="13" class="radar-premium-node-halo" style="fill:' + W.escapeHtml(tone) + '"></circle>' +
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="6.5" class="radar-premium-node-dot" style="fill:' + W.escapeHtml(tone) + '"></circle>';
    }).join("");
    var heartLevel = Math.max(1, Math.min(6, Math.round((100 - Number(gapScore || 0)) / 16) + 1));
    var hearts = [0, 1, 2, 3, 4, 5].map(function (index) {
      return '<span class="radar-premium-heart' + (index < heartLevel ? ' is-active level-' + (index + 1) : "") + '">❤</span>';
    }).join("");
    var footCards = categories.map(function (entry, index) {
      var tone = palette[index % palette.length];
      return '<span class="radar-premium-chip"><i style="background:' + W.escapeHtml(tone) + '"></i>' + W.escapeHtml(entry.name || "分类") + ' ' + W.escapeHtml(String(entry.count || 0)) + '/' + W.escapeHtml(String(entry.max || 0)) + '</span>';
    }).join("");

    shell.innerHTML = '' +
      '<div class="radar-premium-shell">' +
        '<div class="radar-premium-ribbon"><span>热力图</span></div>' +
        '<div class="radar-premium-stage">' +
          '<div class="radar-premium-blush blush-a"></div>' +
          '<div class="radar-premium-blush blush-b"></div>' +
          '<div class="radar-premium-spark spark-a"></div>' +
          '<div class="radar-premium-spark spark-b"></div>' +
          '<div class="radar-premium-spark spark-c"></div>' +
          '<svg viewBox="0 0 360 360" class="radar-premium-svg" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="gapStroke" x1="8%" y1="12%" x2="82%" y2="88%"><stop offset="0%" stop-color="#f5abc5"/><stop offset="58%" stop-color="#f08da8"/><stop offset="100%" stop-color="#df7995"/></linearGradient>' +
              '<radialGradient id="gapFill" cx="50%" cy="46%" r="68%"><stop offset="0%" stop-color="rgba(255,249,252,.94)"/><stop offset="42%" stop-color="rgba(248,186,206,.58)"/><stop offset="100%" stop-color="rgba(232,133,164,.22)"/></radialGradient>' +
              '<radialGradient id="gapCore" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(255,255,255,.96)"/><stop offset="55%" stop-color="rgba(255,219,228,.78)"/><stop offset="100%" stop-color="rgba(244,168,194,.16)"/></radialGradient>' +
              '<filter id="gapGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '</defs>' +
            '<g class="radar-premium-grid">' +
              rings.map(function (points, index) {
                return '<polygon points="' + points + '" class="radar-premium-ring ring-' + index + '"></polygon>';
              }).join("") +
              axes +
            '</g>' +
            '<polygon points="' + areaPoints + '" class="radar-premium-area-shadow"></polygon>' +
            '<polygon points="' + areaPoints + '" class="radar-premium-area"></polygon>' +
            '<polygon points="' + areaPoints + '" class="radar-premium-outline"></polygon>' +
            '<polygon points="' + rings[3] + '" class="radar-premium-center-hex"></polygon>' +
            '<circle cx="' + center + '" cy="' + center + '" r="26" class="radar-premium-center-light"></circle>' +
            nodes +
          '</svg>' +
          '<div class="radar-premium-core-glow"></div>' +
          badges +
          labels +
        '</div>' +
        '<div class="radar-premium-scale"><span class="radar-premium-scale-edge">低</span><div class="radar-premium-hearts">' + hearts + '</div><span class="radar-premium-scale-edge">高</span></div>' +
        '<div class="radar-premium-footnote"><span>' + W.escapeHtml(focus.icon || "✦") + '</span> 优先补齐 ' + W.escapeHtml(focus.name || "重点分类") + ' · ' + W.escapeHtml(String(focus.count || 0)) + '/' + W.escapeHtml(String(focus.max || 0)) + ' 件</div>' +
        '<div class="radar-premium-metrics">' + footCards + '</div>' +
      '</div>';
  }

  function renderGap() {
    if (!state.overview) return;
    var gapScore = state.overview.gap_score || 0;
    document.getElementById("gapScore").textContent = gapScore;
    document.getElementById("gapMeter").style.width = gapScore + "%";
    document.getElementById("catGaps").innerHTML = (state.overview.category_gaps || []).map(function (entry) {
      return '<div class="cat-gap">' +
        '<div class="cat-icon">' + entry.icon + '</div>' +
        '<div class="cat-name">' + W.escapeHtml(entry.name) + '</div>' +
        '<div class="cat-status">' + entry.count + "/" + entry.max + " 件</div>" +
        '<div class="cat-bar"><div class="cat-bar-fill" style="width:' + entry.pct + '%;background:' + entry.color + '"></div></div>' +
      "</div>";
    }).join("");
    var suggestions = document.querySelector(".gap-suggest ul");
    if (suggestions) {
      suggestions.innerHTML = (state.overview.gap_suggestions || []).map(function (entry) {
        return "<li>" + W.escapeHtml(entry) + "</li>";
      }).join("");
    }
    renderGapRadar(state.overview.category_gaps, gapScore);
  }

  function renderRepeat() {
    if (!state.overview) return;
    var heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = (state.overview.heatmap || []).map(function (cell) {
      if (typeof cell === "number") {
        return '<div class="heatmap-cell" style="background:rgba(184,144,104,' + (0.12 + cell * 0.12) + ')"></div>';
      }
      if (!cell || cell.empty) {
        return '<div class="heatmap-cell is-empty"></div>';
      }
      var overlayOpacity = Math.max(0.14, Math.min(0.72, 0.12 + (Number(cell.level || 0) * 0.12)));
      var shadow = Math.max(8, (Number(cell.level || 0) + 1) * 4);
      return '<div class="heatmap-cell is-rich" style="box-shadow:0 12px ' + shadow + 'px rgba(115,82,58,' + Math.max(0.08, overlayOpacity * 0.22) + ')" title="' + W.escapeHtml(cell.title || ((cell.name || "单品") + " · " + (cell.count || 0) + " 次")) + '">' +
        renderRepeatThumb(cell, "heatmap-media") +
        '<div class="heatmap-overlay" style="background:rgba(92,63,42,' + overlayOpacity + ')"></div>' +
        '<div class="heatmap-count">' + (cell.count || 0) + "次</div>" +
      "</div>";
    }).join("");

    var repeatCards = document.querySelectorAll("#sec-repeat .analysis-card");
    if (repeatCards[1]) {
      var header = repeatCards[1].querySelector(".card-badge");
      if (header) header.textContent = state.overview.repeat_items.length + " 件高频";
      repeatCards[1].querySelectorAll(".repeat-item").forEach(function (node) { node.remove(); });
      repeatCards[1].insertAdjacentHTML("beforeend", (state.overview.repeat_items || []).map(function (item) {
        return '<div class="repeat-item">' + renderRepeatThumb(item, "repeat-thumb") + '<div class="repeat-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p></div><div class="repeat-count">' + item.count + '<small>次/月</small></div></div>';
      }).join(""));
    }
    if (repeatCards[2]) {
      var badge = repeatCards[2].querySelector(".card-badge");
      if (badge) badge.textContent = state.overview.low_use_items.length + " 件低频";
      repeatCards[2].querySelectorAll(".repeat-item").forEach(function (node) { node.remove(); });
      repeatCards[2].insertAdjacentHTML("beforeend", (state.overview.low_use_items || []).map(function (item) {
        return '<div class="repeat-item" style="background:var(--idle-bg);">' + renderRepeatThumb(item, "repeat-thumb") + '<div class="repeat-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p></div><div class="repeat-count" style="color:var(--idle);">' + item.count + '<small>次/月</small></div></div>';
      }).join(""));
    }
  }

  function renderCare() {
    if (!state.overview) return;
    var cards = document.querySelectorAll("#sec-care .analysis-card");
    var sections = [state.overview.care.urgent || [], state.overview.care.normal || [], state.overview.care.done || []];
    cards.forEach(function (card, index) {
      card.querySelectorAll(".care-item").forEach(function (node) { node.remove(); });
      card.insertAdjacentHTML("beforeend", sections[index].map(function (item) {
        var toneClass = index === 0 ? "urgent" : index === 1 ? "normal" : "done";
        var action = index === 2
          ? '<span style="font-size:18px;">✅</span>'
          : index === 0
            ? '<button class="care-action mark-done" data-id="' + item.id + '">✓ 已洗</button>'
            : '<button class="care-action remind' + (item.reminder_set ? " is-active" : "") + '" data-id="' + item.id + '">' + (item.reminder_set ? "已提醒" : "设提醒") + '</button>';
        return '<div class="care-item ' + toneClass + '"><div class="care-emoji">' + item.emoji + '</div><div class="care-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p></div>' + action + '</div>';
      }).join(""));
    });

    document.querySelectorAll(".care-action.mark-done").forEach(function (button) {
      button.addEventListener("click", function () {
        api("/care/" + button.dataset.id + "/mark-done", { method: "POST" }).then(function (result) {
          W.toast(result.message || "已完成洗护", "soft");
          fetchOverview(false);
        }).catch(function (error) {
          W.toast(error.message || "更新失败");
        });
      });
    });

    document.querySelectorAll(".care-action.remind").forEach(function (button) {
      button.addEventListener("click", function () {
        api("/care/" + button.dataset.id + "/remind", { method: "POST" }).then(function (result) {
          W.toast(result.message || "保养提醒已加入你的下一轮整理清单", "soft");
          fetchOverview(false);
        }).catch(function (error) {
          W.toast(error.message || "提醒设置失败");
        });
      });
    });
  }

  function renderSeason() {
    if (!state.overview) return;
    state.activeSeason = (state.overview.season && state.overview.season.active) || state.activeSeason;
    document.querySelectorAll(".season-tab").forEach(function (tab) {
      var key = tab.getAttribute("onclick") && tab.getAttribute("onclick").match(/'([^']+)'/);
      tab.classList.toggle("active", !!(key && key[1] === state.activeSeason));
    });
    var cards = document.querySelectorAll("#sec-season .analysis-card");
    if (cards[0]) {
      var badge = cards[0].querySelector(".card-badge");
      if (badge) badge.textContent = state.overview.season.transition;
      var text = cards[0].querySelector("p");
      if (text) text.textContent = state.overview.season.summary || state.overview.reminders.season_prompt || "根据最近天气变化，适合给衣橱做一轮轻换季。";
      var items = cards[0].querySelectorAll(".care-item");
      if (items[0]) items[0].querySelector("p").textContent = (state.overview.season.store || []).join("、") + " → 建议收纳整理";
      if (items[1]) items[1].querySelector("p").textContent = (state.overview.season.bring_out || []).join("、") + " → 建议取出上架";
    }
    if (cards[1]) {
      var badgeIdle = cards[1].querySelector(".card-badge");
      if (badgeIdle) badgeIdle.textContent = state.overview.idle_items.length + " 件超90天";
      cards[1].querySelectorAll(".idle-item").forEach(function (node) { node.remove(); });
      cards[1].insertAdjacentHTML("beforeend", (state.overview.idle_items || []).map(function (item) {
        var followUp = item.selected_action_label
          ? '<div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.55);font-size:11px;line-height:1.6;color:var(--text-mid)"><strong style="display:block;color:var(--accent);margin-bottom:3px;font-weight:600">' + W.escapeHtml(item.selected_action_label) + '</strong>' + W.escapeHtml(item.selected_action_detail || "下一步会继续帮你把这件单品处理完。") + "</div>"
          : "";
        return '<div class="idle-item"><div class="idle-thumb">' + item.emoji + '</div><div class="idle-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p><div class="action-row"><span class="action-pill' + (item.selected_action === "style" ? " is-active" : "") + '" style="' + (item.selected_action === "style" ? "border-color:var(--accent);color:var(--accent);background:rgba(251,245,239,.95);font-weight:600" : "") + '" data-id="' + item.id + '" data-action="style">搭配推荐</span><span class="action-pill' + (item.selected_action === "resell" ? " is-active" : "") + '" style="' + (item.selected_action === "resell" ? "border-color:var(--accent);color:var(--accent);background:rgba(251,245,239,.95);font-weight:600" : "") + '" data-id="' + item.id + '" data-action="resell">二手转售</span><span class="action-pill' + (item.selected_action === "donate" ? " is-active" : "") + '" style="' + (item.selected_action === "donate" ? "border-color:var(--accent);color:var(--accent);background:rgba(251,245,239,.95);font-weight:600" : "") + '" data-id="' + item.id + '" data-action="donate">捐赠</span></div>' + followUp + '</div><div class="idle-days"><div class="num">' + item.idle_days + '</div><div class="label">天未穿</div></div></div>';
      }).join(""));
      cards[1].querySelectorAll(".action-pill").forEach(function (pill) {
        pill.addEventListener("click", function () {
          api("/idle/" + pill.dataset.id + "/action", {
            method: "POST",
            body: JSON.stringify({ action: pill.dataset.action })
          }).then(function (result) {
            W.toast(result.message || "已记录动作", "soft");
            fetchOverview(false);
          }).catch(function (error) {
            W.toast(error.message || "记录失败");
          });
        });
      });
    }
    if (cards[2]) {
      cards[2].querySelector("div[style*='font-family']").textContent = "¥" + state.overview.idle_value;
    }
  }

  function fetchOverview(withToast) {
    return api(seasonQuery(), { method: "GET" }).then(function (data) {
      state.overview = data;
      renderGap();
      renderRepeat();
      renderCare();
      renderSeason();
      state.hasLoadedOnce = true;
      if (withToast) W.toast("衣橱分析已刷新", "soft");
    }).catch(function (error) {
      if (withToast || state.hasLoadedOnce) {
        W.toast(error.message || "加载分析失败");
      }
      state.hasLoadedOnce = true;
    });
  }

  window.showTab = function (id, button) {
    document.querySelectorAll(".section").forEach(function (section) { section.classList.remove("show"); });
    document.querySelectorAll(".tab-btn").forEach(function (tab) { tab.classList.remove("active"); });
    document.getElementById("sec-" + id).classList.add("show");
    if (button) button.classList.add("active");
  };

  window.animateScore = function () {
    renderGap();
  };

  window.markDone = function (button) {
    var careItem = button.closest(".care-item");
    var actionButton = careItem.querySelector(".care-action");
    if (actionButton) actionButton.click();
  };

  window.selectSeason = function (element, season) {
    state.activeSeason = season || state.activeSeason;
    document.querySelectorAll(".season-tab").forEach(function (tab) { tab.classList.remove("active"); });
    element.classList.add("active");
    fetchOverview(false).then(function () {
      W.toast("已切换到 " + ((state.overview && state.overview.season && state.overview.season.label) || state.activeSeason) + " 的换季视角", "soft");
    });
  };

  fetchOverview(false);
})();
