const videoDirPathEl = document.getElementById("videoDirPath");
const videoLoadBtnEl = document.getElementById("videoLoadBtn");
const videoListEl = document.getElementById("videoList");
const videoStatusEl = document.getElementById("videoStatus");
const backToTopBtnEl = document.getElementById("backToTopBtn");

const VIDEO_SESSION_KEY = "kwWeb.video";

let lastBrowseSummary = "";
let revealStatusTimer = 0;
let videoDirSaveTimer = 0;
const videoLang = String(window.__kwLang || "zh-CN");
const VIDEO_UI = {
  "zh-CN": {
    openInExplorer: "在资源管理器中打开",
    rename: "重命名",
    renameTitle: "在同一文件夹内重命名该文件（标签会随路径迁移）",
    deleteFile: "删除文件",
    deleteTitle: "从磁盘永久删除此视频",
    promptRename:
      "请输入新文件名（仅改文件名，不改变所在文件夹；不含 \\ / : 等路径字符；建议保留原扩展名如 .mp4）",
    statusEmptyName: "已取消：文件名为空",
    statusUnchanged: "名称未变化",
    statusRenameFail: "重命名失败",
    statusRenameOk: "重命名成功",
    statusRequestFail: "请求失败",
    confirmDelete: (name) =>
      `确定永久删除此文件？\n\n${name}\n\n将从磁盘彻底删除，不可撤销；已保存的标签记录也会一并移除。`,
    statusDeleteFail: "删除失败",
    statusDeleted: "已删除文件",
    statusRevealFail: "无法在资源管理器中打开",
    statusRevealSent: "已发送打开资源管理器请求（若未弹出请查看是否被其它窗口遮挡）",
    statusPlayErr: "无法播放（加载或解码失败）。",
    statusPlayUnsupported: "浏览器不支持该编码或容器。",
    statusPlayDecode: "解码失败（常见于 ProRes、部分 HEVC、旧编码）。",
    statusPlayNetwork: "读取失败或连接中断。",
    statusPlayHelp: "请点「在资源管理器中打开」用 VLC、PotPlayer 等本地播放。",
    statusNeedDir: "请先填写视频目录路径",
    statusLoading: "加载中…",
    statusLoadFail: "加载失败",
    statusSummary: (total, count) => `共 ${total} 个视频文件，本次按顺序展示 ${count} 个。`,
    statusTruncated: "（已达单次上限，其余未加载）",
    statusNoSupported: "当前目录下没有支持的视频格式（见页头说明：mp4、webm、mov 等）。",
    statusItemIndex: (i, total) => `第 ${i} / ${total} 个`,
    statusBrowserNoHtml5: "您的浏览器不支持 HTML5 视频，可在资源管理器中打开文件后用本地播放器观看。",
    statusNetworkErr: "网络错误",
  },
  en: {
    openInExplorer: "Reveal in Explorer",
    rename: "Rename",
    renameTitle: "Rename in same folder (tags migrate with path)",
    deleteFile: "Delete File",
    deleteTitle: "Permanently delete this video from disk",
    promptRename:
      "Enter a new filename (same folder only; no \\ / : etc.; keep extension like .mp4 when needed)",
    statusEmptyName: "Cancelled: empty file name",
    statusUnchanged: "Name unchanged",
    statusRenameFail: "Rename failed",
    statusRenameOk: "Renamed",
    statusRequestFail: "Request failed",
    confirmDelete: (name) =>
      `Delete this file permanently?\n\n${name}\n\nThis will remove it from disk and cannot be undone. Saved tag records will also be removed.`,
    statusDeleteFail: "Delete failed",
    statusDeleted: "File deleted",
    statusRevealFail: "Cannot open in File Explorer",
    statusRevealSent: "Reveal request sent (if no window appears, it may be behind other windows)",
    statusPlayErr: "Cannot play (load or decode failed).",
    statusPlayUnsupported: "Browser does not support this codec/container.",
    statusPlayDecode: "Decode failed (common with ProRes, some HEVC, or legacy codecs).",
    statusPlayNetwork: "Read failed or connection interrupted.",
    statusPlayHelp: 'Please click "Reveal in Explorer" and use a local player such as VLC or PotPlayer.',
    statusNeedDir: "Please enter a video directory path first",
    statusLoading: "Loading...",
    statusLoadFail: "Load failed",
    statusSummary: (total, count) => `${total} video files found, showing ${count}.`,
    statusTruncated: " (hit page limit; remaining items are not loaded)",
    statusNoSupported: "No supported video formats found in this directory (see header: mp4, webm, mov, etc.).",
    statusItemIndex: (i, total) => `Item ${i} / ${total}`,
    statusBrowserNoHtml5:
      "Your browser does not support HTML5 video. Open in File Explorer and play with a local player.",
    statusNetworkErr: "Network error",
  },
  ja: {
    openInExplorer: "エクスプローラーで開く",
    rename: "名前変更",
    renameTitle: "同一フォルダ内でリネーム（タグは移行）",
    deleteFile: "ファイル削除",
    deleteTitle: "この動画をディスクから完全削除",
    promptRename:
      "新しいファイル名を入力してください（同一フォルダ内のみ、\\ / : など不可。必要なら拡張子 .mp4 などを維持）",
    statusEmptyName: "キャンセル：ファイル名が空です",
    statusUnchanged: "名前は変更されていません",
    statusRenameFail: "名前変更に失敗しました",
    statusRenameOk: "名前を変更しました",
    statusRequestFail: "リクエスト失敗",
    confirmDelete: (name) =>
      `このファイルを完全削除しますか？\n\n${name}\n\nディスクから完全削除され、元に戻せません。保存済みタグ記録も削除されます。`,
    statusDeleteFail: "削除に失敗しました",
    statusDeleted: "ファイルを削除しました",
    statusRevealFail: "エクスプローラーで開けません",
    statusRevealSent: "エクスプローラー表示リクエストを送信しました（表示されない場合は他ウィンドウの背後を確認）",
    statusPlayErr: "再生できません（読み込みまたはデコード失敗）。",
    statusPlayUnsupported: "このコーデック/コンテナはブラウザ非対応です。",
    statusPlayDecode: "デコード失敗（ProRes、一部 HEVC、旧コーデックで発生しやすい）。",
    statusPlayNetwork: "読み込み失敗または接続中断。",
    statusPlayHelp:
      "「エクスプローラーで開く」を押して VLC や PotPlayer などのローカルプレイヤーで再生してください。",
    statusNeedDir: "先に動画ディレクトリを入力してください",
    statusLoading: "読み込み中…",
    statusLoadFail: "読み込み失敗",
    statusSummary: (total, count) => `動画ファイルは合計 ${total} 件、今回 ${count} 件を表示します。`,
    statusTruncated: "（件数上限に達したため残りは未読み込み）",
    statusNoSupported: "このディレクトリに対応動画形式がありません（ヘッダー参照：mp4、webm、mov など）。",
    statusItemIndex: (i, total) => `${i} / ${total}`,
    statusBrowserNoHtml5:
      "このブラウザは HTML5 動画に対応していません。エクスプローラーで開いてローカルプレイヤーで再生してください。",
    statusNetworkErr: "ネットワークエラー",
  },
};
function vt(key) {
  return (VIDEO_UI[videoLang] || VIDEO_UI["zh-CN"])[key] || VIDEO_UI["zh-CN"][key] || key;
}

