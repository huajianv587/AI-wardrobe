(function () {
  var W = window.WenwenExperience;
  if (!W) return;

  var API_ROOT = "/api/v1/experience/wardrobe-management";
  var state = {
    items: [],
    stats: null,
    sidebar: null,
    category: "all",
    season: "all",
    color: "",
    query: "",
    sort: "recent",
    view: "grid",
    page: 1,
    pageSize: 12,
    selectedIds: [],
    editingItem: null,
    hasLoadedOnce: false
  };

  var categoryMap = {
    all: { label: "全部", category: "tops", slot: "top" },
    tops: { label: "上衣", category: "tops", slot: "top" },
    bottoms: { label: "下装", category: "bottoms", slot: "bottom" },
    outerwear: { label: "外套", category: "outerwear", slot: "outerwear" },
    dresses: { label: "连衣裙", category: "dresses", slot: "top" },
    shoes: { label: "鞋子", category: "shoes", slot: "shoes" },
    accessories: { label: "配饰", category: "accessories", slot: "accessory" }
  };
  var reverseCategoryMap = {
    "全部": "all",
    "上衣": "tops",
    "下装": "bottoms",
    "外套": "outerwear",
    "连衣裙": "dresses",
    "鞋子": "shoes",
    "配饰": "accessories"
  };
  var seasonMap = {
    "春夏": "spring-summer",
    "秋冬": "autumn-winter"
  };
  var silhouetteStroke = {
    ci1: "rgba(192,100,88,.45)",
    ci2: "rgba(80,150,140,.45)",
    ci3: "rgba(155,130,90,.45)",
    ci4: "rgba(170,110,175,.45)",
    ci5: "rgba(90,125,165,.45)",
    ci6: "rgba(175,145,90,.45)",
    ci7: "rgba(90,145,85,.45)",
    ci8: "rgba(175,105,140,.45)",
    ci10: "rgba(165,145,85,.45)"
  };

  var editor = document.getElementById("te");
  var editorInputs = editor ? editor.querySelectorAll(".tein") : [];
  var tagWrap = document.getElementById("tetags");
  var saveButton = editor ? editor.querySelector(".tesave") : null;
  var uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.multiple = true;
  uploadInput.accept = "image/*";
  uploadInput.style.display = "none";
  document.body.appendChild(uploadInput);

  function api(path, options) {
    return W.request(API_ROOT + path, options);
  }

  function scrollToPanel() {
    var panel = document.getElementById("panel");
    if (!panel) return;
    panel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function resolveDisplayImageUrl(item) {
    var raw = (item && (item.processed_image_url || item.image_url)) || "";
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw) || raw.indexOf("data:") === 0) return raw;
    if (raw.charAt(0) === "/" && W.apiBase) {
      return W.apiBase.replace(/\/$/, "") + raw;
    }
    return raw;
  }

  function parseUploadResponse(response) {
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
  }

  function uploadAssetForItemLegacy(itemId, file) {
    var formData = new FormData();
    formData.append("image", file);
    return fetch((W.apiBase || "") + API_ROOT + "/items/" + itemId + "/upload-image", {
      method: "POST",
      body: formData,
      credentials: "include"
    }).then(parseUploadResponse);
  }

  function uploadAssetForItem(itemId, file) {
    return api("/items/" + itemId + "/prepare-image-upload", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type || null
      })
    }).then(function (plan) {
      var headers = Object.assign({}, plan.headers || {});
      if (file.type && !headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = file.type;
      }
      return fetch(plan.upload_url, {
        method: plan.method || "PUT",
        headers: headers,
        body: file
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || "云端上传失败");
          });
        }
        return api("/items/" + itemId + "/confirm-image-upload", {
          method: "POST",
          body: JSON.stringify({
            public_url: plan.public_url
          })
        });
      });
    }).catch(function () {
      return uploadAssetForItemLegacy(itemId, file);
    });
  }

  function sortItems(items) {
    var sorted = items.slice();
    if (state.sort === "name") {
      sorted.sort(function (a, b) { return a.name.localeCompare(b.name, "zh-CN"); });
    } else if (state.sort === "color") {
      sorted.sort(function (a, b) { return (a.color || "").localeCompare(b.color || "", "zh-CN"); });
    } else if (state.sort === "wear") {
      sorted.sort(function (a, b) { return (b.occasions || []).length - (a.occasions || []).length; });
    } else {
      sorted.sort(function (a, b) { return b.id - a.id; });
    }
    return sorted;
  }

  function currentItems() {
    return sortItems(state.items);
  }

  function currentPageItems() {
    var items = currentItems();
    var start = (state.page - 1) * state.pageSize;
    return items.slice(start, start + state.pageSize);
  }

  function paginationMeta() {
    var items = currentItems();
    return {
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / state.pageSize))
    };
  }

  function updateBulkBar() {
    var bulk = document.getElementById("bulk");
    var countNode = document.getElementById("bn");
    if (!bulk || !countNode) return;
    countNode.textContent = "已选 " + state.selectedIds.length + " 件";
    bulk.classList.toggle("show", state.selectedIds.length > 0);
  }

  function renderStats() {
    var cards = document.querySelectorAll(".stats .sc");
    if (!cards.length || !state.stats) return;
    cards[0].querySelector(".scval").textContent = state.stats.total_items;
    cards[0].querySelector(".scsub").textContent = "当前衣橱完整收纳中";
    cards[0].querySelector(".scfill").style.width = "100%";
    cards[1].querySelector(".scval").textContent = state.stats.ai_processed;
    cards[1].querySelector(".scsub").textContent = Math.round((state.stats.ai_processed / Math.max(1, state.stats.total_items)) * 100) + "% 已识别";
    cards[1].querySelector(".scfill").style.width = Math.round((state.stats.ai_processed / Math.max(1, state.stats.total_items)) * 100) + "%";
    cards[2].querySelector(".scval").textContent = state.stats.untagged;
    cards[2].querySelector(".scsub").textContent = state.stats.untagged ? "待补充标签" : "标签已经整理完整";
    cards[2].querySelector(".scfill").style.width = Math.min(100, Math.round((state.stats.untagged / Math.max(1, state.stats.total_items)) * 100)) + "%";
    cards[2].querySelector(".scfill").style.background = "#c9a882";
    var syncVal = cards[3].querySelector(".scval");
    syncVal.style.fontSize = "16px";
    syncVal.style.marginTop = "2px";
    syncVal.textContent = state.stats.last_sync;
    cards[3].querySelector(".scsub").textContent = state.items.length ? "云端与体验数据同步" : "等待第一件单品";
  }

  function bindSidebar() {
    var sidebarItems = document.querySelectorAll(".sb .sbi");
    sidebarItems.forEach(function (item, index) {
      if (index <= 6) {
        var key = ["all", "tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"][index];
        item.dataset.filterType = "category";
        item.dataset.filterValue = key;
      } else {
        var seasonKey = index === 7 ? "spring-summer" : "autumn-winter";
        item.dataset.filterType = "season";
        item.dataset.filterValue = seasonKey;
      }
      item.onclick = function () { sbp(item); };
    });

    var colorNodes = document.querySelectorAll(".sb-colors .sbc");
    colorNodes.forEach(function (node, index) {
      var color = state.sidebar && state.sidebar.colors[index] ? state.sidebar.colors[index] : null;
      node.dataset.color = color ? color.name : "";
      node.style.background = color ? color.hex : "#f1e8e2";
      node.onclick = function () {
        if (!node.dataset.color) return;
        state.color = state.color === node.dataset.color ? "" : node.dataset.color;
        state.page = 1;
        renderSidebarActive();
        fetchOverview();
      };
    });
  }

  function renderSidebar() {
    if (!state.sidebar) return;
    var sidebarItems = document.querySelectorAll(".sb .sbi");
    state.sidebar.categories.forEach(function (entry, index) {
      var item = sidebarItems[index];
      if (!item) return;
      item.querySelector(".sbin").textContent = entry.label;
      item.querySelector(".sbict").textContent = entry.count;
    });
    if (sidebarItems[7]) sidebarItems[7].querySelector(".sbict").textContent = state.sidebar.season_counts["spring-summer"];
    if (sidebarItems[8]) sidebarItems[8].querySelector(".sbict").textContent = state.sidebar.season_counts["autumn-winter"];
    bindSidebar();
    renderSidebarActive();
  }

  function renderSidebarActive() {
    document.querySelectorAll(".sb .sbi").forEach(function (item) {
      var on = false;
      if (item.dataset.filterType === "category") on = item.dataset.filterValue === state.category;
      if (item.dataset.filterType === "season") on = item.dataset.filterValue === state.season;
      item.classList.toggle("on", on);
    });

    document.querySelectorAll(".sb-colors .sbc").forEach(function (node) {
      node.classList.toggle("sel", node.dataset.color === state.color && !!state.color);
    });

    document.querySelectorAll(".fp .fpp").forEach(function (pill) {
      var key = reverseCategoryMap[pill.textContent.trim()] || "all";
      pill.classList.toggle("on", key === state.category);
    });
  }

  function renderGrid() {
    var grid = document.getElementById("cg");
    if (!grid) return;
    var items = currentPageItems();
    var uploadTile = '' +
      '<div class="uptile" data-role="upload">' +
      '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
      '<div><div class="utt">点击上传图片</div><div class="uts">或批量导入到衣橱</div></div></div>';

    var cards = items.map(function (item) {
      var checked = state.selectedIds.indexOf(item.id) >= 0;
      var tags = (item.tags || []).slice(0, 3).map(function (tag) {
        return '<span class="ict' + (tag === "未标签" ? " w" : "") + '">' + W.escapeHtml(tag) + "</span>";
      }).join("");
      var stroke = silhouetteStroke[item.visual_theme] || "rgba(192,100,88,.45)";
      var silhouetteKind = item.silhouette === "shirt" ? "shirt" : item.silhouette;
      var svg = W.silhouetteSvg(silhouetteKind, stroke, "cs");
      var imageUrl = resolveDisplayImageUrl(item);
      var media = imageUrl
        ? '<img class="ic-real" src="' + escapeAttr(imageUrl) + '" alt="' + escapeAttr(item.name || "衣橱单品") + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" />'
        : '<div class="icii ' + item.visual_theme + '">' + svg + "</div>";
      return '' +
        '<div class="ic' + (checked ? " sel" : "") + '" data-id="' + item.id + '" onclick="sel(this)">' +
          '<div class="ic-chk">' +
            '<svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>' +
          '</div>' +
          '<span class="icbadge ' + item.badge_tone + '">' + W.escapeHtml(item.badge_label) + "</span>" +
          '<div class="ic-img">' + media + "</div>" +
          '<div class="ic-acts">' +
            '<div class="ia" data-action="edit" onclick="ote(event)"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>' +
            '<div class="ia" data-action="replace"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>' +
            '<div class="ia" data-action="delete" onclick="del(event,this)"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></div>' +
          "</div>" +
          '<div class="icfoot"><div class="icname">' + W.escapeHtml(item.name) + '</div><div class="ictags">' + tags + "</div></div>" +
        "</div>";
    }).join("");

    grid.innerHTML = uploadTile + cards;
    grid.classList.toggle("lv", state.view === "list");
    var tile = grid.querySelector('[data-role="upload"]');
    if (tile) tile.addEventListener("click", triggerUpload);
    bindCardActions();
    renderPagination();
    updateBulkBar();
  }

  function bindCardActions() {
    document.querySelectorAll(".ic .ia[data-action='replace']").forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.stopPropagation();
        var itemId = Number(node.closest(".ic").dataset.id);
        replaceImage(itemId);
      });
    });
  }

  function renderPagination() {
    var container = document.querySelector(".pagi");
    if (!container) return;
    var meta = paginationMeta();
    if (state.page > meta.pages) state.page = meta.pages;
    var html = '' +
      '<div class="pg arr" data-page="' + Math.max(1, state.page - 1) + '"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    var pages = [];
    for (var i = 1; i <= meta.pages; i += 1) pages.push(i);
    pages.slice(0, 5).forEach(function (page) {
      html += '<div class="pg' + (page === state.page ? " on" : "") + '" data-page="' + page + '">' + page + "</div>";
    });
    if (meta.pages > 5) {
      html += '<span class="pgdots">…</span><div class="pg' + (meta.pages === state.page ? " on" : "") + '" data-page="' + meta.pages + '">' + meta.pages + "</div>";
    }
    html += '<div class="pg arr" data-page="' + Math.min(meta.pages, state.page + 1) + '"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    container.innerHTML = html;
    container.querySelectorAll("[data-page]").forEach(function (node) {
      node.addEventListener("click", function () {
        state.page = Number(node.dataset.page);
        renderGrid();
      });
    });
  }

  function payloadFromEditor() {
    var name = editorInputs[0] ? editorInputs[0].value.trim() : "";
    var categoryLabel = editorInputs[1] ? editorInputs[1].value.trim() : "上衣";
    var color = editorInputs[2] ? editorInputs[2].value.trim() : "米白";
    var note = editorInputs[3] ? editorInputs[3].value.trim() : "";
    var categoryKey = reverseCategoryMap[categoryLabel] || "tops";
    var tags = Array.prototype.slice.call(tagWrap.querySelectorAll(".tetag")).map(function (tag) {
      return tag.childNodes[0].textContent.trim();
    });
    return {
      name: name || "未命名单品",
      category: categoryKey,
      slot: (categoryMap[categoryKey] || categoryMap.tops).slot,
      color: color || "米白",
      brand: "文文的衣橱",
      image_url: state.editingItem ? (state.editingItem.image_url || null) : null,
      tags: tags,
      occasions: state.editingItem ? (state.editingItem.occasions || []) : [],
      style_notes: note
    };
  }

  function fillEditor(item) {
    state.editingItem = item;
    if (!editor) return;
    var payload = item || {
      name: "",
      category_label: "上衣",
      color: "米白",
      tags: ["春夏"],
      note: ""
    };
    editorInputs[0].value = payload.name || "";
    editorInputs[1].value = payload.category_label || "上衣";
    editorInputs[2].value = payload.color || "米白";
    editorInputs[3].value = payload.note || "";
    Array.prototype.slice.call(tagWrap.querySelectorAll(".tetag")).forEach(function (node) { node.remove(); });
    (payload.tags || []).forEach(function (tag) {
      addTagNode(tag);
    });
    editor.classList.add("show");
    editor.style.left = "calc(100vw - 380px)";
    editor.style.top = "120px";
  }

  function addTagNode(label) {
    if (!tagWrap || !label) return;
    var button = tagWrap.querySelector(".teadd");
    var node = document.createElement("div");
    node.className = "tetag";
    node.innerHTML = W.escapeHtml(label) + ' <button class="tedel" type="button">×</button>';
    node.querySelector(".tedel").addEventListener("click", function () { node.remove(); });
    tagWrap.insertBefore(node, button);
  }

  function saveEditor() {
    var payload = payloadFromEditor();
    var request = state.editingItem
      ? api("/items/" + state.editingItem.id, { method: "PUT", body: JSON.stringify(payload) })
      : api("/items", { method: "POST", body: JSON.stringify(payload) });
    request.then(function (result) {
      W.toast(state.editingItem ? "单品信息已更新" : "新单品已加入衣橱", "soft");
      cte();
      if (result.item) {
        if (state.editingItem) {
          state.items = state.items.map(function (entry) { return entry.id === result.item.id ? result.item : entry; });
        } else {
          state.items.unshift(result.item);
        }
      }
      fetchOverview(false);
    }).catch(function (error) {
      W.toast(error.message || "保存失败");
    });
  }

  function triggerUpload() {
    uploadInput.click();
  }

  function replaceImage(itemId) {
    uploadInput.onchange = function () {
      var file = uploadInput.files && uploadInput.files[0];
      if (!file) return;
      uploadAssetForItem(itemId, file).then(function () {
        W.toast("图片已上传并绑定到这件单品", "soft");
        fetchOverview(false);
      }).catch(function (error) {
        W.toast(error.message || "替换失败");
      }).finally(function () {
        uploadInput.value = "";
        uploadInput.onchange = handleBulkUpload;
      });
    };
    uploadInput.click();
  }

  function handleBulkUpload() {
    var files = Array.prototype.slice.call(uploadInput.files || []);
    if (!files.length) return;
    var queue = files.map(function (file) {
      var category = state.category === "all" ? "tops" : state.category;
      return api("/items", {
        method: "POST",
        body: JSON.stringify({
          name: file.name.replace(/\.[^.]+$/, ""),
          category: category,
          slot: (categoryMap[category] || categoryMap.tops).slot,
          color: "米白",
          brand: "本地上传",
          image_url: null,
          tags: ["本地上传"],
          occasions: [],
          style_notes: "从本地上传入口加入衣橱。"
        })
      }).then(function (result) {
        return result && result.item ? uploadAssetForItem(result.item.id, file) : null;
      });
    });
    Promise.all(queue).then(function () {
      W.toast("图片已上传到云端并加入衣橱", "soft");
      fetchOverview(false);
    }).catch(function (error) {
      W.toast(error.message || "上传失败");
    }).finally(function () {
      uploadInput.value = "";
    });
  }

  function bindToolbar() {
    var actions = document.querySelectorAll(".ph-acts .pa");
    if (actions[1]) actions[1].addEventListener("click", triggerUpload);
    if (actions[2]) actions[2].addEventListener("click", function () { fillEditor(null); });

    var urlInput = document.querySelector(".urli");
    var urlButton = document.querySelector(".urlgo");
    if (urlButton) {
      urlButton.addEventListener("click", function () {
        if (!urlInput || !urlInput.value.trim()) {
          W.toast("先贴一张图片地址再导入");
          return;
        }
        api("/import-url", {
          method: "POST",
          body: JSON.stringify({
            image_url: urlInput.value.trim(),
            category: state.category === "all" ? "tops" : state.category,
            slot: (categoryMap[state.category] || categoryMap.tops).slot,
            color: state.color || "米白"
          })
        }).then(function () {
          W.toast("图片 URL 已导入到衣橱", "soft");
          urlInput.value = "";
          document.getElementById("urlrow").classList.remove("show");
          fetchOverview(false);
        }).catch(function (error) {
          W.toast(error.message || "URL 导入失败");
        });
      });
    }

    var searchInput = document.getElementById("si");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value.trim();
        state.page = 1;
        fetchOverview();
      });
    }

    document.querySelectorAll(".fp .fpp").forEach(function (pill) {
      pill.addEventListener("click", function () {
        state.category = reverseCategoryMap[pill.textContent.trim()] || "all";
        state.page = 1;
        renderSidebarActive();
        fetchOverview();
      });
    });

    var sortSelect = document.querySelector(".tbsort");
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        var selected = sortSelect.value;
        state.sort = selected === "名称排序" ? "name" : selected === "颜色排序" ? "color" : selected === "穿搭次数" ? "wear" : "recent";
        renderGrid();
      });
    }

    var bulkButtons = document.querySelectorAll(".bulk .bb");
    if (bulkButtons[0]) {
      bulkButtons[0].addEventListener("click", function () {
        if (!state.selectedIds.length) return W.toast("先选中要批量整理的单品");
        W.openFormModal({
          title: "批量编辑标签",
          description: "一次给多件单品补充标签和备注。",
          submitLabel: "应用修改",
          fields: [
            { name: "tags", label: "新增标签", placeholder: "如：通勤, 春夏, 约会" },
            { name: "note", label: "追加备注", placeholder: "例如：适合早八通勤" }
          ]
        }).then(function (values) {
          if (!values) return;
          api("/bulk", {
            method: "POST",
            body: JSON.stringify({
              action: "edit-tags",
              item_ids: state.selectedIds,
              tags: W.parseList(values.tags),
              note: values.note || null
            })
          }).then(function (result) {
            W.toast(result.message || "批量标签已更新", "soft");
            clrSel();
            fetchOverview(false);
          }).catch(function (error) {
            W.toast(error.message || "批量编辑失败");
          });
        });
      });
    }
    if (bulkButtons[1]) {
      bulkButtons[1].addEventListener("click", function () {
        if (!state.selectedIds.length) return W.toast("先选中要移动的单品");
        W.openFormModal({
          title: "移动到新的分类",
          submitLabel: "确认移动",
          fields: [
            {
              name: "category",
              label: "分类",
              type: "select",
              options: [
                { label: "上衣", value: "tops" },
                { label: "下装", value: "bottoms" },
                { label: "外套", value: "outerwear" },
                { label: "连衣裙", value: "dresses" },
                { label: "鞋子", value: "shoes" },
                { label: "配饰", value: "accessories" }
              ],
              value: "tops"
            }
          ]
        }).then(function (values) {
          if (!values) return;
          api("/bulk", {
            method: "POST",
            body: JSON.stringify({
              action: "move-category",
              item_ids: state.selectedIds,
              category: values.category,
              slot: categoryMap[values.category].slot
            })
          }).then(function (result) {
            W.toast(result.message || "分类已更新", "soft");
            clrSel();
            fetchOverview(false);
          }).catch(function (error) {
            W.toast(error.message || "移动失败");
          });
        });
      });
    }
    if (bulkButtons[2]) {
      bulkButtons[2].addEventListener("click", function () {
        if (!state.selectedIds.length) return W.toast("先选中需要替换图片的单品");
        W.toast("请逐件替换图片，已经为你保留当前的原图地址");
      });
    }
    if (bulkButtons[3]) {
      bulkButtons[3].addEventListener("click", function () {
        if (!state.selectedIds.length) return W.toast("先选中要删除的单品");
        if (!window.confirm("确认删除已选中的 " + state.selectedIds.length + " 件单品吗？")) return;
        api("/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            item_ids: state.selectedIds
          })
        }).then(function (result) {
          W.toast(result.message || "删除完成", "soft");
          clrSel();
          fetchOverview(false);
        }).catch(function (error) {
          W.toast(error.message || "删除失败");
        });
      });
    }
  }

  function fetchOverview(withToast) {
    var params = [];
    if (state.category && state.category !== "all") params.push("category=" + encodeURIComponent(state.category));
    if (state.query) params.push("query=" + encodeURIComponent(state.query));
    if (state.season && state.season !== "all") params.push("season=" + encodeURIComponent(state.season));
    if (state.color) params.push("color=" + encodeURIComponent(state.color));
    return api((params.length ? "?" + params.join("&") : ""), { method: "GET" }).then(function (data) {
      state.items = data.items || [];
      state.stats = data.stats;
      state.sidebar = data.sidebar;
      renderStats();
      renderSidebar();
      renderGrid();
      state.hasLoadedOnce = true;
      if (withToast) W.toast("衣橱内容已更新", "soft");
    }).catch(function (error) {
      if (withToast || state.hasLoadedOnce) {
        W.toast(error.message || "加载衣橱失败");
      }
      state.hasLoadedOnce = true;
    });
  }

  window.sel = function (card) {
    var eventRef = window.event;
    if (eventRef && (eventRef.target.closest(".ic-acts") || eventRef.target.closest(".ic-chk"))) return;
    var id = Number(card.dataset.id);
    if (!id) return;
    var index = state.selectedIds.indexOf(id);
    if (index >= 0) state.selectedIds.splice(index, 1);
    else state.selectedIds.push(id);
    card.classList.toggle("sel", index < 0);
    updateBulkBar();
  };

  window.clrSel = function () {
    state.selectedIds = [];
    document.querySelectorAll(".ic.sel").forEach(function (card) {
      card.classList.remove("sel");
    });
    updateBulkBar();
  };

  window.fpick = function (pill) {
    state.category = reverseCategoryMap[pill.textContent.trim()] || "all";
    state.page = 1;
    renderSidebarActive();
    fetchOverview();
  };

  window.sbp = function (node) {
    if (node.dataset.filterType === "category") {
      state.category = node.dataset.filterValue || "all";
    } else if (node.dataset.filterType === "season") {
      state.season = state.season === node.dataset.filterValue ? "all" : node.dataset.filterValue;
    }
    state.page = 1;
    renderSidebarActive();
    fetchOverview();
  };

  window.sv = function (view) {
    state.view = view === "list" ? "list" : "grid";
    document.getElementById("vbg").classList.toggle("on", state.view === "grid");
    document.getElementById("vbl").classList.toggle("on", state.view === "list");
    renderGrid();
  };

  window.del = function (event, button) {
    event.stopPropagation();
    var itemId = Number(button.closest(".ic").dataset.id);
    if (!itemId) return;
    if (!window.confirm("确认删除这件单品吗？")) return;
    api("/items/" + itemId, { method: "DELETE" }).then(function () {
      W.toast("单品已删除", "soft");
      state.selectedIds = state.selectedIds.filter(function (id) { return id !== itemId; });
      fetchOverview(false);
    }).catch(function (error) {
      W.toast(error.message || "删除失败");
    });
  };

  window.ote = function (event) {
    event.stopPropagation();
    var itemId = Number(event.target.closest(".ic").dataset.id);
    var item = state.items.find(function (entry) { return entry.id === itemId; });
    if (item) fillEditor(item);
  };

  window.cte = function () {
    if (!editor) return;
    editor.classList.remove("show");
    state.editingItem = null;
  };

  window.atag = function () {
    W.openFormModal({
      title: "添加标签",
      submitLabel: "加入标签",
      fields: [{ name: "label", label: "新标签", placeholder: "例如：约会、通勤、春夏" }]
    }).then(function (values) {
      if (!values || !values.label) return;
      addTagNode(values.label.trim());
    });
  };

  window.filt = function () {
    state.query = (document.getElementById("si").value || "").trim();
    state.page = 1;
    fetchOverview();
  };

  window.scrollToPanel = scrollToPanel;

  if (saveButton) saveButton.addEventListener("click", saveEditor);
  uploadInput.onchange = handleBulkUpload;
  bindToolbar();
  fetchOverview(false);
})();
