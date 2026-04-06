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

  function resolvePreviewUrl(item) {
    var raw = (item && (item.thumbnail_url || item.processed_image_url || item.image_url)) || "";
    return W.resolveAssetUrl ? W.resolveAssetUrl(raw) : raw;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function encodeItemCard(item) {
    return encodeURIComponent(JSON.stringify(item || {}));
  }

  function renderItemThumb(item, className) {
    var shellStyle = "";
    if (className === "item-card-thumb") {
      shellStyle = ' style="width:88px;height:88px;border-radius:24px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + colorForItem(item) + ';font-size:36px"';
    } else if (className === "item-plan-thumb") {
      shellStyle = ' style="width:28px;height:28px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + colorForItem(item) + ';font-size:16px"';
    }
    var imageUrl = resolvePreviewUrl(item);
    if (imageUrl) {
      return '<div class="' + className + ' thumb-image"' + shellStyle + '><img src="' + escapeAttr(imageUrl) + '" alt="' + escapeAttr(item.name || "衣物缩略图") + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" /></div>';
    }
    return '<div class="' + className + '"' + (shellStyle || ' style="background:' + colorForItem(item) + '"') + '>' + (item.emoji || "✨") + "</div>";
  }

  function openItemCard(item) {
    if (!item) return;
    var tags = (item.tags || []).map(function (tag) {
      return '<span style="display:inline-flex;align-items:center;min-height:24px;padding:0 10px;border-radius:999px;background:rgba(255,248,242,.94);font-size:11px;color:var(--text-mid)">' + W.escapeHtml(tag) + "</span>";
    }).join("");
    var occasions = (item.occasions || []).map(function (entry) {
      return '<span style="display:inline-flex;align-items:center;min-height:24px;padding:0 10px;border-radius:999px;background:rgba(239,245,241,.94);font-size:11px;color:#6f8c79">' + W.escapeHtml(entry) + "</span>";
    }).join("");
    var mask = document.createElement("div");
    mask.style.cssText = "position:fixed;inset:0;z-index:420;display:flex;align-items:center;justify-content:center;background:rgba(24,16,12,.18);backdrop-filter:blur(10px);padding:16px";
    mask.innerHTML = '' +
      '<div style="width:min(100%,420px);border-radius:24px;padding:20px;background:linear-gradient(180deg,rgba(255,252,249,.98),rgba(255,247,241,.94));box-shadow:0 26px 54px rgba(24,16,12,.16);border:1px solid rgba(190,123,111,.14);position:relative">' +
        '<button type="button" data-close style="position:absolute;right:14px;top:14px;width:34px;height:34px;border:none;border-radius:999px;background:rgba(255,255,255,.72);font-size:18px;cursor:pointer;color:var(--text-mid)">×</button>' +
        '<div style="display:flex;gap:14px;align-items:flex-start">' +
          renderItemThumb(item, "item-card-thumb") +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:20px;font-weight:600;color:var(--text);margin-bottom:6px">' + W.escapeHtml(item.name || "单品") + "</div>" +
            '<div style="font-size:12px;line-height:1.75;color:var(--text-light)">' + W.escapeHtml(item.detail || "这件单品的识别信息还在整理中。") + "</div>" +
            (item.qty ? '<div style="margin-top:10px;font-size:12px;color:var(--accent);font-weight:600">打包数量 ' + W.escapeHtml(item.qty) + "</div>" : "") +
          "</div>" +
        "</div>" +
        (tags ? '<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px"><div style="width:100%;font-size:11px;color:var(--text-light)">识别标签</div>' + tags + "</div>" : "") +
        (occasions ? '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px"><div style="width:100%;font-size:11px;color:var(--text-light)">适用场景</div>' + occasions + "</div>" : "") +
        (item.reason ? '<div style="margin-top:14px;padding:12px 14px;border-radius:16px;background:rgba(255,250,245,.94);font-size:12px;line-height:1.7;color:var(--text-mid)"><strong style="display:block;margin-bottom:4px;color:var(--accent-dark)">AI 打包理由</strong>' + W.escapeHtml(item.reason) + "</div>" : "") +
      "</div>";
    document.body.appendChild(mask);
    function closeMask() {
      mask.remove();
    }
    mask.addEventListener("click", function (event) {
      if (event.target === mask || event.target.getAttribute("data-close") !== null) {
        closeMask();
      }
    });
  }

  function bindDetailTriggers(root) {
    (root || document).querySelectorAll("[data-item-card]").forEach(function (node) {
      if (node.dataset.boundCard === "1") return;
      node.dataset.boundCard = "1";
      node.style.cursor = "pointer";
      node.addEventListener("click", function () {
        try {
          openItemCard(JSON.parse(decodeURIComponent(node.dataset.itemCard || "%7B%7D")));
        } catch (error) {
          openItemCard(null);
        }
      });
    });
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
        id: item.id,
        name: item.name,
        detail: (item.brand || "文文的衣橱") + " · " + (item.slot_label || item.category_label || "单品") + " · " + (item.color || "柔雾色"),
        color: colorForItem(item),
        color_hex: colorForItem(item),
        emoji: emojiForCategory(item.category),
        thumbnail_url: resolvePreviewUrl(item),
        tags: item.tags || [],
        occasions: item.occasions || []
      };
    });
  }

  function diaryItemOptions() {
    var options = [{ label: "暂不选择", value: "" }];
    state.wardrobeItems.forEach(function (item) {
      options.push({
        label: item.name + " · " + (item.color || "未标记颜色"),
        value: String(item.id)
      });
    });
    return options;
  }

  function resolveDiaryItemIds(values, fallbackIds) {
    var selected = [values.item_id_1, values.item_id_2, values.item_id_3]
      .map(function (value) { return Number(value || 0); })
      .filter(function (value) { return Number.isFinite(value) && value > 0; });
    selected = selected.filter(function (value, index) { return selected.indexOf(value) === index; });
    return selected.length ? selected : fallbackIds;
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
          outfit_name: entry.outfit_name || "今日穿搭",
          occasion: entry.occasion || "日常",
          item_ids: entry.item_ids || [],
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
        '<div class="outfit-item" data-item-card="' + encodeItemCard(item) + '" style="animation-delay:' + (index * 0.12) + 's">' +
          renderItemThumb(item, "item-thumb") +
          '<div class="item-info"><h3>' + W.escapeHtml(item.name) + '</h3><p>' + W.escapeHtml(item.detail) + "</p></div>" +
        "</div>";
    }).join("") +
      '<div style="padding-top:6px;"><button id="editOutfitBtn" type="button" style="width:100%;padding:11px 16px;border:none;border-radius:14px;background:rgba(196,149,106,.12);color:var(--accent-dark);font-family:inherit;font-size:12px;cursor:pointer;">编辑这天穿搭</button></div>';
    byId("outfitTags").innerHTML = (detail.tags || []).map(function (tag) {
      return "<span>" + W.escapeHtml(tag) + "</span>";
    }).join("");

    var note = byId("outfitNote");
    note.style.display = "";
    note.textContent = "💭 " + (detail.note || "这一天被轻轻记住了。");
    byId("outfitOverlay").classList.add("show");
    setSelectedDay(day);
    refreshFx();

    var editButton = byId("editOutfitBtn");
    if (editButton) {
      editButton.addEventListener("click", function () {
        openDiaryEditor(day, detail);
      });
    }

    setTimeout(function () {
      document.querySelectorAll(".outfit-item").forEach(function (entry, index) {
        setTimeout(function () { entry.classList.add("fly-in"); }, index * 90);
      });
    }, 120);
    bindDetailTriggers(byId("outfitOverlay"));
  }

  function openDiaryEditor(day, detail) {
    var defaultIds = state.wardrobeItems.slice(0, 3).map(function (item) { return item.id; });
    var selectedIds = detail && detail.item_ids ? detail.item_ids.slice(0, 3) : defaultIds;
    W.openFormModal({
      title: detail ? "编辑当天穿搭" : "记录当天穿搭",
      description: "可以直接挑选今天真正穿到的单品，保存后会立即回写到月历。",
      submitLabel: detail ? "保存修改" : "写入日历",
      fields: [
        { name: "outfit_name", label: "穿搭标题", value: detail && detail.outfit_name ? detail.outfit_name : "今日穿搭" },
        { name: "occasion", label: "场景", value: detail && detail.occasion ? detail.occasion : "日常通勤" },
        { name: "item_id_1", label: "主单品 1", type: "select", options: diaryItemOptions(), value: selectedIds[0] ? String(selectedIds[0]) : "" },
        { name: "item_id_2", label: "主单品 2", type: "select", options: diaryItemOptions(), value: selectedIds[1] ? String(selectedIds[1]) : "" },
        { name: "item_id_3", label: "主单品 3", type: "select", options: diaryItemOptions(), value: selectedIds[2] ? String(selectedIds[2]) : "" },
        { name: "note", label: "备注", type: "textarea", full: true, value: detail && detail.note ? detail.note : "今天想要轻一点、干净一点的感觉。" }
      ],
      note: state.wardrobeItems.length ? "保存后会立刻回写到月历，并可重新点进当天查看详情。" : "当前衣橱里还没有单品，会先用默认占位写入日志。"
    }).then(function (values) {
      if (!values) return;
      var resolvedIds = resolveDiaryItemIds(values, defaultIds);
      api("/logs", {
        method: "POST",
        body: JSON.stringify({
          day: day,
          month: state.month,
          year: state.year,
          outfit_name: values.outfit_name,
          occasion: values.occasion,
          item_ids: resolvedIds,
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
          outfit_name: values.outfit_name,
          occasion: values.occasion,
          item_ids: resolvedIds,
          note: values.note,
          tags: [values.occasion || "日常", "本地预览"],
          items: buildLocalItemsFromWardrobe(resolvedIds)
        };
        writeLocalDiary(localDiary);
        state.usingLocalPreview = true;
        applyOverview(buildFallbackOverview(state.year, state.month));
        renderOutfit(day);
        W.toast("接口暂时未连接，已先保存到本地穿搭日志", "soft");
      });
    });
  }

  function recordOutfitForDay(day) {
    openDiaryEditor(day, null);
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
      return '<div class="suitcase-item" data-item-card="' + encodeItemCard(item) + '" style="animation-delay:' + (index * 0.08) + 's">' + renderItemThumb(item, "item-emoji") + '<div class="item-name">' + W.escapeHtml(item.name) + '</div><div class="item-qty">' + W.escapeHtml(item.qty) + "</div></div>";
    }).join("");

    setTimeout(function () {
      grid.querySelectorAll(".suitcase-item").forEach(function (entry, index) {
        setTimeout(function () { entry.classList.add("packed"); }, index * 60);
      });
    }, 80);

    var planHtml = "";
    if (result.summary) {
      planHtml += '<div class="day-plan-card"><h4>整体建议</h4><div style="font-size:12px;line-height:1.7;color:var(--text-light)">' + W.escapeHtml(result.summary) + "</div></div>";
    }
    byId("dayPlans").innerHTML = planHtml + (result.day_plans || []).map(function (plan) {
      return '<div class="day-plan-card"><h4>' + W.escapeHtml(plan.title) + '</h4>' +
        (plan.note ? '<div style="margin-bottom:10px;font-size:11.5px;line-height:1.7;color:var(--text-light)">' + W.escapeHtml(plan.note) + "</div>" : "") +
        '<div class="day-plan-items">' + (plan.items || []).map(function (item) {
          if (typeof item === "string") {
            return "<span>" + W.escapeHtml(item) + "</span>";
          }
          return '<button type="button" data-item-card="' + encodeItemCard(item) + '" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:none;border-radius:14px;background:rgba(255,250,246,.94);font-family:inherit;font-size:12px;color:var(--text-mid);cursor:pointer">' + renderItemThumb(item, "item-plan-thumb") + "<strong style=\"font-weight:500;color:var(--text)\">" + W.escapeHtml(item.name) + "</strong></button>";
        }).join("") + "</div></div>";
    }).join("");
    bindDetailTriggers(byId("suitcaseResult"));
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
          id: item.id || index + 1,
          emoji: item.emoji,
          name: item.name,
          detail: item.detail,
          color: item.color,
          color_hex: item.color_hex || item.color,
          thumbnail_url: item.thumbnail_url || "",
          tags: item.tags || [],
          occasions: item.occasions || [],
          qty: index < 3 && dayCount >= 5 ? "×2" : "×1",
          reason: "本地预览模式下，为你优先保留最容易复用的旅途单品。"
        };
      });
      var dayPlans = [];
      var divisor = Math.max(1, packedItems.length);
      for (var index = 0; index < dayCount; index += 1) {
        dayPlans.push({
          title: "Day " + (index + 1) + " · " + destination,
          note: "先用衣橱里最稳的基础单品打底，再留一件应对温差和拍照场景。",
          items: packedItems.slice(index % divisor).concat(packedItems.slice(0, index % divisor)).slice(0, 3)
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
