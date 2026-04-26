const ovFilterEl = document.getElementById("ovFilter");
const ovKindFilterEl = document.getElementById("ovKindFilter");
const ovTagModeEl = document.getElementById("ovTagMode");
const ovRefreshEl = document.getElementById("ovRefresh");
const ovToggleContentEl = document.getElementById("ovToggleContent");
const ovContentAreaEl = document.getElementById("ovContentArea");
const ovBackToTopBtnEl = document.getElementById("ovBackToTopBtn");
const ovTagFilterWrapEl = document.getElementById("ovTagFilterWrap");
const ovTagChipsEl = document.getElementById("ovTagChips");
const ovStatusEl = document.getElementById("ovStatus");
const ovSummaryEl = document.getElementById("ovSummary");
const ovRootEl = document.getElementById("ovRoot");

/** @type {{ path: string; tags: string[]; note: string; score?: number; mediaKind?: string }[]} */
let cachedItems = [];
/** 当前选中的标签（展示用字符串，与某条记录上的标签大小写一致）；空数组表示不限 */
let activeTags = [];
/** 首次进入页面时从 session 恢复的标签列表（在首次 loadOverview 内消费） */
let pendingSessionOvTags = [];
let revealStatusTimer = 0;
/** 非提示态下状态栏应显示的说明（随筛选更新） */
let lastIdleStatusMessage = "";
let appliedUrlTagOnce = false;
let contentCollapsed = false;
let tagMatchMode = "and";
const ovLang = String(window.__kwLang || "zh-CN");