function updateBackToTopVisibility() {
  // 滚动超过阈值后显示“回到顶部”按钮
  if (!backToTopBtnEl) return;
  backToTopBtnEl.hidden = window.scrollY < 360;
}

function readVideoSession() {
  try {
    const raw = sessionStorage.getItem(VIDEO_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

function writeVideoSession(partial) {
  try {
    const prev = readVideoSession() || {};
    sessionStorage.setItem(
      VIDEO_SESSION_KEY,
      JSON.stringify({
        ...prev,
        ...partial,
        dir: videoDirPathEl.value,
      }),
    );
  } catch {
    /* ignore */
  }
}

function setStatus(text, isError) {
  videoStatusEl.textContent = text;
  videoStatusEl.classList.toggle("error", Boolean(isError));
}

function fileBasename(fullPath) {
  const n = String(fullPath || "").replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  return i >= 0 ? n.slice(i + 1) : n;
}

function scrollVideoListToPath(filePath) {
  if (!filePath || !videoListEl) return;
  let fig = null;
  videoListEl.querySelectorAll(".video-item").forEach((el) => {
    if (el.dataset.videoPath === filePath) fig = el;
  });
  if (!fig) return;
  const run = () => {
    fig.scrollIntoView({ block: "start", behavior: "auto" });
  };
  // 双 RAF：等待 DOM 与布局稳定后再滚动，减少“跳两次”的视觉抖动
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

async function renameVideoFile(filePath) {
  // 仅允许同目录改名，实际校验在后端 /api/rename-file
  const current = fileBasename(filePath);
  const input = window.prompt(
    vt("promptRename"),
    current,
  );
  if (input === null) return;
  const newName = input.trim();
  if (!newName) {
    setStatus(vt("statusEmptyName"), true);
    return;
  }
  if (newName === current) {
    setStatus(vt("statusUnchanged"), false);
    return;
  }
  if (videoLoadBtnEl.disabled) return;
  videoStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/rename-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, newName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || vt("statusRenameFail"), true);
      return;
    }
    setStatus(data.unchanged ? vt("statusUnchanged") : vt("statusRenameOk"), false);
    if (data.unchanged) return;
    const anchor = typeof data.path === "string" ? data.path : "";
    await loadVideos({ scrollAnchorPath: anchor });
  } catch (e) {
    setStatus(e.message || vt("statusRequestFail"), true);
  }
}

async function deleteVideoFile(filePath, displayName) {
  const msg = vt("confirmDelete", displayName);
  if (!confirm(msg)) return;
  if (videoLoadBtnEl.disabled) return;
  videoStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/delete-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, kind: "video" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || vt("statusDeleteFail"), true);
      return;
    }
    setStatus(vt("statusDeleted"), false);
    await loadVideos();
  } catch (err) {
    setStatus(err.message || vt("statusRequestFail"), true);
  }
}

