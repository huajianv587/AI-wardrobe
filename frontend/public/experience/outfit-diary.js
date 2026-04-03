(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var now = new Date();
  var state = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    overview: null,
    wardrobeItems: [],
    hasLoadedOnce: false,
    usingLocalPreview: false,
    activeMode: "calendar",
    selectedDay: now.getDate(),
    suitcaseLoading: false
  };

  var monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  var weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
  var STORAGE_KEY = "wenwen-experience-diary";
  var fallbackLooks = [
    {
      tags: ["轻通勤", "奶油系", "日常"],
      note: "这一套像把工作日轻轻放软了一点，拍照也很干净。",
      items: [
        { name: "奶油白衬衫", detail: "文文的衣橱 · 上衣 · 米白", color: "#f3ece3", emoji: "👔" },
        { name: "香草奶白半裙", detail: "文文的衣橱 · 下装 · 奶白", color: "#efe4d9", emoji: "👗" },
        { name: "通勤气质包", detail: "文文的衣橱 · 配饰 · 裸粉", color: "#d7c0b8", emoji: "👜" }
      ]
    },
    {
      tags: ["周末", "松弛感", "咖啡店"],
      note: "低压力但不随意的一套，很适合周末出门走走。",
      items: [
        { name: "草绿针织衫", detail: "文文的衣橱 · 上衣 · 草绿", color: "#cedcad", emoji: "🧶" },
        { name: "深蓝直筒牛仔裤", detail: "文文的衣橱 · 下装 · 深蓝", color: "#9cb5ca", emoji: "👖" },
        { name: "白色帆布鞋", detail: "文文的衣橱 · 鞋子 · 白色", color: "#f7f4ef", emoji: "👟" }
      ]
    },
    {
      tags: ["约会", "柔和感", "拍照"],
      note: "比较适合高光时刻的一天，整体气质会更温柔也更有存在感。",
      items: [
        { name: "玫粉吊带裙", detail: "文文的衣橱 · 连衣裙 · 玫粉", color: "#dfb1ac", emoji: "👗" },
        { name: "白色帆布鞋", detail: "文文的衣橱 · 鞋子 · 白色", color: "#f7f4ef", emoji: "👟" },
        { name: "通勤气质包", detail: "文文的衣橱 · 配饰 · 裸粉", color: "#d7c0b8", emoji: "👜" }
      ]
    },
    {
      tags: ["轻商务", "利落", "都市"],
      note: "在通勤和正式之间找到一个平衡点，是很好复用的一组搭配。",
      items: [
        { name: "天蓝条纹衬衫", detail: "文文的衣橱 · 上衣 · 天蓝", color: "#c6dde9", emoji: "👔" },
        { name: "深蓝直筒牛仔裤", detail: "文文的衣橱 · 下装 · 深蓝", color: "#9cb5ca", emoji: "👖" },
        { name: "焦糖色风衣", detail: "文文的衣橱 · 外套 · 焦糖", color: "#ceb089", emoji: "🧥" }
      ]
    },
    {
      tags: ["春风感", "文艺", "层次"],
      note: "这类带一点柔雾色的 look 很容易被记住，也很像现在的衣橱气质。",
      items: [
        { name: "薄荷连衣裙", detail: "文文的衣橱 · 连衣裙 · 薄荷绿", color: "#d2e3db", emoji: "👗" },
        { name: "白色帆布鞋", detail: "文文的衣橱 · 鞋子 · 白色", color: "#f7f4ef", emoji: "👟" },
        { name: "通勤气质包", detail: "文文的衣橱 · 配饰 · 裸粉", color: "#d7c0b8", emoji: "👜" }
      ]
    }
  ];

  function api(path, options) {
    return W.request("/api/v1/experience/outfit-diary" + path, options);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function refreshFx() {
    if (W.refreshEnhancements) W.refreshEnhancements();
  }

  function setLoading(loading) {
    document.body.dataset.diaryLoading = loading ? "true" : "false";
  }

  function setSelectedDay(day) {
    state.selectedDay = day;
    document.querySelectorAll(".day-cell.is-focus").forEach(function (node) {
      node.classList.remove("is-focus");
    });
    if (!day) return;
    var active = document.querySelector('.day-cell[data-day="' + day + '"]');
    if (active) active.classList.add("is-focus");
  }

  function animateValue(node, target, suffix) {
    if (!node) return;
    suffix = suffix || "";
    var currentText = String(node.textContent || "0");
    var parsed = parseInt(currentText.replace(/[^\d-]/g, ""), 10);
    var start = Number.isFinite(parsed) ? parsed : 0;
    var startTime = 0;
    var duration = 560;

    function frame(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min(1, (timestamp - startTime) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(start + (target - start) * eased);
      node.textContent = value + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function loadWardrobe() {
    return W.request("/api/v1/experience/wardrobe-management", { method: "GET" }).then(function (data) {
      state.wardrobeItems = data.items || [];
    }).catch(function () {
      state.wardrobeItems = [];
    });
  }

  function storageAvailable() {
    try {
      return !!window.localStorage;
    } catch (error) {
      return false;
    }
  }

  function readLocalDiary() {
    if (!storageAvailable()) return {};
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeLocalDiary(payload) {
    if (!storageAvailable()) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function diaryEntryKey(year, month, day) {
    return [year, month, day].join("-");
  }

  function emojiForCategory(category) {
    if (category === "tops") return "👔";
    if (category === "bottoms") return "👖";
    if (category === "outerwear") return "🧥";
    if (category === "dresses") return "👗";
    if (category === "shoes") return "👟";
    if (category === "accessories") return "👜";
    return "✨";
  }

  function colorForItem(item) {
    return item.color_hex || item.hex || item.color || "#eadfd5";
  }

  function buildLocalItemsFromWardrobe(itemIds) {
    var items = (itemIds || []).map(function (itemId) {
      return state.wardrobeItems.find(function (item) { return item.id === itemId; });
    }).filter(Boolean);

    if (!items.length) {
      return fallbackLooks[0].items.map(function (entry) {
        return Object.assign({}, entry);
      });
    }

    return items.slice(0, 3).map(function (item) {
      return {
        name: item.name,
        detail: (item.brand || "文文的衣橱") + " · " + (item.slot_label || item.category_label || "单品") + " · " + (item.color || "柔雾色"),
        color: colorForItem(item),
        emoji: emojiForCategory(item.category)
      };
    });
  }

  function buildFallbackOverview(year, month) {
    var daysInMonth = new Date(year, month, 0).getDate();
    var loggedDays = [2, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 27, 28];
    var details = {};

    loggedDays.filter(function (day) { return day <= daysInMonth; }).forEach(function (day, index) {
      var sample = fallbackLooks[index % fallbackLooks.length];
      details[String(day)] = {
        date_label: month + "月" + day + "日",
        items: sample.items.map(function (entry) {
          return Object.assign({}, entry);
        }),
        tags: sample.tags.slice(),
        note: sample.note
      };
    });

    var localDiary = readLocalDiary();
    Object.keys(localDiary).forEach(function (key) {
      var entry = localDiary[key];
      if (entry && entry.year === year && entry.month === month) {
        details[String(entry.day)] = {
          date_label: month + "月" + entry.day + "日",
          items: (entry.items || []).map(function (item) { return Object.assign({}, item); }),
          tags: entry.tags || [],
          note: entry.note || "这条穿搭先保存在本地预览里，等接口恢复后也可以继续同步。"
        };
        if (loggedDays.indexOf(entry.day) < 0) loggedDays.push(entry.day);
      }
    });

    loggedDays = loggedDays.filter(function (day) { return day <= daysInMonth; }).sort(function (a, b) { return a - b; });

    return {
      stats: {
        monthly_records: loggedDays.length,
        wear_rate: Math.min(100, Math.round(loggedDays.length / Math.max(1, daysInMonth) * 100)),
        favorite_items: 5,
        new_items: 3
      },
      calendar: {
        year: year,
        month: month,
        days_in_month: daysInMonth,
        logged_days: loggedDays,
        details: details
      },
      suitcase_defaults: {
        destination: "东京",
        days_label: "5天4晚",
        scene: "城市探索"
      }
    };
  }

  function syncTripDefaults(defaults) {
    defaults = defaults || {};
    if (byId("tripDest")) byId("tripDest").value = defaults.destination || "东京";
    if (byId("tripDays")) byId("tripDays").value = defaults.days_label || "5天4晚";
    if (byId("tripScene")) byId("tripScene").value = defaults.scene || "城市探索";
  }

  function renderStats() {
    if (!state.overview) return;
    var chips = document.querySelectorAll(".stats-bar .stat-chip");
    var stats = state.overview.stats || {};
    if (chips[0]) animateValue(chips[0].querySelector(".stat-num"), stats.monthly_records || 0);
    if (chips[1]) animateValue(chips[1].querySelector(".stat-num"), stats.wear_rate || 0, "%");
    if (chips[2]) animateValue(chips[2].querySelector(".stat-num"), stats.favorite_items || 0);
    if (chips[3]) animateValue(chips[3].querySelector(".stat-num"), stats.new_items || 0);
  }

  function renderCalendar() {
    if (!state.overview) return;
    var monthLabel = byId("monthLabel");
    var daysGrid = byId("daysGrid");
    var data = state.overview.calendar;
    var firstDay = new Date(state.year, state.month - 1, 1).getDay();
    var today = new Date();

    monthLabel.textContent = state.year + "年 " + monthNames[state.month - 1];

    var html = "";
    for (var i = 0; i < firstDay; i += 1) {
      html += '<div class="day-cell empty" aria-hidden="true"></div>';
    }

    for (var day = 1; day <= data.days_in_month; day += 1) {
      var hasOutfit = data.logged_days.indexOf(day) >= 0;
      var isToday = today.getFullYear() === state.year && today.getMonth() === state.month - 1 && today.getDate() === day;
      var classes = ["day-cell"];
      if (isToday) classes.push("today");
      if (hasOutfit) classes.push("has-outfit");
      if (state.selectedDay === day) classes.push("is-focus");
      html += '<div class="' + classes.join(" ") + '" data-day="' + day + '" onclick="openOutfit(' + day + ')" aria-label="' + state.month + "月" + day + '日"><span class="day-num">' + day + "</span></div>";
    }

    daysGrid.innerHTML = html;
    setSelectedDay(state.selectedDay);
    refreshFx();
  }

  function applyOverview(overview) {
    state.overview = overview;
    state.year = overview.calendar && overview.calendar.year ? overview.calendar.year : state.year;
    state.month = overview.calendar && overview.calendar.month ? overview.calendar.month : state.month;
    syncTripDefaults(overview.suitcase_defaults);
    renderStats();
    renderCalendar();
  }

  function renderOutfit(day) {
    if (!state.overview || !state.overview.calendar) return;
    var detail = state.overview.calendar.details[String(day)];
    if (!detail) {
      openEmptyOutfit(day);
      return;
    }

    var date = new Date(state.year, state.month - 1, day);
    byId("panelDate").textContent = detail.date_label + " 周" + weekdayNames[date.getDay()];
    byId("outfitItems").innerHTML = (detail.items || []).map(function (item, index) {
      return '' +
        '<div class="outfit-item" style="animation-delay:' + (index * 0.12) + 's">' +
          '<div class="item-thumb" style="background:' + item.color + '">' + item.emoji + '</div>' +
          '<div class="item-info"><h3>' + W.escapeHtml(item.name) + '</h3><p>' + W.escapeHtml(item.detail) + "</p></div>" +
        "</div>";
    }).join("");
    byId("outfitTags").innerHTML = (detail.tags || []).map(function (tag) {
      return "<span>" + W.escapeHtml(tag) + "</span>";
    }).join("");

    var note = byId("outfitNote");
    note.style.display = "";
    note.textContent = "💭 " + (detail.note || "这一天被轻轻记住了。");
    byId("outfitOverlay").classList.add("show");
    setSelectedDay(day);
    refreshFx();

    setTimeout(function () {
      document.querySelectorAll(".outfit-item").forEach(function (entry, index) {
        setTimeout(function () { entry.classList.add("fly-in"); }, index * 90);
      });
    }, 120);
  }

  function recordOutfitForDay(day) {
    var defaultIds = state.wardrobeItems.slice(0, 3).map(function (item) { return item.id; });
    W.openFormModal({
      title: "记录当天穿搭",
      description: "会自动从当前衣橱挑选基础单品写入，也可以先用作日志占位。",
      submitLabel: "写入日历",
      fields: [
        { name: "outfit_name", label: "穿搭标题", value: "今日穿搭" },
        { name: "occasion", label: "场景", value: "日常通勤" },
        { name: "note", label: "备注", type: "textarea", full: true, value: "今天想要轻一点、干净一点的感觉。" }
      ],
      note: "保存后会立刻回写到月历，并可重新点进当天查看详情。"
    }).then(function (values) {
      if (!values) return;
      api("/logs", {
        method: "POST",
        body: JSON.stringify({
          day: day,
          month: state.month,
          year: state.year,
          outfit_name: values.outfit_name,
          occasion: values.occasion,
          item_ids: defaultIds,
          note: values.note
        })
      }).then(function () {
        fetchOverview(false).then(function () {
          renderOutfit(day);
          W.toast("当天穿搭已写入日志", "soft");
        });
      }).catch(function () {
        var localDiary = readLocalDiary();
        localDiary[diaryEntryKey(state.year, state.month, day)] = {
          year: state.year,
          month: state.month,
          day: day,
          note: values.note,
          tags: [values.occasion || "日常", "本地预览"],
          items: buildLocalItemsFromWardrobe(defaultIds)
        };
        writeLocalDiary(localDiary);
        state.usingLocalPreview = true;
        applyOverview(buildFallbackOverview(state.year, state.month));
        renderOutfit(day);
        W.toast("接口暂时未连接，已先保存到本地穿搭日志", "soft");
      });
    });
  }

  function renderEmptyDay(day) {
    byId("outfitItems").innerHTML = '' +
      '<div style="text-align:center;padding:40px 0;">' +
        '<div style="font-size:48px;margin-bottom:12px;">👗</div>' +
        '<p style="color:var(--text-light);font-size:14px;">今天还没有记录穿搭</p>' +
        '<button id="recordOutfitBtn" type="button" style="margin-top:16px;padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-family:inherit;font-size:13px;cursor:pointer;">+ 记录今日穿搭</button>' +
      "</div>";
    byId("outfitTags").innerHTML = "";
    byId("outfitNote").style.display = "none";
    byId("outfitOverlay").classList.add("show");
    var button = byId("recordOutfitBtn");
    if (button) {
      button.addEventListener("click", function () {
        recordOutfitForDay(day);
      });
    }
    refreshFx();
  }

  function openEmptyOutfit(day) {
    var date = new Date(state.year, state.month - 1, day);
    byId("panelDate").textContent = state.month + "月" + day + "日 周" + weekdayNames[date.getDay()];
    setSelectedDay(day);
    renderEmptyDay(day);
  }

  function renderSuitcase(result) {
    byId("suitcaseResult").style.display = "block";
    byId("packCount").textContent = "共 " + (result.packed_items || []).length + " 类";
    var grid = byId("suitcaseGrid");
    grid.innerHTML = (result.packed_items || []).map(function (item, index) {
      return '<div class="suitcase-item" style="animation-delay:' + (index * 0.08) + 's"><div class="item-emoji">' + item.emoji + '</div><div class="item-name">' + W.escapeHtml(item.name) + '</div><div class="item-qty">' + W.escapeHtml(item.qty) + "</div></div>";
    }).join("");

    setTimeout(function () {
      grid.querySelectorAll(".suitcase-item").forEach(function (entry, index) {
        setTimeout(function () { entry.classList.add("packed"); }, index * 60);
      });
    }, 80);

    byId("dayPlans").innerHTML = (result.day_plans || []).map(function (plan) {
      return '<div class="day-plan-card"><h4>' + W.escapeHtml(plan.title) + '</h4><div class="day-plan-items">' + (plan.items || []).map(function (item) { return "<span>" + W.escapeHtml(item) + "</span>"; }).join("") + "</div></div>";
    }).join("");
    refreshFx();
  }

  function fetchOverview(withToast) {
    setLoading(true);
    return api("?year=" + state.year + "&month=" + state.month, { method: "GET" }).then(function (data) {
      state.usingLocalPreview = false;
      applyOverview(data);
      state.hasLoadedOnce = true;
      if (withToast) W.toast("穿搭日志已更新", "soft");
    }).catch(function () {
      state.usingLocalPreview = true;
      applyOverview(buildFallbackOverview(state.year, state.month));
      if (withToast || state.hasLoadedOnce) {
        W.toast("当前先展示本地穿搭日志预览，后端恢复后会自动切回", "soft");
      }
      state.hasLoadedOnce = true;
    }).finally(function () {
      setLoading(false);
    });
  }

  function setMode(mode, button) {
    state.activeMode = mode;
    document.querySelectorAll(".mode-btn").forEach(function (node) {
      node.classList.remove("active");
    });
    if (button) button.classList.add("active");
    byId("calendarSection").style.display = mode === "calendar" ? "block" : "none";
    byId("suitcaseSection").classList.toggle("show", mode === "suitcase");
    if (mode === "suitcase") {
      refreshFx();
    }
  }

  function setSuitcaseLoading(loading) {
    state.suitcaseLoading = loading;
    var button = document.querySelector(".generate-btn");
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "AI 正在规划中..." : "✨ AI 智能打包";
  }

  window.changeMonth = function (direction) {
    state.month += direction;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    if (state.month < 1) {
      state.month = 12;
      state.year -= 1;
    }
    state.selectedDay = null;
    fetchOverview(false);
  };

  window.openOutfit = function (day) {
    renderOutfit(day);
  };

  window.closePanel = function () {
    byId("outfitOverlay").classList.remove("show");
    byId("outfitNote").style.display = "";
  };

  window.closeOverlay = function (event) {
    if (event.target === event.currentTarget) window.closePanel();
  };

  window.switchMode = function (mode) {
    var eventRef = window.event;
    setMode(mode, eventRef && eventRef.currentTarget ? eventRef.currentTarget : null);
  };

  window.generateSuitcase = function () {
    if (state.suitcaseLoading) return;
    setSuitcaseLoading(true);
    api("/suitcase", {
      method: "POST",
      body: JSON.stringify({
        destination: byId("tripDest").value.trim() || "东京",
        days_label: byId("tripDays").value,
        scene: byId("tripScene").value
      })
    }).then(function (result) {
      renderSuitcase(result.result || {});
      W.toast(result.message || "行李箱模式已生成", "soft");
    }).catch(function () {
      var destination = byId("tripDest").value.trim() || "东京";
      var dayCount = parseInt((byId("tripDays").value || "5").match(/\d+/), 10) || 5;
      var packedItems = buildLocalItemsFromWardrobe(state.wardrobeItems.slice(0, 6).map(function (item) { return item.id; })).map(function (item, index) {
        return {
          emoji: item.emoji,
          name: item.name,
          qty: index < 3 && dayCount >= 5 ? "×2" : "×1"
        };
      });
      var dayPlans = [];
      var divisor = Math.max(1, packedItems.length);
      for (var index = 0; index < dayCount; index += 1) {
        dayPlans.push({
          title: "Day " + (index + 1) + " · " + destination,
          items: packedItems.slice(index % divisor).concat(packedItems.slice(0, index % divisor)).slice(0, 3).map(function (item) {
            return item.emoji + " " + item.name;
          })
        });
      }
      renderSuitcase({ packed_items: packedItems, day_plans: dayPlans });
      W.toast("接口未连接，已先生成本地行李箱预览", "soft");
    }).finally(function () {
      setSuitcaseLoading(false);
    });
  };

  function bootstrap() {
    setLoading(true);
    setMode("calendar", document.querySelector(".mode-btn.active"));
    loadWardrobe().then(function () {
      return fetchOverview(false);
    }).then(function () {
      if (state.selectedDay && state.overview && state.overview.calendar && state.overview.calendar.logged_days.indexOf(state.selectedDay) >= 0) {
        setSelectedDay(state.selectedDay);
      }
    }).finally(function () {
      setLoading(false);
      refreshFx();
    });
  }

  bootstrap();
})();
