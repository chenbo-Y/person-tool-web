const form = document.getElementById("form");
const rootEl = document.getElementById("root");
const keywordEl = document.getElementById("keyword");
const caseEl = document.getElementById("case");
const regexEl = document.getElementById("regex");
const searchNameEl = document.getElementById("searchName");
const searchContentEl = document.getElementById("searchContent");
const encodingEl = document.getElementById("encoding");
const ignoreEl = document.getElementById("ignore");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const outEl = document.getElementById("out");
const submitBtn = document.getElementById("submit");
const recentListEl = document.getElementById("recentList");
const recentClearEl = document.getElementById("recentClear");
let revealStatusTimer = 0;

const RECENT_STORAGE_KEY = "keywordSearchWeb.recentKeywords";
const RECENT_MAX = 30;
const SEARCH_SESSION_KEY = "kwWeb.search";

function readSearchSession() {
  try {
    const raw = sessionStorage.getItem(SEARCH_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && typeof s === "object" ? s : null;
  } catch {
    return null;
  }
}

function writeSearchSession() {
  try {
    sessionStorage.setItem(
      SEARCH_SESSION_KEY,
      JSON.stringify({
        root: rootEl.value,
        keyword: keywordEl.value,
        caseSensitive: caseEl.checked,
        useRegex: regexEl.checked,
        searchFileName: searchNameEl.checked,
        searchContent: searchContentEl.checked,
        encoding: encodingEl.value,
        ignore: ignoreEl.value,
      }),
    );
  } catch {
    /* ignore */
  }
}

function restoreSearchSession() {
  const s = readSearchSession();
  if (!s) return;
  if (typeof s.root === "string") rootEl.value = s.root;
  if (typeof s.keyword === "string") keywordEl.value = s.keyword;
  if (typeof s.caseSensitive === "boolean") caseEl.checked = s.caseSensitive;
  if (typeof s.useRegex === "boolean") regexEl.checked = s.useRegex;
  if (typeof s.searchFileName === "boolean") searchNameEl.checked = s.searchFileName;
  if (typeof s.searchContent === "boolean") searchContentEl.checked = s.searchContent;
  if (typeof s.encoding === "string") encodingEl.value = s.encoding;
  if (typeof s.ignore === "string") ignoreEl.value = s.ignore;
  syncEncodingFieldState();
}

function loadRecentKeywords() {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentKeywords(list) {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

function addRecentKeyword(kw) {
  const t = kw.trim();
  if (!t) return;
  const next = [t, ...loadRecentKeywords().filter((x) => x !== t)];
  saveRecentKeywords(next);
  renderRecentKeywords();
}

function removeRecentKeyword(kw) {
  saveRecentKeywords(loadRecentKeywords().filter((x) => x !== kw));
  renderRecentKeywords();
}

function renderRecentKeywords() {
  const items = loadRecentKeywords();
  recentListEl.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "recent-empty";
    empty.textContent = "暂无记录（成功搜索后会自动加入）";
    recentListEl.appendChild(empty);
    return;
  }
  for (const text of items) {
    const chip = document.createElement("div");
    chip.className = "recent-chip";
    const label = document.createElement("button");
    label.type = "button";
    label.className = "recent-chip-text";
    label.textContent = text;
    label.title = "填入关键字框";
    label.addEventListener("click", () => {
      keywordEl.value = text;
      keywordEl.focus();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "recent-chip-del";
    del.setAttribute("aria-label", "删除此条");
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      removeRecentKeyword(text);
    });
    chip.appendChild(label);
    chip.appendChild(del);
    recentListEl.appendChild(chip);
  }
}

recentClearEl.addEventListener("click", () => {
  if (!loadRecentKeywords().length) return;
  if (!confirm("确定清空本页保存的全部最近关键字？")) return;
  saveRecentKeywords([]);
  renderRecentKeywords();
});

renderRecentKeywords();

function syncEncodingFieldState() {
  encodingEl.disabled = !searchContentEl.checked;
}

searchContentEl.addEventListener("change", syncEncodingFieldState);
syncEncodingFieldState();
restoreSearchSession();

document.addEventListener("pagehide", () => {
  writeSearchSession();
});

async function revealPathInExplorer(filePath) {
  statusEl.classList.remove("error");
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data.error || "无法在资源管理器中打开";
      statusEl.classList.add("error");
      return;
    }
    if (revealStatusTimer) {
      clearTimeout(revealStatusTimer);
      revealStatusTimer = 0;
    }
    statusEl.textContent = "已发送打开资源管理器请求（若未弹出请查看是否被其它窗口遮挡）";
    revealStatusTimer = setTimeout(() => {
      revealStatusTimer = 0;
      if (
        statusEl.textContent.startsWith("已发送打开资源管理器") &&
        !statusEl.classList.contains("error")
      ) {
        statusEl.textContent = "完成";
      }
    }, 3500);
  } catch (err) {
    statusEl.textContent = err.message || "请求失败";
    statusEl.classList.add("error");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (revealStatusTimer) {
    clearTimeout(revealStatusTimer);
    revealStatusTimer = 0;
  }
  statusEl.textContent = "搜索中…";
  statusEl.classList.remove("error");
  summaryEl.classList.add("hidden");
  outEl.innerHTML = "";
  submitBtn.disabled = true;

  const ignoreDirs = ignoreEl.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root: rootEl.value.trim(),
        keyword: keywordEl.value,
        caseSensitive: caseEl.checked,
        useRegex: regexEl.checked,
        searchFileName: searchNameEl.checked,
        searchContent: searchContentEl.checked,
        encoding: encodingEl.value,
        ignoreDirs,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data.error || "请求失败";
      statusEl.classList.add("error");
      return;
    }

    addRecentKeyword(keywordEl.value);

    const hitFiles = data.results.length;
    const hitLines = data.results.reduce((n, r) => n + r.matches.length, 0);
    statusEl.textContent = "完成";
    summaryEl.classList.remove("hidden");
    let encNote = "";
    if (
      data.searchContent &&
      data.encoding === "auto" &&
      data.encodingStats &&
      Object.keys(data.encodingStats).length
    ) {
      const parts = Object.entries(data.encodingStats)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${v}`)
        .join("，");
      encNote = ` 自动解码分布：${parts}。`;
    } else if (data.searchContent && data.encoding && data.encoding !== "auto") {
      encNote = ` 编码：${data.encoding}。`;
    }
    const modeNote = data.searchContent ? "" : " 当前仅匹配文件名/路径，未扫描文件内容。";
    summaryEl.textContent = `已扫描约 ${data.filesScanned} 个文件，命中 ${hitFiles} 个文件、${hitLines} 行。${modeNote}${encNote}${
      data.truncated ? `（结果已截断，最多 ${data.maxMatches} 条匹配）` : ""
    }`;

    const frag = document.createDocumentFragment();
    for (const item of data.results) {
      const card = document.createElement("article");
      card.className = "card";
      const pathWrap = document.createElement("div");
      pathWrap.className = "card-path card-path-row";
      const pathBtn = document.createElement("button");
      pathBtn.type = "button";
      pathBtn.className = "path-link";
      pathBtn.textContent = item.file;
      pathBtn.title = "在资源管理器中显示此文件（或点击下方按钮）";
      pathBtn.addEventListener("click", () => revealPathInExplorer(item.file));
      pathWrap.appendChild(pathBtn);
      if (item.duplicateBasename) {
        const dup = document.createElement("span");
        dup.className = "dup-badge";
        dup.textContent = "同名";
        dup.title = "本次搜索结果中还有其它路径下的同名文件";
        pathWrap.appendChild(dup);
      }
      card.appendChild(pathWrap);
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const openLocBtn = document.createElement("button");
      openLocBtn.type = "button";
      openLocBtn.className = "btn-open-loc";
      openLocBtn.textContent = "在资源管理器中打开";
      openLocBtn.addEventListener("click", () => revealPathInExplorer(item.file));
      actions.appendChild(openLocBtn);
      card.appendChild(actions);
      if (typeof window.createFileTagPanel === "function") {
        card.appendChild(
          window.createFileTagPanel(
            item.file,
            item.fileTags || [],
            item.fileNote || "",
            item.fileScore || 0,
            statusEl,
          ),
        );
      }
      const ul = document.createElement("ul");
      for (const m of item.matches) {
        const li = document.createElement("li");
        const no = document.createElement("span");
        no.className = "line-no";
        no.textContent = String(m.line);
        const tx = document.createElement("span");
        tx.className = "line-text";
        tx.textContent = m.text;
        li.appendChild(no);
        li.appendChild(tx);
        ul.appendChild(li);
      }
      card.appendChild(ul);
      frag.appendChild(card);
    }
    outEl.appendChild(frag);
    writeSearchSession();
  } catch (err) {
    statusEl.textContent = err.message || "网络错误";
    statusEl.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});
