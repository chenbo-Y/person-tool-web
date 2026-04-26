const mangaDirPathEl = document.getElementById("mangaDirPath");
const mangaLoadBtnEl = document.getElementById("mangaLoadBtn");
const mangaLayoutEl = document.getElementById("mangaLayout");
const comicStripEl = document.getElementById("comicStrip");
const mangaStatusEl = document.getElementById("mangaStatus");
const mangaBulkBarEl = document.getElementById("mangaBulkBar");
const mangaSelectAllEl = document.getElementById("mangaSelectAll");
const mangaSelectNoneEl = document.getElementById("mangaSelectNone");
const mangaDeleteSelectedEl = document.getElementById("mangaDeleteSelected");
const mangaSelectedCountEl = document.getElementById("mangaSelectedCount");

const LAYOUT_STORAGE_KEY = "mangaReader.layout";
const LAYOUT_ALLOWED = new Set(["vertical", "grid-2", "grid-3", "grid-4"]);
const MANGA_SESSION_KEY = "kwWeb.manga";

let lastBrowseSummary = "";
let revealStatusTimer = 0;
let mangaDirSaveTimer = 0;
const mangaLang = String(window.__kwLang || "zh-CN");
const MANGA_UI = {
  "zh-CN": {
    selectedCount: (n) => `已选 ${n} 项`,
    selectAria: (name) => `选择：${name}`,
    pageNo: (i, total) => `第 ${i} / ${total} 页`,
    imageBtnTitle: "点击在资源管理器中定位到此文件",
    imageBtnAria: (name) => `在资源管理器中打开：${name}`,
    openInExplorer: "在资源管理器中打开",
    deleteFile: "删除文件",
    deleteTitle: "从磁盘永久删除此图片",
    confirmDeleteOne: (name) =>
      `确定永久删除此文件？\n\n${name}\n\n将从磁盘彻底删除，不可撤销；已保存的标签记录也会一并移除。`,
    statusDeleteFail: "删除失败",
    statusDeleted: "已删除文件",
    statusRequestFail: "请求失败",
    previewMore: (n) => `\n… 共 ${n} 个文件`,
    confirmDeleteSelected: (n, preview) =>
      `确定永久删除选中的 ${n} 个文件？\n\n${preview}\n\n将从磁盘彻底删除，不可撤销。`,
    statusBatchDone: (ok, fail, firstErr) => `已删除 ${ok} 个，失败 ${fail} 个。${firstErr || ""}`,
    statusBatchAllDone: (ok) => `已删除 ${ok} 个文件`,
    statusBatchErr: "批量删除异常",
    statusRevealFail: "无法在资源管理器中打开",
    statusRevealSent: "已发送打开资源管理器请求（若未弹出请查看是否被其它窗口遮挡）",
    statusNeedDir: "请先填写图片目录路径",
    statusLoading: "加载中…",
    statusLoadFail: "加载失败",
    statusSummary: (total, count) => `共 ${total} 张，本次按顺序展示 ${count} 张。`,
    statusTruncated: "（已达单次上限，其余未加载）",
    statusNoSupported: "当前目录下没有支持的图片（jpg / png / gif / webp / bmp / svg / ico / avif / jxl）。",
    statusNetworkErr: "网络错误",
  },
  en: {
    selectedCount: (n) => `${n} selected`,
    selectAria: (name) => `Select: ${name}`,
    pageNo: (i, total) => `Page ${i} / ${total}`,
    imageBtnTitle: "Click to reveal this file in Explorer",
    imageBtnAria: (name) => `Reveal in Explorer: ${name}`,
    openInExplorer: "Reveal in Explorer",
    deleteFile: "Delete File",
    deleteTitle: "Permanently delete this image from disk",
    confirmDeleteOne: (name) =>
      `Delete this file permanently?\n\n${name}\n\nThis will be removed from disk and cannot be undone. Saved tag records will also be removed.`,
    statusDeleteFail: "Delete failed",
    statusDeleted: "File deleted",
    statusRequestFail: "Request failed",
    previewMore: (n) => `\n... total ${n} files`,
    confirmDeleteSelected: (n, preview) =>
      `Delete ${n} selected files permanently?\n\n${preview}\n\nThis will remove them from disk and cannot be undone.`,
    statusBatchDone: (ok, fail, firstErr) => `Deleted ${ok}, failed ${fail}. ${firstErr || ""}`,
    statusBatchAllDone: (ok) => `Deleted ${ok} files`,
    statusBatchErr: "Batch delete failed",
    statusRevealFail: "Cannot open in File Explorer",
    statusRevealSent: "Reveal request sent (if no window appears, it may be behind other windows)",
    statusNeedDir: "Please enter an image directory path first",
    statusLoading: "Loading...",
    statusLoadFail: "Load failed",
    statusSummary: (total, count) => `${total} images found, showing ${count}.`,
    statusTruncated: " (hit page limit; remaining items are not loaded)",
    statusNoSupported:
      "No supported images found in this directory (jpg / png / gif / webp / bmp / svg / ico / avif / jxl).",
    statusNetworkErr: "Network error",
  },
  ja: {
    selectedCount: (n) => `${n} 件選択`,
    selectAria: (name) => `選択：${name}`,
    pageNo: (i, total) => `${i} / ${total} ページ`,
    imageBtnTitle: "クリックしてエクスプローラーで表示",
    imageBtnAria: (name) => `エクスプローラーで開く：${name}`,
    openInExplorer: "エクスプローラーで開く",
    deleteFile: "ファイル削除",
    deleteTitle: "この画像をディスクから完全削除",
    confirmDeleteOne: (name) =>
      `このファイルを完全削除しますか？\n\n${name}\n\nディスクから完全削除され、元に戻せません。保存済みタグ記録も削除されます。`,
    statusDeleteFail: "削除に失敗しました",
    statusDeleted: "ファイルを削除しました",
    statusRequestFail: "リクエスト失敗",
    previewMore: (n) => `\n… 合計 ${n} ファイル`,
    confirmDeleteSelected: (n, preview) =>
      `選択した ${n} ファイルを完全削除しますか？\n\n${preview}\n\nディスクから完全削除され、元に戻せません。`,
    statusBatchDone: (ok, fail, firstErr) => `${ok} 件削除、${fail} 件失敗。${firstErr || ""}`,
    statusBatchAllDone: (ok) => `${ok} 件のファイルを削除しました`,
    statusBatchErr: "一括削除でエラーが発生しました",
    statusRevealFail: "エクスプローラーで開けません",
    statusRevealSent: "エクスプローラー表示リクエストを送信しました（表示されない場合は他ウィンドウの背後を確認）",
    statusNeedDir: "先に画像ディレクトリを入力してください",
    statusLoading: "読み込み中…",
    statusLoadFail: "読み込み失敗",
    statusSummary: (total, count) => `画像は合計 ${total} 枚、今回 ${count} 枚を表示します。`,
    statusTruncated: "（件数上限に達したため残りは未読み込み）",
    statusNoSupported:
      "このディレクトリに対応画像がありません（jpg / png / gif / webp / bmp / svg / ico / avif / jxl）。",
    statusNetworkErr: "ネットワークエラー",
  },
};
function mt(key, ...args) {
  const v = (MANGA_UI[mangaLang] || MANGA_UI["zh-CN"])[key];
  if (typeof v === "function") return v(...args);
  return v || MANGA_UI["zh-CN"][key] || key;
}

