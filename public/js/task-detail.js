const detailTaskCardEl = document.getElementById("detailTaskCard");
const progressFormEl = document.getElementById("progressForm");
const progressInputEl = document.getElementById("progressInput");
const progressSubmitBtnEl = document.getElementById("progressSubmitBtn");
const progressCancelEditBtnEl = document.getElementById("progressCancelEditBtn");
const detailStatusEl = document.getElementById("detailStatus");
const progressListEl = document.getElementById("progressList");

/** 正在编辑的进展条目 id；为空表示「追加新进展」模式 */
let editingProgressId = "";

const qp = new URLSearchParams(location.search);
const taskId = String(qp.get("id") || "").trim();
const lang = String(window.__kwLang || "zh-CN");

const I18N = {
  "zh-CN": {
    title: "任务详情",
    back: "← 返回任务列表",
    progressLabel: "当前进展（Markdown，支持标题、列表、代码、链接、引用、删除线、任务列表、表格；支持粘贴图片和拖拽任意文件）",
    mdGuideTitle: "Markdown 语法说明（点击展开）",
    mdGuideBody:
      "# 标题\n## 二级标题\n\n- 无序列表\n1. 有序列表\n- [ ] 任务\n- [x] 已完成\n\n> 引用\n~~删除线~~\n`行内代码`\n```js\nconsole.log('code block');\n```\n\n[链接](https://example.com)\n![图片](https://example.com/a.png)\n\n| 列1 | 列2 |\n| --- | --- |\n| A   | B   |",
    submit: "追加进展",
    progressListTitle: "进展记录",
    loading: "加载中…",
    requestFail: "请求失败",
    noTask: "任务不存在",
    noProgress: "暂无进展记录",
    taskType: "类型",
    taskDue: "截止",
    taskCreated: "创建时间",
    taskCompleted: "完成",
    taskStatus: "状态",
    done: "已完成",
    todo: "未完成",
    addOk: "进展已追加",
    uploadOk: "文件已插入",
    uploadFail: "文件上传失败",
    emptyProgress: "请先输入进展内容",
    saveProgress: "保存修改",
    cancelEdit: "取消编辑",
    editProgress: "编辑",
    deleteProgress: "删除",
    confirmDeleteProgress: "确定删除这条进展记录？",
    updateOk: "进展已更新",
    deleteOk: "进展已删除",
    editedAt: "已编辑",
  },
  en: {
    title: "Task Detail",
    back: "<- Back to task list",
    progressLabel: "Current progress (Markdown with headings/lists/code/links/quotes/strikethrough/task list/table; supports image paste and any file drag-drop)",
    mdGuideTitle: "Markdown syntax guide (click to expand)",
    mdGuideBody:
      "# Heading\n## Sub heading\n\n- Unordered list\n1. Ordered list\n- [ ] Task\n- [x] Done\n\n> Quote\n~~Strikethrough~~\n`inline code`\n```js\nconsole.log('code block');\n```\n\n[Link](https://example.com)\n![Image](https://example.com/a.png)\n\n| Col1 | Col2 |\n| --- | --- |\n| A   | B   |",
    submit: "Add Progress",
    progressListTitle: "Progress",
    loading: "Loading...",
    requestFail: "Request failed",
    noTask: "Task not found",
    noProgress: "No progress yet",
    taskType: "Type",
    taskDue: "Due",
    taskCreated: "Created",
    taskCompleted: "Completed",
    taskStatus: "Status",
    done: "Done",
    todo: "Todo",
    addOk: "Progress added",
    uploadOk: "File inserted",
    uploadFail: "File upload failed",
    emptyProgress: "Please enter progress content",
    saveProgress: "Save changes",
    cancelEdit: "Cancel edit",
    editProgress: "Edit",
    deleteProgress: "Delete",
    confirmDeleteProgress: "Delete this progress entry?",
    updateOk: "Progress updated",
    deleteOk: "Progress deleted",
    editedAt: "Edited",
  },
  ja: {
    title: "タスク詳細",
    back: "← タスクリストに戻る",
    progressLabel: "現在の進捗（Markdown: 見出し・リスト・コード・リンク・引用・取り消し線・タスクリスト・表。画像貼り付けと任意ファイルのドラッグ対応）",
    mdGuideTitle: "Markdown 記法ガイド（クリックして展開）",
    mdGuideBody:
      "# 見出し\n## 小見出し\n\n- 箇条書き\n1. 番号付きリスト\n- [ ] タスク\n- [x] 完了\n\n> 引用\n~~取り消し線~~\n`インラインコード`\n```js\nconsole.log('code block');\n```\n\n[リンク](https://example.com)\n![画像](https://example.com/a.png)\n\n| 列1 | 列2 |\n| --- | --- |\n| A   | B   |",
    submit: "進捗を追加",
    progressListTitle: "進捗記録",
    loading: "読み込み中…",
    requestFail: "リクエスト失敗",
    noTask: "タスクが見つかりません",
    noProgress: "進捗記録はまだありません",
    taskType: "種類",
    taskDue: "期限",
    taskCreated: "作成日時",
    taskCompleted: "完了",
    taskStatus: "状態",
    done: "完了",
    todo: "未完了",
    addOk: "進捗を追加しました",
    uploadOk: "ファイルを挿入しました",
    uploadFail: "ファイルアップロード失敗",
    emptyProgress: "進捗内容を入力してください",
    saveProgress: "変更を保存",
    cancelEdit: "編集をキャンセル",
    editProgress: "編集",
    deleteProgress: "削除",
    confirmDeleteProgress: "この進捗記録を削除しますか？",
    updateOk: "進捗を更新しました",
    deleteOk: "進捗を削除しました",
    editedAt: "編集済",
  },
};