const OV_I18N = {
  "zh-CN": {
    toggleShow: "显示下方内容",
    toggleHide: "隐藏下方内容",
    allTags: "全部标签",
    colKind: "类型",
    colScore: "评分",
    colPath: "文件路径",
    colTags: "标签",
    colNote: "描述 / 备注",
    colActions: "操作",
    kindImage: "图片",
    kindVideo: "视频",
    kindOther: "其他",
    summaryOnly: (total) => `共 ${total} 条记录。`,
    summaryFiltered: (total, n, hints) =>
      `共 ${total} 条记录，当前显示 ${n} 条${hints.length ? `（${hints.join("，")}）` : ""}。`,
    hintKindImage: "类型：图片",
    hintKindVideo: "类型：视频",
    hintKindOther: "类型：其他",
    hintTagMode: (mode) => `标签匹配：${mode}`,
    hintTags: (tags) => `标签「${tags.join(" / ")}」`,
    hintNeedle: "含关键字",
    scoreUnrated: "未评",
    scoreUnit: "分",
    copyPath: "复制路径",
    btnReveal: "打开位置",
    btnRename: "重命名",
    btnDelete: "删除",
    titleReveal: "在资源管理器中打开并选中此文件",
    titleRename: "在同一文件夹内重命名该文件（标签会随路径迁移）",
    titleDelete: "从已保存标注中移除（不删除磁盘上的文件）",
    kindTipImage: "扩展名属于图片浏览白名单",
    kindTipVideo: "扩展名属于视频浏览白名单",
    kindTipOther: "非图片/视频扩展名（如文档、音频等）",
    promptRename:
      "请输入新文件名（仅改文件名，不改变所在文件夹；不含 \\ / : 等路径字符）",
    statusCancelEmpty: "已取消：文件名为空",
    statusNameUnchanged: "名称未变化",
    statusRenameFail: "重命名失败",
    statusRenameOk: "重命名成功",
    statusRequestFail: "请求失败",
    statusCopyOk: "已复制路径到剪贴板",
    statusCopyFail: "复制失败（浏览器权限）",
    statusLoad: "加载中…",
    statusLoadFail: "加载失败",
    statusNetworkErr: "网络错误",
    statusDeleteFail: "删除失败",
    statusDeleteOk: "已删除该条记录",
    statusRevealFail: "无法在资源管理器中打开",
    statusRevealSent: "已发送打开资源管理器请求（若未弹出请查看是否被其它窗口遮挡）",
    confirmDelete: (path) =>
      `确定删除此条标注记录？\n\n${path}\n\n仅从 data/file-tags.json 中移除，不会删除磁盘上的文件。`,
    emptyFiltered: "没有符合当前筛选条件的记录。",
    emptyNoData: "暂无已保存的标签或备注。请在搜索或浏览页为文件添加标签/备注后再来查看。",
  },
  en: {
    toggleShow: "Show Content Below",
    toggleHide: "Hide Content Below",
    allTags: "All Tags",
    colKind: "Type",
    colScore: "Score",
    colPath: "File Path",
    colTags: "Tags",
    colNote: "Description / Note",
    colActions: "Actions",
    kindImage: "Image",
    kindVideo: "Video",
    kindOther: "Other",
    summaryOnly: (total) => `${total} records total.`,
    summaryFiltered: (total, n, hints) =>
      `${total} records total, ${n} shown${hints.length ? ` (${hints.join(", ")})` : ""}.`,
    hintKindImage: "Type: Image",
    hintKindVideo: "Type: Video",
    hintKindOther: "Type: Other",
    hintTagMode: (mode) => `Tag Match: ${mode}`,
    hintTags: (tags) => `Tags: ${tags.join(" / ")}`,
    hintNeedle: "Keyword matched",
    scoreUnrated: "Unrated",
    scoreUnit: "pt",
    copyPath: "Copy Path",
    btnReveal: "Reveal",
    btnRename: "Rename",
    btnDelete: "Delete",
    titleReveal: "Reveal this file in File Explorer",
    titleRename: "Rename in same folder (tags migrate with path)",
    titleDelete: "Remove from saved records only (keep disk file)",
    kindTipImage: "Extension is in image whitelist",
    kindTipVideo: "Extension is in video whitelist",
    kindTipOther: "Not image/video extension (e.g. doc/audio)",
    promptRename:
      "Enter a new filename (same folder only; do not include path characters like \\ / : )",
    statusCancelEmpty: "Cancelled: empty file name",
    statusNameUnchanged: "Name unchanged",
    statusRenameFail: "Rename failed",
    statusRenameOk: "Renamed",
    statusRequestFail: "Request failed",
    statusCopyOk: "Path copied to clipboard",
    statusCopyFail: "Copy failed (browser permission)",
    statusLoad: "Loading...",
    statusLoadFail: "Load failed",
    statusNetworkErr: "Network error",
    statusDeleteFail: "Delete failed",
    statusDeleteOk: "Record deleted",
    statusRevealFail: "Cannot open in File Explorer",
    statusRevealSent: "Reveal request sent (if no window appears, it may be behind other windows)",
    confirmDelete: (path) =>
      `Delete this tagged record?\n\n${path}\n\nOnly removed from data/file-tags.json; disk file is kept.`,
    emptyFiltered: "No records match the current filters.",
    emptyNoData: "No saved tags or notes yet. Add tags/notes in search or browser pages first.",
  },
  ja: {
    toggleShow: "下の内容を表示",
    toggleHide: "下の内容を隠す",
    allTags: "すべてのタグ",
    colKind: "種類",
    colScore: "評価",
    colPath: "ファイルパス",
    colTags: "タグ",
    colNote: "説明 / メモ",
    colActions: "操作",
    kindImage: "画像",
    kindVideo: "動画",
    kindOther: "その他",
    summaryOnly: (total) => `全 ${total} 件。`,
    summaryFiltered: (total, n, hints) =>
      `全 ${total} 件中 ${n} 件を表示${hints.length ? `（${hints.join("、")}）` : ""}。`,
    hintKindImage: "種類：画像",
    hintKindVideo: "種類：動画",
    hintKindOther: "種類：その他",
    hintTagMode: (mode) => `タグ一致：${mode}`,
    hintTags: (tags) => `タグ「${tags.join(" / ")}」`,
    hintNeedle: "キーワード一致",
    scoreUnrated: "未評価",
    scoreUnit: "点",
    copyPath: "パスをコピー",
    btnReveal: "場所を開く",
    btnRename: "名前変更",
    btnDelete: "削除",
    titleReveal: "エクスプローラーでこのファイルを表示",
    titleRename: "同一フォルダ内でリネーム（タグは移行）",
    titleDelete: "保存済み記録からのみ削除（ディスク上のファイルは保持）",
    kindTipImage: "拡張子が画像ブラウズ対象です",
    kindTipVideo: "拡張子が動画ブラウズ対象です",
    kindTipOther: "画像/動画以外の拡張子（文書・音声など）",
    promptRename:
      "新しいファイル名を入力してください（同一フォルダ内のみ、\\ / : などのパス文字は不可）",
    statusCancelEmpty: "キャンセル：ファイル名が空です",
    statusNameUnchanged: "名前は変更されていません",
    statusRenameFail: "名前変更に失敗しました",
    statusRenameOk: "名前を変更しました",
    statusRequestFail: "リクエスト失敗",
    statusCopyOk: "パスをクリップボードにコピーしました",
    statusCopyFail: "コピー失敗（ブラウザ権限）",
    statusLoad: "読み込み中…",
    statusLoadFail: "読み込み失敗",
    statusNetworkErr: "ネットワークエラー",
    statusDeleteFail: "削除に失敗しました",
    statusDeleteOk: "記録を削除しました",
    statusRevealFail: "エクスプローラーで開けません",
    statusRevealSent: "エクスプローラー表示リクエストを送信しました（表示されない場合は他ウィンドウの背後を確認）",
    confirmDelete: (path) =>
      `このタグ記録を削除しますか？\n\n${path}\n\ndata/file-tags.json からのみ削除され、ディスク上のファイルは削除されません。`,
    emptyFiltered: "現在の条件に一致する記録はありません。",
    emptyNoData: "保存済みのタグやメモがありません。検索またはブラウズ画面で先に追加してください。",
  },
};

