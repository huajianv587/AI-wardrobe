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
  }

  function renderRepeat() {
    if (!state.overview) return;
    var heatmap = document.getElementById("heatmap");
    var heatColors = ["#F0E8DE", "#E8D8C8", "#D8C0A8", "#C8A888", "#B89068", "#A87848"];
    heatmap.innerHTML = (state.overview.heatmap || []).map(function (level) {
      return '<div class="heatmap-cell" style="background:' + heatColors[Math.max(0, Math.min(level, heatColors.length - 1))] + '"></div>';
    }).join("");

    var repeatCards = document.querySelectorAll("#sec-repeat .analysis-card");
    if (repeatCards[1]) {
      var header = repeatCards[1].querySelector(".card-badge");
      if (header) header.textContent = state.overview.repeat_items.length + " 件高频";
      repeatCards[1].querySelectorAll(".repeat-item").forEach(function (node) { node.remove(); });
      repeatCards[1].insertAdjacentHTML("beforeend", (state.overview.repeat_items || []).map(function (item) {
        return '<div class="repeat-item"><div class="repeat-emoji">' + item.emoji + '</div><div class="repeat-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p></div><div class="repeat-count">' + item.count + '<small>次/月</small></div></div>';
      }).join(""));
    }
    if (repeatCards[2]) {
      var badge = repeatCards[2].querySelector(".card-badge");
      if (badge) badge.textContent = state.overview.low_use_items.length + " 件低频";
      repeatCards[2].querySelectorAll(".repeat-item").forEach(function (node) { node.remove(); });
      repeatCards[2].insertAdjacentHTML("beforeend", (state.overview.low_use_items || []).map(function (item) {
        return '<div class="repeat-item" style="background:var(--idle-bg);"><div class="repeat-emoji">' + item.emoji + '</div><div class="repeat-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p></div><div class="repeat-count" style="color:var(--idle);">' + item.count + '<small>次/月</small></div></div>';
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
    var cards = document.querySelectorAll("#sec-season .analysis-card");
    if (cards[0]) {
      var badge = cards[0].querySelector(".card-badge");
      if (badge) badge.textContent = state.overview.season.transition;
      var text = cards[0].querySelector("p");
      if (text) text.textContent = state.overview.reminders.season_prompt || "根据最近天气变化，适合给衣橱做一轮轻换季。";
      var items = cards[0].querySelectorAll(".care-item");
      if (items[0]) items[0].querySelector("p").textContent = (state.overview.season.store || []).join("、") + " → 建议收纳整理";
      if (items[1]) items[1].querySelector("p").textContent = (state.overview.season.bring_out || []).join("、") + " → 建议取出上架";
    }
    if (cards[1]) {
      var badgeIdle = cards[1].querySelector(".card-badge");
      if (badgeIdle) badgeIdle.textContent = state.overview.idle_items.length + " 件超90天";
      cards[1].querySelectorAll(".idle-item").forEach(function (node) { node.remove(); });
      cards[1].insertAdjacentHTML("beforeend", (state.overview.idle_items || []).map(function (item) {
        return '<div class="idle-item"><div class="idle-thumb">' + item.emoji + '</div><div class="idle-info"><h4>' + W.escapeHtml(item.name) + '</h4><p>' + W.escapeHtml(item.detail) + '</p><div class="action-row"><span class="action-pill" data-id="' + item.id + '" data-action="style">搭配推荐</span><span class="action-pill" data-id="' + item.id + '" data-action="resell">二手转售</span><span class="action-pill" data-id="' + item.id + '" data-action="donate">捐赠</span></div></div><div class="idle-days"><div class="num">' + item.idle_days + '</div><div class="label">天未穿</div></div></div>';
      }).join(""));
      cards[1].querySelectorAll(".action-pill").forEach(function (pill) {
        pill.addEventListener("click", function () {
          api("/idle/" + pill.dataset.id + "/action", {
            method: "POST",
            body: JSON.stringify({ action: pill.dataset.action })
          }).then(function (result) {
            W.toast(result.message || "已记录动作", "soft");
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
    return api("", { method: "GET" }).then(function (data) {
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

  window.selectSeason = function (element) {
    state.activeSeason = element.textContent.trim();
    document.querySelectorAll(".season-tab").forEach(function (tab) { tab.classList.remove("active"); });
    element.classList.add("active");
    W.toast("已切换到 " + state.activeSeason + " 的换季视角");
  };

  fetchOverview(false);
})();