function t(key) {
  return (I18N[lang] || I18N["zh-CN"])[key] || I18N["zh-CN"][key] || key;
}

function setStatus(text, isError) {
  detailStatusEl.textContent = text;
  detailStatusEl.classList.toggle("error", Boolean(isError));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMarkdown(md) {
  // 与 task.js 采用同一套轻量规则，确保列表页与详情页显示一致
  const src = escapeHtml(md || "");
  if (!src.trim()) return "";
  const applyInline = (text) =>
    String(text || "")
      .replace(/!\[([^\]]*)\]\(((?:\/api\/task-(?:assets|files)\/\S+)|https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\[([^\]]+)\]\(((?:\/api\/task-(?:assets|files)\/\S+)|https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  const parseTableRow = (line) => {
    const s = String(line || "").trim();
    if (!s.includes("|")) return null;
    let row = s;
    if (row.startsWith("|")) row = row.slice(1);
    if (row.endsWith("|")) row = row.slice(0, -1);
    const cells = row.split("|").map((x) => x.trim());
    if (!cells.length || cells.every((x) => !x)) return null;
    return cells;
  };
  const isTableSeparator = (line, count) => {
    const cells = parseTableRow(line);
    if (!cells || cells.length !== count) return false;
    return cells.every((c) => /^:?-{3,}:?$/.test(c));
  };
  const codeBlocks = [];
  let tmp = src.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return token;
  });
  tmp = applyInline(tmp);

  const lines = tmp.split(/\r?\n/);
  const out = [];
  let listMode = "";
  let tableMode = false;
  const closeList = () => {
    if (listMode === "ul") out.push("</ul>");
    if (listMode === "ol") out.push("</ol>");
    listMode = "";
  };
  const closeTable = () => {
    if (tableMode) out.push("</tbody></table>");
    tableMode = false;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      closeList();
      closeTable();
      continue;
    }
    if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
      closeTable();
      closeList();
      out.push("<hr />");
      continue;
    }
    const quote = /^\s*>\s?(.+)$/.exec(line);
    if (quote) {
      closeTable();
      closeList();
      out.push(`<blockquote>${applyInline(quote[1])}</blockquote>`);
      continue;
    }
    const taskMatch = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (taskMatch) {
      closeTable();
      if (listMode !== "ul") {
        closeList();
        out.push("<ul>");
        listMode = "ul";
      }
      const checked = taskMatch[1].toLowerCase() === "x" ? " checked" : "";
      out.push(`<li><input type="checkbox" disabled${checked} /> ${applyInline(taskMatch[2])}</li>`);
      continue;
    }
    const listMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    if (listMatch) {
      closeTable();
      if (listMode !== "ul") {
        closeList();
        out.push("<ul>");
        listMode = "ul";
      }
      out.push(`<li>${applyInline(listMatch[1])}</li>`);
      continue;
    }
    const orderedMatch = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      closeTable();
      if (listMode !== "ol") {
        closeList();
        out.push("<ol>");
        listMode = "ol";
      }
      out.push(`<li>${applyInline(orderedMatch[2])}</li>`);
      continue;
    }
    const cells = parseTableRow(line);
    if (cells) {
      if (!tableMode) {
        const next = lines[i + 1] ? lines[i + 1].trimEnd() : "";
        if (next && isTableSeparator(next, cells.length)) {
          closeList();
          const head = cells.map((c) => `<th>${applyInline(c)}</th>`).join("");
          out.push(`<table><thead><tr>${head}</tr></thead><tbody>`);
          tableMode = true;
          i += 1; // 跳过分隔行
          continue;
        }
      } else {
        const tds = cells.map((c) => `<td>${applyInline(c)}</td>`).join("");
        out.push(`<tr>${tds}</tr>`);
        continue;
      }
    }
    closeTable();
    closeList();
    const h = /^(#{1,3})\s*(.+)$/.exec(line);
    if (h) out.push(`<h${h[1].length}>${applyInline(h[2])}</h${h[1].length}>`);
    else out.push(`<p>${applyInline(line)}</p>`);
  }
  closeTable();
  closeList();
  let html = out.join("");
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block);
  });
  return html;
}