function ovt(key, ...args) {
  const pack = OV_I18N[ovLang] || OV_I18N["zh-CN"];
  const v = pack[key];
  if (typeof v === "function") return v(...args);
  return v ?? OV_I18N["zh-CN"][key] ?? key;
}

function normalizeTagMatchMode(mode) {
  return mode === "or" ? "or" : "and";
}

function updateOverviewBackToTopVisibility() {
  if (!ovBackToTopBtnEl) return;
  ovBackToTopBtnEl.hidden = window.scrollY < 360;
}

function setStatus(text, isError) {
  ovStatusEl.textContent = text;
  ovStatusEl.classList.toggle("error", Boolean(isError));
}

const OVERVIEW_SESSION_KEY = "kwWeb.overview";

function saveOverviewSession() {
  try {
    sessionStorage.setItem(
      OVERVIEW_SESSION_KEY,
      JSON.stringify({
        filter: ovFilterEl.value,
        activeTags,
        tagMatchMode,
        kindFilter: ovKindFilterEl ? ovKindFilterEl.value : "",
        contentCollapsed,
      }),
    );
  } catch {
    /* ignore */
  }
}

function applyContentCollapsedUi() {
  if (ovContentAreaEl) ovContentAreaEl.classList.toggle("hidden", contentCollapsed);
  if (ovToggleContentEl) {
    ovToggleContentEl.textContent = contentCollapsed ? ovt("toggleShow") : ovt("toggleHide");
    ovToggleContentEl.setAttribute("aria-pressed", contentCollapsed ? "true" : "false");
  }
}

function fileBasename(p) {
  const n = String(p).replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  return i >= 0 ? n.slice(i + 1) : n;
}

async function renameTaggedFile(filePath) {
  const current = fileBasename(filePath);
  const input = window.prompt(
    ovt("promptRename"),
    current,
  );
  if (input === null) return;
  const newName = input.trim();
  if (!newName) {
    setStatus(ovt("statusCancelEmpty"), true);
    return;
  }
  if (newName === current) {
    setStatus(ovt("statusNameUnchanged"), false);
    return;
  }
  ovStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/rename-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, newName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || ovt("statusRenameFail"), true);
      return;
    }
    setStatus(data.unchanged ? ovt("statusNameUnchanged") : ovt("statusRenameOk"), false);
    await loadOverview();
  } catch (e) {
    setStatus(e.message || ovt("statusRequestFail"), true);
  }
}

function matchesNeedle(item, needle) {
  if (!needle) return true;
  if (item.path.toLowerCase().includes(needle)) return true;
  if (item.note.toLowerCase().includes(needle)) return true;
  return item.tags.some((t) => String(t).toLowerCase().includes(needle));
}

function activeTagLowSet() {
  return new Set(activeTags.map((t) => String(t).toLowerCase()));
}

function matchesActiveTags(item) {
  if (!activeTags.length) return true;
  const lows = activeTagLowSet();
  const itemLows = new Set(item.tags.map((t) => String(t).toLowerCase()));
  if (tagMatchMode === "or") return [...lows].some((x) => itemLows.has(x));
  return [...lows].every((x) => itemLows.has(x));
}