function readMangaSession() {
  try {
    const raw = sessionStorage.getItem(MANGA_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

function writeMangaSession(partial) {
  try {
    const prev = readMangaSession() || {};
    sessionStorage.setItem(
      MANGA_SESSION_KEY,
      JSON.stringify({
        ...prev,
        ...partial,
        dir: mangaDirPathEl.value,
      }),
    );
  } catch {
    /* ignore */
  }
}

function parseLayoutValue(v) {
  if (v === "vertical") return { grid: false, cols: 1 };
  const m = /^grid-(\d+)$/.exec(String(v || ""));
  if (m) {
    const n = Math.min(4, Math.max(2, parseInt(m[1], 10)));
    return { grid: true, cols: n };
  }
  return { grid: false, cols: 1 };
}

function getLayoutFromSelect() {
  return parseLayoutValue(mangaLayoutEl.value);
}

function applyComicLayout() {
  const { grid, cols } = getLayoutFromSelect();
  comicStripEl.classList.toggle("comic-strip--grid", grid);
  if (grid) {
    comicStripEl.style.setProperty("--manga-cols", String(cols));
  } else {
    comicStripEl.style.removeProperty("--manga-cols");
  }
}

function saveLayoutPreference() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, mangaLayoutEl.value);
  } catch {
    /* ignore */
  }
}