function collectFilesFromDataTransfer(dt) {
  const files = [];
  if (!dt) return files;
  if (dt.items && dt.items.length) {
    for (const it of dt.items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
  } else if (dt.files && dt.files.length) {
    for (const f of dt.files) {
      files.push(f);
    }
  }
  return files;
}

function insertTextAtCursor(el, text) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = `${el.value.slice(0, start)}${text}${el.value.slice(end)}`;
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
  el.focus();
}

async function uploadTaskFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, name: file.name || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || t("uploadFail"));
  return data.url;
}

function markdownForUploadedFile(file, url) {
  const name = String(file?.name || "file");
  const label = name.replace(/[[\]]/g, "");
  if (String(file?.type || "").startsWith("image/")) {
    const alt = label.replace(/\.[a-zA-Z0-9]+$/, "") || "image";
    return `![${alt}](${url})`;
  }
  return `[${label}](${url})`;
}

function refreshProgressFormUi() {
  if (progressSubmitBtnEl) {
    progressSubmitBtnEl.textContent = editingProgressId ? t("saveProgress") : t("submit");
  }
  if (progressCancelEditBtnEl) {
    progressCancelEditBtnEl.hidden = !editingProgressId;
    progressCancelEditBtnEl.textContent = t("cancelEdit");
  }
}

function applyStaticI18n() {
  document.getElementById("detailPageTitle").textContent = t("title");
  document.getElementById("backToTask").textContent = t("back");
  document.getElementById("progressLabel").textContent = t("progressLabel");
  document.getElementById("progressListTitle").textContent = t("progressListTitle");
  refreshProgressFormUi();
  const mdGuideTitleEl = document.getElementById("progressMdGuideTitle");
  const mdGuideBodyEl = document.getElementById("progressMdGuideBody");
  if (mdGuideTitleEl) mdGuideTitleEl.textContent = t("mdGuideTitle");
  if (mdGuideBodyEl) mdGuideBodyEl.textContent = t("mdGuideBody");
}

function renderTaskCard(task) {
  detailTaskCardEl.className = `task-card ${task.status === "done" ? "task-card--done" : "task-card--todo"}`;
  const created = task.createdAt ? new Date(task.createdAt).toLocaleString() : "-";
  const due = task.dueAt ? new Date(task.dueAt).toLocaleString() : "-";
  const completed = task.completedAt ? new Date(task.completedAt).toLocaleString() : "-";
  const status = task.status === "done" ? t("done") : t("todo");
  detailTaskCardEl.innerHTML = `
    <h3>${escapeHtml(task.title || "")}</h3>
    <div class="task-card-meta">${t("taskType")}: ${escapeHtml(task.type || "-")} · ${t("taskCreated")}: ${escapeHtml(created)} · ${t("taskDue")}: ${escapeHtml(due)} · ${t("taskCompleted")}: ${escapeHtml(completed)} · ${t("taskStatus")}: ${escapeHtml(status)}</div>
    <div class="md">${renderMarkdown(task.detail || "")}</div>
  `;
}