async function revealPathInExplorer(filePath) {
  videoStatusEl.classList.remove("error");
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || vt("statusRevealFail"), true);
      return;
    }
    if (revealStatusTimer) {
      clearTimeout(revealStatusTimer);
      revealStatusTimer = 0;
    }
    setStatus(vt("statusRevealSent"), false);
    // 临时提示几秒后自动恢复为浏览摘要文案
    revealStatusTimer = setTimeout(() => {
      revealStatusTimer = 0;
      if (
        videoStatusEl.textContent.startsWith(vt("statusRevealSent")) &&
        !videoStatusEl.classList.contains("error")
      ) {
        setStatus(lastBrowseSummary, false);
      }
    }, 3500);
  } catch (err) {
    setStatus(err.message || vt("statusRequestFail"), true);
  }
}

function videoSrcForPath(filePath) {
  return `/api/video-file?path=${encodeURIComponent(filePath)}`;
}

/** 供 <source type> 与常见浏览器行为对齐；与服务端 VIDEO_MIME 一致 */
function mimeTypeHintForFilename(name) {
  const ext = String(name).includes(".")
    ? String(name).slice(String(name).lastIndexOf(".") + 1).toLowerCase()
    : "";
  const map = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    ogg: "video/ogg",
  };
  return map[ext] || "video/mp4";
}

function attachVideoPlaybackHints(videoEl, fileName, captionEl) {
  videoEl.addEventListener("error", () => {
    const code = videoEl.error?.code;
    let tip = vt("statusPlayErr");
    if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      tip = vt("statusPlayUnsupported");
    } else if (code === MediaError.MEDIA_ERR_DECODE) {
      tip = vt("statusPlayDecode");
    } else if (code === MediaError.MEDIA_ERR_NETWORK) {
      tip = vt("statusPlayNetwork");
    }
    captionEl.textContent = "";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = fileName + " — ";
    const em = document.createElement("em");
    em.className = "video-playback-err";
    em.textContent = `${tip}${vt("statusPlayHelp")}`;
    captionEl.appendChild(nameSpan);
    captionEl.appendChild(em);
  });
}

/**
 * @param {{ scrollAnchorPath?: string }} [opts]
 */