function initLayoutFromStorageAndUrl() {
  const qpLayout = new URLSearchParams(window.location.search).get("layout");
  if (qpLayout && LAYOUT_ALLOWED.has(qpLayout)) {
    mangaLayoutEl.value = qpLayout;
    return;
  }
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (stored && LAYOUT_ALLOWED.has(stored)) {
      mangaLayoutEl.value = stored;
    }
  } catch {
    /* ignore */
  }
}

function setStatus(text, isError) {
  mangaStatusEl.textContent = text;
  mangaStatusEl.classList.toggle("error", Boolean(isError));
}

function setMangaBulkBarVisible(visible) {
  if (mangaBulkBarEl) mangaBulkBarEl.hidden = !visible;
}

function getSelectedComicPaths() {
  const out = [];
  comicStripEl.querySelectorAll(".comic-select-cb:checked").forEach((el) => {
    const p = el.dataset.path;
    if (p) out.push(p);
  });
  return out;
}

function updateMangaBulkUi() {
  const n = getSelectedComicPaths().length;
  if (mangaSelectedCountEl) {
    mangaSelectedCountEl.textContent = n ? mt("selectedCount", n) : "";
  }
  if (mangaDeleteSelectedEl) {
    mangaDeleteSelectedEl.disabled = n === 0 || mangaLoadBtnEl.disabled;
  }
}

/** 删除后全量重载前：取视口内「最靠上」的未删除页路径，用于重建后滚回原阅读位置 */
function getComicReloadScrollAnchor(deletedPaths) {
  const set = deletedPaths instanceof Set ? deletedPaths : new Set(deletedPaths || []);
  const pages = comicStripEl.querySelectorAll(".comic-page");
  const pathOf = (fig) => {
    const cb = fig.querySelector(".comic-select-cb");
    return (cb && cb.dataset.path) || "";
  };
  const vh = window.innerHeight;
  let bestPath = "";
  let bestTop = Infinity;
  pages.forEach((fig) => {
    const path = pathOf(fig);
    if (!path || set.has(path)) return;
    const r = fig.getBoundingClientRect();
    if (r.bottom < 72 || r.top > vh - 24) return;
    if (r.top < bestTop) {
      bestTop = r.top;
      bestPath = path;
    }
  });
  if (bestPath) return bestPath;
  for (const fig of pages) {
    const path = pathOf(fig);
    if (path && !set.has(path)) return path;
  }
  return "";
}