function itemMediaKind(item) {
  const k = item.mediaKind;
  if (k === "image" || k === "video" || k === "other") return k;
  return "other";
}

function itemScore(item) {
  const v = Number(item?.score);
  if (!Number.isFinite(v)) return 0;
  const i = Math.trunc(v);
  if (i < 0) return 0;
  if (i > 10) return 10;
  return i;
}

function matchesKindFilter(item) {
  const want = ovKindFilterEl ? ovKindFilterEl.value.trim() : "";
  if (!want) return true;
  return itemMediaKind(item) === want;
}

/** 从当前缓存提取去重标签（不区分大小写合并，展示取首次出现写法），按中文排序 */
function collectUniqueTags() {
  const map = new Map();
  for (const it of cachedItems) {
    for (const t of it.tags) {
      const s = String(t);
      const low = s.toLowerCase();
      if (!map.has(low)) map.set(low, s);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function renderTagChips() {
  ovTagChipsEl.innerHTML = "";
  const tags = collectUniqueTags();
  if (!tags.length) {
    ovTagFilterWrapEl.classList.add("hidden");
    activeTags = [];
    return;
  }

  // 如果数据已变化，移除不存在的选中标签
  const available = new Map(tags.map((t) => [t.toLowerCase(), t]));
  activeTags = activeTags
    .map((t) => available.get(String(t).toLowerCase()) || "")
    .filter(Boolean);

  ovTagFilterWrapEl.classList.remove("hidden");

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "ov-tag-chip" + (!activeTags.length ? " ov-tag-chip--active" : "");
  allBtn.textContent = ovt("allTags");
  allBtn.setAttribute("aria-pressed", !activeTags.length ? "true" : "false");
  allBtn.addEventListener("click", () => {
    activeTags = [];
    renderTagChips();
    applyFilterAndRender();
  });
  ovTagChipsEl.appendChild(allBtn);

  for (const label of tags) {
    const btn = document.createElement("button");
    btn.type = "button";
    const low = label.toLowerCase();
    const isActive = activeTags.some((x) => x.toLowerCase() === low);
    btn.className = "ov-tag-chip" + (isActive ? " ov-tag-chip--active" : "");
    btn.textContent = label;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.addEventListener("click", () => {
      if (activeTags.some((x) => x.toLowerCase() === low)) {
        activeTags = activeTags.filter((x) => x.toLowerCase() !== low);
      } else {
        activeTags = [...activeTags, label];
      }
      renderTagChips();
      applyFilterAndRender();
    });
    ovTagChipsEl.appendChild(btn);
  }
}

function renderRows(items) {
  ovRootEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "ov-empty";
    empty.textContent = cachedItems.length
      ? ovt("emptyFiltered")
      : ovt("emptyNoData");
    ovRootEl.appendChild(empty);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "ov-table-wrap";
  const table = document.createElement("table");
  table.className = "ov-table";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th class="col-kind">${ovt("colKind")}</th><th class="col-score">${ovt("colScore")}</th><th class="col-path">${ovt("colPath")}</th><th class="col-tags">${ovt("colTags")}</th><th class="col-note">${ovt("colNote")}</th><th class="col-actions">${ovt("colActions")}</th></tr>`;
  const tbody = document.createElement("tbody");

  const kindLabels = { image: ovt("kindImage"), video: ovt("kindVideo"), other: ovt("kindOther") };

  for (const it of items) {
    const tr = document.createElement("tr");

    const tdKind = document.createElement("td");
    tdKind.className = "col-kind";
    const mk = itemMediaKind(it);
    const badge = document.createElement("span");
    badge.className = "kind-badge kind-badge--" + mk;
    badge.textContent = kindLabels[mk] || ovt("kindOther");
    badge.title =
      mk === "image"
        ? ovt("kindTipImage")
        : mk === "video"
          ? ovt("kindTipVideo")
          : ovt("kindTipOther");
    tdKind.appendChild(badge);

    const tdScore = document.createElement("td");
    tdScore.className = "col-score";
    const score = itemScore(it);
    const scoreBadge = document.createElement("span");
    scoreBadge.className = "score-badge" + (score > 0 ? " score-badge--rated" : "");
    scoreBadge.textContent = score > 0 ? `${score} ${ovt("scoreUnit")}` : ovt("scoreUnrated");
    tdScore.appendChild(scoreBadge);

    const tdPath = document.createElement("td");
    tdPath.className = "col-path";
    tdPath.textContent = it.path;
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "path-copy";
    copyBtn.textContent = ovt("copyPath");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(it.path);
        setStatus(ovt("statusCopyOk"), false);
      } catch {
        setStatus(ovt("statusCopyFail"), true);
      }
    });
    tdPath.appendChild(copyBtn);

    const tdTags = document.createElement("td");
    tdTags.className = "col-tags";
    if (it.tags.length) {
      for (const t of it.tags) {
        const pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = t;
        tdTags.appendChild(pill);
      }
    } else {
      tdTags.textContent = "—";
      tdTags.style.color = "var(--muted)";
    }

    const tdNote = document.createElement("td");
    tdNote.className = "col-note";
    tdNote.textContent = it.note || "—";
    if (!it.note) tdNote.style.color = "var(--muted)";

    const tdAct = document.createElement("td");
    tdAct.className = "col-actions";
    const actWrap = document.createElement("div");
    actWrap.className = "ov-actions";

    const revealBtn = document.createElement("button");
    revealBtn.type = "button";
    revealBtn.className = "btn-reveal";
    revealBtn.textContent = ovt("btnReveal");
    revealBtn.title = ovt("titleReveal");
    revealBtn.addEventListener("click", () => revealPathInExplorer(it.path));

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-rename";
    renameBtn.textContent = ovt("btnRename");
    renameBtn.title = ovt("titleRename");
    renameBtn.addEventListener("click", () => renameTaggedFile(it.path));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-delete";
    delBtn.textContent = ovt("btnDelete");
    delBtn.title = ovt("titleDelete");
    delBtn.addEventListener("click", () => deleteTaggedEntry(it.path));

    actWrap.appendChild(revealBtn);
    actWrap.appendChild(renameBtn);
    actWrap.appendChild(delBtn);
    tdAct.appendChild(actWrap);

    tr.appendChild(tdKind);
    tr.appendChild(tdScore);
    tr.appendChild(tdPath);
    tr.appendChild(tdTags);
    tr.appendChild(tdNote);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  ovRootEl.appendChild(wrap);
}

function applyFilterAndRender() {
  const needle = ovFilterEl.value.trim().toLowerCase();
  const filtered = cachedItems.filter(
    (it) => matchesNeedle(it, needle) && matchesActiveTags(it) && matchesKindFilter(it),
  );
  renderRows(filtered);
  ovSummaryEl.classList.remove("hidden");
  const total = cachedItems.length;
  const n = filtered.length;
  const kindWant = ovKindFilterEl ? ovKindFilterEl.value.trim() : "";
  const kindHint =
    kindWant === "image"
      ? ovt("hintKindImage")
      : kindWant === "video"
        ? ovt("hintKindVideo")
        : kindWant === "other"
          ? ovt("hintKindOther")
          : "";
  const tagModeHint = activeTags.length ? ovt("hintTagMode", tagMatchMode.toUpperCase()) : "";
  if (!needle && !activeTags.length && !kindHint) {
    ovSummaryEl.textContent = ovt("summaryOnly", total);
  } else {
    const hints = [];
    if (activeTags.length) {
      hints.push(ovt("hintTags", activeTags));
      hints.push(tagModeHint);
    }
    if (needle) hints.push(ovt("hintNeedle"));
    if (kindHint) hints.push(kindHint);
    ovSummaryEl.textContent = ovt("summaryFiltered", total, n, hints);
  }
  lastIdleStatusMessage = ovSummaryEl.textContent;
  saveOverviewSession();
}

async function deleteTaggedEntry(filePath) {
  const msg = ovt("confirmDelete", filePath);
  if (!confirm(msg)) return;
  ovStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/file-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, delete: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || ovt("statusDeleteFail"), true);
      return;
    }
    await loadOverview();
    setStatus(ovt("statusDeleteOk"), false);
  } catch (e) {
    setStatus(e.message || ovt("statusRequestFail"), true);
  }
}

async function revealPathInExplorer(filePath) {
  ovStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || ovt("statusRevealFail"), true);
      return;
    }
    if (revealStatusTimer) {
      clearTimeout(revealStatusTimer);
      revealStatusTimer = 0;
    }
    setStatus(ovt("statusRevealSent"), false);
    revealStatusTimer = setTimeout(() => {
      revealStatusTimer = 0;
      if (
        ovStatusEl.textContent.startsWith(ovt("statusRevealSent")) &&
        !ovStatusEl.classList.contains("error")
      ) {
        setStatus(lastIdleStatusMessage, false);
      }
    }, 3500);
  } catch (err) {
    setStatus(err.message || ovt("statusRequestFail"), true);
  }
}

async function loadOverview() {
  setStatus(ovt("statusLoad"), false);
  ovRootEl.innerHTML = "";
  ovSummaryEl.classList.add("hidden");
  try {
    const res = await fetch("/api/tagged-overview");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || ovt("statusLoadFail"), true);
      return;
    }
    cachedItems = Array.isArray(data.items) ? data.items : [];
    setStatus("", false);

    if (!appliedUrlTagOnce) {
      let wantTags = qp
        .getAll("tag")
        .map((x) => String(x).trim())
        .filter(Boolean);
      if (!wantTags.length && pendingSessionOvTags.length) {
        wantTags = pendingSessionOvTags;
      }
      if (wantTags.length) {
        const uniqLows = new Set(wantTags.map((x) => x.toLowerCase()));
        const hits = collectUniqueTags().filter((x) => uniqLows.has(x.toLowerCase()));
        activeTags = hits;
      }
      appliedUrlTagOnce = true;
    } else if (activeTags.length) {
      const stillSet = new Set(collectUniqueTags().map((x) => x.toLowerCase()));
      activeTags = activeTags.filter((x) => stillSet.has(x.toLowerCase()));
    }

    renderTagChips();
    applyFilterAndRender();
  } catch (e) {
    setStatus(e.message || ovt("statusNetworkErr"), true);
  }
}

let filterDebounce = 0;
ovFilterEl.addEventListener("input", () => {
  if (filterDebounce) clearTimeout(filterDebounce);
  filterDebounce = setTimeout(() => {
    filterDebounce = 0;
    applyFilterAndRender();
  }, 200);
});

ovRefreshEl.addEventListener("click", loadOverview);
ovToggleContentEl?.addEventListener("click", () => {
  contentCollapsed = !contentCollapsed;
  applyContentCollapsedUi();
  saveOverviewSession();
});

ovKindFilterEl?.addEventListener("change", () => {
  applyFilterAndRender();
});
ovTagModeEl?.addEventListener("change", () => {
  tagMatchMode = normalizeTagMatchMode(ovTagModeEl.value);
  applyFilterAndRender();
});

const qp = new URLSearchParams(window.location.search);
const preQ = qp.get("q");
if (preQ) {
  ovFilterEl.value = preQ;
} else {
  try {
    const ov = JSON.parse(sessionStorage.getItem(OVERVIEW_SESSION_KEY) || "null");
    if (ov && typeof ov.filter === "string") {
      ovFilterEl.value = ov.filter;
    }
    if (ov && Array.isArray(ov.activeTags) && !qp.get("tag")) {
      pendingSessionOvTags = ov.activeTags
        .map((x) => String(x || "").trim())
        .filter(Boolean);
    } else if (ov && typeof ov.activeTag === "string" && !qp.get("tag")) {
      // 兼容旧版 session（单标签）
      const oldTag = ov.activeTag.trim();
      if (oldTag) pendingSessionOvTags = [oldTag];
    }
    if (ov && typeof ov.kindFilter === "string" && ovKindFilterEl) {
      ovKindFilterEl.value = ov.kindFilter;
    }
    if (ov && typeof ov.tagMatchMode === "string") {
      tagMatchMode = normalizeTagMatchMode(ov.tagMatchMode);
    }
    if (ov && typeof ov.contentCollapsed === "boolean") contentCollapsed = ov.contentCollapsed;
  } catch {
    /* ignore */
  }
}
tagMatchMode = normalizeTagMatchMode(qp.get("tagMode") || tagMatchMode);
if (ovTagModeEl) ovTagModeEl.value = tagMatchMode;

document.addEventListener("pagehide", () => {
  saveOverviewSession();
});

ovBackToTopBtnEl?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
window.addEventListener("scroll", updateOverviewBackToTopVisibility, { passive: true });

loadOverview();
applyContentCollapsedUi();
updateOverviewBackToTopVisibility();