async function loadVideos(opts = {}) {
  const scrollAnchorPath = opts.scrollAnchorPath || "";
  const p = videoDirPathEl.value.trim();
  if (revealStatusTimer) {
    clearTimeout(revealStatusTimer);
    revealStatusTimer = 0;
  }
  // 全量重绘列表（与目录当前状态保持一致）
  videoListEl.innerHTML = "";
  lastBrowseSummary = "";
  setStatus("", false);
  if (!p) {
    setStatus(vt("statusNeedDir"), true);
    return;
  }

  videoLoadBtnEl.disabled = true;
  setStatus(vt("statusLoading"), false);
  try {
    const res = await fetch("/api/videos-in-dir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || vt("statusLoadFail"), true);
      writeVideoSession({ dir: p, stripLoaded: false });
      return;
    }
    let msg = vt("statusSummary", data.totalVideos, data.count);
    if (data.truncated) {
      msg += vt("statusTruncated");
    }
    if (!data.files?.length) {
      setStatus(
        vt("statusNoSupported"),
        false,
      );
      writeVideoSession({ dir: p, stripLoaded: false });
      return;
    }
    lastBrowseSummary = msg;
    setStatus(msg, false);

    const frag = document.createDocumentFragment();
    data.files.forEach((f, i) => {
      const fig = document.createElement("figure");
      fig.className = "video-item";
      fig.dataset.videoPath = f.path;

      const idx = document.createElement("span");
      idx.className = "video-item-index";
      idx.textContent = vt("statusItemIndex", i + 1, data.files.length);

      const wrap = document.createElement("div");
      wrap.className = "video-wrap";
      const v = document.createElement("video");
      v.setAttribute("controls", "");
      v.setAttribute("preload", "metadata");
      v.setAttribute("playsinline", "");
      const srcEl = document.createElement("source");
      srcEl.src = videoSrcForPath(f.path);
      srcEl.type = mimeTypeHintForFilename(f.name);
      v.appendChild(srcEl);
      v.appendChild(
        document.createTextNode(
          vt("statusBrowserNoHtml5"),
        ),
      );
      wrap.appendChild(v);

      const openRow = document.createElement("div");
      openRow.className = "video-open-row";
      const openLocBtn = document.createElement("button");
      openLocBtn.type = "button";
      openLocBtn.className = "video-open-loc";
      openLocBtn.textContent = vt("openInExplorer");
      openLocBtn.addEventListener("click", () => revealPathInExplorer(f.path));

      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "video-file-rename";
      renameBtn.textContent = vt("rename");
      renameBtn.title = vt("renameTitle");
      renameBtn.addEventListener("click", () => renameVideoFile(f.path));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "video-file-del";
      delBtn.textContent = vt("deleteFile");
      delBtn.title = vt("deleteTitle");
      delBtn.addEventListener("click", () => deleteVideoFile(f.path, f.name));

      const cap = document.createElement("figcaption");
      cap.textContent = f.name;
      attachVideoPlaybackHints(v, f.name, cap);
      // 显式触发加载，避免个别浏览器懒初始化导致的首帧迟滞
      v.load();

      fig.appendChild(idx);
      fig.appendChild(wrap);
      openRow.appendChild(openLocBtn);
      openRow.appendChild(renameBtn);
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
            videoStatusEl,
          ),
        );
      }
      frag.appendChild(fig);
    });
    videoListEl.appendChild(frag);
    writeVideoSession({ dir: p, stripLoaded: true });
    if (scrollAnchorPath) {
      scrollVideoListToPath(scrollAnchorPath);
    }
  } catch (err) {
    setStatus(err.message || vt("statusNetworkErr"), true);
  } finally {
    videoLoadBtnEl.disabled = false;
  }
}

videoLoadBtnEl.addEventListener("click", loadVideos);

videoDirPathEl.addEventListener("input", () => {
  if (videoDirSaveTimer) clearTimeout(videoDirSaveTimer);
  videoDirSaveTimer = setTimeout(() => {
    videoDirSaveTimer = 0;
    writeVideoSession({ stripLoaded: false });
  }, 400);
});

document.addEventListener("pagehide", () => {
  writeVideoSession({});
});

backToTopBtnEl?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
updateBackToTopVisibility();

const qp = new URLSearchParams(window.location.search);
const prePath = qp.get("path");
if (prePath) {
  videoDirPathEl.value = prePath;
  loadVideos();
} else {
  const sess = readVideoSession();
  if (sess?.dir && typeof sess.dir === "string") {
    videoDirPathEl.value = sess.dir;
    if (sess.stripLoaded) {
      loadVideos();
    }
  }
}