function scrollComicStripToPath(filePath) {
  if (!filePath || !comicStripEl) return;
  let fig = null;
  comicStripEl.querySelectorAll(".comic-select-cb").forEach((cb) => {
    if (cb.dataset.path === filePath) fig = cb.closest(".comic-page");
  });
  if (!fig) return;
  const run = () => {
    fig.scrollIntoView({ block: "start", behavior: "auto" });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

async function deleteImageOnServer(filePath) {
  const res = await fetch("/api/delete-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, kind: "image" }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error || res.statusText };
}

async function deleteComicFile(filePath, displayName) {
  const msg = mt("confirmDeleteOne", displayName);
  if (!confirm(msg)) return;
  if (mangaLoadBtnEl.disabled) return;
  mangaStatusEl.classList.remove("error");
  try {
    const { ok, error } = await deleteImageOnServer(filePath);
    if (!ok) {
      setStatus(error || mt("statusDeleteFail"), true);
      return;
    }
    setStatus(mt("statusDeleted"), false);
    const anchor = getComicReloadScrollAnchor(new Set([filePath]));
    await loadComicImages({ scrollAnchorPath: anchor });
  } catch (err) {
    setStatus(err.message || mt("statusRequestFail"), true);
  }
}

async function deleteSelectedComicFiles() {
  const paths = getSelectedComicPaths();
  if (!paths.length || mangaLoadBtnEl.disabled) return;
  const basenames = paths.map((p) => {
    const s = p.replace(/\\/g, "/");
    const i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(i + 1) : s;
  });
  const preview =
    basenames.length <= 8
      ? basenames.join("\n")
      : basenames.slice(0, 8).join("\n") + mt("previewMore", paths.length);
  const msg = mt("confirmDeleteSelected", paths.length, preview);
  if (!confirm(msg)) return;
  mangaStatusEl.classList.remove("error");
  const deletedSet = new Set(paths);
  const anchor = getComicReloadScrollAnchor(deletedSet);
  mangaLoadBtnEl.disabled = true;
  if (mangaDeleteSelectedEl) mangaDeleteSelectedEl.disabled = true;
  let okCount = 0;
  const errors = [];
  try {
    for (const p of paths) {
      const r = await deleteImageOnServer(p);
      if (r.ok) okCount += 1;
      else errors.push(`${p}: ${r.error}`);
    }
    if (errors.length) {
      setStatus(mt("statusBatchDone", okCount, errors.length, errors[0] || ""), true);
    } else {
      setStatus(mt("statusBatchAllDone", okCount), false);
    }
    await loadComicImages({ scrollAnchorPath: anchor });
  } catch (e) {
    setStatus(e.message || mt("statusBatchErr"), true);
    await loadComicImages({ scrollAnchorPath: anchor });
  } finally {
    mangaLoadBtnEl.disabled = false;
    updateMangaBulkUi();
  }
}

async function revealPathInExplorer(filePath) {
  mangaStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || mt("statusRevealFail"), true);
      return;
    }
    if (revealStatusTimer) {
      clearTimeout(revealStatusTimer);
      revealStatusTimer = 0;
    }
    setStatus(mt("statusRevealSent"), false);
    revealStatusTimer = setTimeout(() => {
      revealStatusTimer = 0;
      if (
        mangaStatusEl.textContent.startsWith(mt("statusRevealSent")) &&
        !mangaStatusEl.classList.contains("error")
      ) {
        setStatus(lastBrowseSummary, false);
      }
    }, 3500);
  } catch (err) {
    setStatus(err.message || mt("statusRequestFail"), true);
  }
}

/**
 * @param {{ scrollAnchorPath?: string }} [opts]
 */