function renderProgress(list) {
  progressListEl.innerHTML = "";
  if (!Array.isArray(list) || !list.length) {
    const p = document.createElement("p");
    p.textContent = t("noProgress");
    progressListEl.appendChild(p);
    return;
  }
  for (const it of list) {
    const pid = String(it.id || "").trim();
    const card = document.createElement("article");
    card.className = "progress-item";
    if (editingProgressId && pid === editingProgressId) {
      card.classList.add("is-editing");
    }

    const actions = document.createElement("div");
    actions.className = "progress-item-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = t("editProgress");
    editBtn.addEventListener("click", () => {
      editingProgressId = pid;
      progressInputEl.value = String(it.content || "");
      refreshProgressFormUi();
      renderProgress(list);
      progressInputEl.focus();
      progressFormEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "progress-delete-btn";
    delBtn.textContent = t("deleteProgress");
    delBtn.addEventListener("click", async () => {
      if (!pid || !window.confirm(t("confirmDeleteProgress"))) return;
      setStatus(t("loading"), false);
      try {
        const res = await fetch(
          `/api/tasks/${encodeURIComponent(taskId)}/progress/${encodeURIComponent(pid)}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(data.error || t("requestFail"), true);
          return;
        }
        if (editingProgressId === pid) {
          editingProgressId = "";
          progressInputEl.value = "";
          refreshProgressFormUi();
        }
        setStatus(t("deleteOk"), false);
        renderTaskCard(data.item);
        renderProgress(data.item.progress || []);
      } catch (err) {
        setStatus(err.message || t("requestFail"), true);
      }
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    const meta = document.createElement("div");
    meta.className = "progress-item-meta";
    const createdLine = new Date(it.createdAt || Date.now()).toLocaleString();
    const upd = String(it.updatedAt || "").trim();
    const cr = String(it.createdAt || "").trim();
    if (upd && upd !== cr) {
      meta.appendChild(document.createTextNode(`${createdLine} · `));
      const editedSpan = document.createElement("span");
      editedSpan.className = "progress-item-edited";
      editedSpan.textContent = `${t("editedAt")} ${new Date(upd).toLocaleString()}`;
      meta.appendChild(editedSpan);
    } else {
      meta.textContent = createdLine;
    }

    const body = document.createElement("div");
    body.className = "md";
    body.innerHTML = renderMarkdown(it.content || "");
    card.appendChild(actions);
    card.appendChild(meta);
    card.appendChild(body);
    progressListEl.appendChild(card);
  }
}

async function loadDetail() {
  if (!taskId) {
    setStatus(t("noTask"), true);
    return;
  }
  setStatus(t("loading"), false);
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || t("requestFail"), true);
      return;
    }
    const task = data.item;
    renderTaskCard(task);
    renderProgress(task.progress || []);
    setStatus("", false);
  } catch (e) {
    setStatus(e.message || t("requestFail"), true);
  }
}

progressFormEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = progressInputEl.value.trim();
  if (!content) {
    setStatus(t("emptyProgress"), true);
    return;
  }
  setStatus(t("loading"), false);
  try {
    const isEdit = Boolean(editingProgressId);
    const url = isEdit
      ? `/api/tasks/${encodeURIComponent(taskId)}/progress/${encodeURIComponent(editingProgressId)}`
      : `/api/tasks/${encodeURIComponent(taskId)}/progress`;
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || t("requestFail"), true);
      return;
    }
    progressInputEl.value = "";
    editingProgressId = "";
    refreshProgressFormUi();
    setStatus(isEdit ? t("updateOk") : t("addOk"), false);
    renderTaskCard(data.item);
    renderProgress(data.item.progress || []);
  } catch (err) {
    setStatus(err.message || t("requestFail"), true);
  }
});

progressCancelEditBtnEl?.addEventListener("click", () => {
  editingProgressId = "";
  progressInputEl.value = "";
  refreshProgressFormUi();
  setStatus("", false);
  loadDetail();
});

progressInputEl?.addEventListener("paste", async (e) => {
  const items = e.clipboardData?.items;
  if (!items || !items.length) return;
  const imageItem = [...items].find((it) => it.type && it.type.startsWith("image/"));
  if (!imageItem) return;
  const file = imageItem.getAsFile();
  if (!file) return;
  e.preventDefault();
  setStatus(t("loading"), false);
  try {
    const url = await uploadTaskFile(file);
    const alt = file.name ? file.name.replace(/\.[a-zA-Z0-9]+$/, "") : "image";
    insertTextAtCursor(progressInputEl, `\n![${alt}](${url})\n`);
    setStatus(t("uploadOk"), false);
  } catch (err) {
    setStatus(err.message || t("uploadFail"), true);
  }
});

progressInputEl?.addEventListener("dragover", (e) => {
  const files = collectFilesFromDataTransfer(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  progressInputEl.classList.add("drag-over");
});

progressInputEl?.addEventListener("dragleave", () => {
  progressInputEl.classList.remove("drag-over");
});

progressInputEl?.addEventListener("drop", async (e) => {
  const files = collectFilesFromDataTransfer(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  progressInputEl.classList.remove("drag-over");
  setStatus(t("loading"), false);
  try {
    const lines = [];
    // 允许一次拖入多个文件：图片插入 Markdown 图片，其它文件插入链接
    for (const file of files) {
      const url = await uploadTaskFile(file);
      lines.push(markdownForUploadedFile(file, url));
    }
    insertTextAtCursor(progressInputEl, `\n${lines.join("\n")}\n`);
    setStatus(t("uploadOk"), false);
  } catch (err) {
    setStatus(err.message || t("uploadFail"), true);
  }
});

applyStaticI18n();
loadDetail();