async function loadComicImages(opts = {}) {
  const scrollAnchorPath = opts.scrollAnchorPath || "";
  const p = mangaDirPathEl.value.trim();
  if (revealStatusTimer) {
    clearTimeout(revealStatusTimer);
    revealStatusTimer = 0;
  }
  comicStripEl.innerHTML = "";
  lastBrowseSummary = "";
  setStatus("", false);
  setMangaBulkBarVisible(false);
  updateMangaBulkUi();
  if (!p) {
    setStatus(mt("statusNeedDir"), true);
    return;
  }

  mangaLoadBtnEl.disabled = true;
  setStatus(mt("statusLoading"), false);
  try {
    const res = await fetch("/api/images-in-dir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || mt("statusLoadFail"), true);
      writeMangaSession({ dir: p, stripLoaded: false });
      return;
    }
    let msg = mt("statusSummary", data.totalImages, data.count);
    if (data.truncated) {
      msg += mt("statusTruncated");
    }
    if (!data.files?.length) {
      setStatus(
        mt("statusNoSupported"),
        false,
      );
      writeMangaSession({ dir: p, stripLoaded: false });
      return;
    }
    lastBrowseSummary = msg;
    setStatus(msg, false);
    setMangaBulkBarVisible(true);

    const frag = document.createDocumentFragment();
    data.files.forEach((f, i) => {
      const fig = document.createElement("figure");
      fig.className = "comic-page";
      const topRow = document.createElement("div");
      topRow.className = "comic-page-top";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "comic-select-cb";
      cb.dataset.path = f.path;
      cb.setAttribute("aria-label", mt("selectAria", f.name));
      cb.addEventListener("change", updateMangaBulkUi);
      const no = document.createElement("span");
      no.className = "page-no";
      no.textContent = mt("pageNo", i + 1, data.files.length);
      topRow.appendChild(cb);
      topRow.appendChild(no);
      const imgBtn = document.createElement("button");
      imgBtn.type = "button";
      imgBtn.className = "comic-img-btn";
      imgBtn.title = mt("imageBtnTitle");
      imgBtn.setAttribute("aria-label", mt("imageBtnAria", f.name));
      const img = document.createElement("img");
      img.loading = i < 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.alt = f.name;
      img.draggable = false;
      img.src = `/api/image-file?path=${encodeURIComponent(f.path)}`;
      imgBtn.appendChild(img);
      imgBtn.addEventListener("click", () => revealPathInExplorer(f.path));

      const openRow = document.createElement("div");
      openRow.className = "comic-open-row";
      const openLocBtn = document.createElement("button");
      openLocBtn.type = "button";
      openLocBtn.className = "comic-open-loc";
      openLocBtn.textContent = mt("openInExplorer");
      openLocBtn.addEventListener("click", () => revealPathInExplorer(f.path));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "comic-file-del";
      delBtn.textContent = mt("deleteFile");
      delBtn.title = mt("deleteTitle");
      delBtn.addEventListener("click", () => deleteComicFile(f.path, f.name));

      const cap = document.createElement("figcaption");
      cap.textContent = f.name;

      fig.appendChild(topRow);
      fig.appendChild(imgBtn);
      openRow.appendChild(openLocBtn);
      openRow.appendChild(delBtn);
      fig.appendChild(openRow);
      fig.appendChild(cap);
      if (typeof window.createFileTagPanel === "function") {
        fig.appendChild(
          window.createFileTagPanel(
            f.path,
            f.fileTags || [],
            f.fileNote || "",
            f.fileScore || 0,
            mangaStatusEl,
          ),
        );
      }
      frag.appendChild(fig);
    });
    comicStripEl.appendChild(frag);
    applyComicLayout();
    writeMangaSession({ dir: p, stripLoaded: true });
    updateMangaBulkUi();
    if (scrollAnchorPath) {
      scrollComicStripToPath(scrollAnchorPath);
    }
  } catch (err) {
    setStatus(err.message || mt("statusNetworkErr"), true);
  } finally {
    mangaLoadBtnEl.disabled = false;
  }
}

mangaLoadBtnEl.addEventListener("click", loadComicImages);

mangaSelectAllEl?.addEventListener("click", () => {
  comicStripEl.querySelectorAll(".comic-select-cb").forEach((el) => {
    el.checked = true;
  });
  updateMangaBulkUi();
});

mangaSelectNoneEl?.addEventListener("click", () => {
  comicStripEl.querySelectorAll(".comic-select-cb").forEach((el) => {
    el.checked = false;
  });
  updateMangaBulkUi();
});

mangaDeleteSelectedEl?.addEventListener("click", () => {
  deleteSelectedComicFiles();
});

mangaDirPathEl.addEventListener("input", () => {
  if (mangaDirSaveTimer) clearTimeout(mangaDirSaveTimer);
  mangaDirSaveTimer = setTimeout(() => {
    mangaDirSaveTimer = 0;
    writeMangaSession({ stripLoaded: false });
  }, 400);
});

document.addEventListener("pagehide", () => {
  writeMangaSession({});
});

mangaLayoutEl.addEventListener("change", () => {
  applyComicLayout();
  saveLayoutPreference();
});

initLayoutFromStorageAndUrl();
applyComicLayout();

const qp = new URLSearchParams(window.location.search);
const prePath = qp.get("path");
if (prePath) {
  mangaDirPathEl.value = prePath;
  loadComicImages();
} else {
  const sess = readMangaSession();
  if (sess?.dir && typeof sess.dir === "string") {
    mangaDirPathEl.value = sess.dir;
    if (sess.stripLoaded) {
      loadComicImages();
    }
  }
}
