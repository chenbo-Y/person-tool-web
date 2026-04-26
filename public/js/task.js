const taskFormEl = document.getElementById("taskForm");
const taskTitleInputEl = document.getElementById("taskTitleInput");
const taskTypeInputEl = document.getElementById("taskTypeInput");
const taskTagInputEl = document.getElementById("taskTagInput");
const taskDueInputEl = document.getElementById("taskDueInput");
const taskDetailInputEl = document.getElementById("taskDetailInput");
const taskSubmitBtnEl = document.getElementById("taskSubmitBtn");
const taskStatusEl = document.getElementById("taskStatus");
const taskStatusFilterEl = document.getElementById("taskStatusFilter");
const taskTypeFilterEl = document.getElementById("taskTypeFilter");
const taskTagFilterChipsEl = document.getElementById("taskTagFilterChips");
const taskTagMatchModeEl = document.getElementById("taskTagMatchMode");
const taskKeywordFilterEl = document.getElementById("taskKeywordFilter");
const taskExportBtnEl = document.getElementById("taskExportBtn");
const taskListEl = document.getElementById("taskList");
const taskCalPrevBtnEl = document.getElementById("taskCalPrevBtn");
const taskCalNextBtnEl = document.getElementById("taskCalNextBtn");
const taskCalTodayBtnEl = document.getElementById("taskCalTodayBtn");
const taskCalYearLabelEl = document.getElementById("taskCalYearLabel");
const taskCalMonthLabelEl = document.getElementById("taskCalMonthLabel");
const taskCalYearSelectEl = document.getElementById("taskCalYearSelect");
const taskCalMonthSelectEl = document.getElementById("taskCalMonthSelect");
const taskCalRegionLabelEl = document.getElementById("taskCalRegionLabel");
const taskCalRegionSelectEl = document.getElementById("taskCalRegionSelect");
const taskCalLegendWorkdayEl = document.getElementById("taskCalLegendWorkday");
const taskCalLegendWeekendEl = document.getElementById("taskCalLegendWeekend");
const taskCalLegendHolidayEl = document.getElementById("taskCalLegendHoliday");
const taskCalendarTitleEl = document.getElementById("taskCalendarTitle");
const taskCalendarMonthLabelEl = document.getElementById("taskCalendarMonthLabel");
const taskCalendarWeekEl = document.getElementById("taskCalendarWeek");
const taskCalendarGridEl = document.getElementById("taskCalendarGrid");
const taskCalendarHintEl = document.getElementById("taskCalendarHint");

let editingId = "";
let cachedTasks = [];
let statusFilter = "all";
let typeFilter = "";
let tagFilters = [];
let tagMatchMode = "or";
let keywordFilter = "";
let availableTagFilters = [];
let calendarMonthAnchor = new Date();
calendarMonthAnchor = new Date(calendarMonthAnchor.getFullYear(), calendarMonthAnchor.getMonth(), 1);
let calendarRegion = "CN";
const holidayCache = new Map();
const workingdayCache = new Map();
const lang = String(window.__kwLang || "zh-CN");

const I18N = {
  "zh-CN": {
    pageTitle: "任务管理",
    pageSub: "可创建任务并记录任务类型、详细说明和截止时间。任务存储在本机 data/tasks.json。",
    fieldTitle: "任务",
    fieldType: "任务类型",
    fieldTags: "标签",
    fieldDue: "截止时间",
    fieldDetail: "任务详细",
    fieldDetailHint: "支持 Markdown（如标题、列表、代码、链接、引用、删除线、任务列表、表格），可粘贴图片并拖拽任意文件",
    mdGuideTitle: "Markdown 语法说明（点击展开）",
    mdGuideBody:
      "# 标题\n## 二级标题\n\n- 无序列表\n1. 有序列表\n- [ ] 任务\n- [x] 已完成\n\n> 引用\n~~删除线~~\n`行内代码`\n```js\nconsole.log('code block');\n```\n\n[链接](https://example.com)\n![图片](https://example.com/a.png)\n\n| 列1 | 列2 |\n| --- | --- |\n| A   | B   |",
    submitCreate: "新增任务",
    submitUpdate: "保存修改",
    filterStatusLabel: "状态",
    filterTypeLabel: "任务类型",
    filterTagLabel: "标签",
    filterTagModeLabel: "标签匹配",
    filterKeywordLabel: "关键词",
    filterStatusAll: "全部",
    filterStatusTodo: "未完成",
    filterStatusDone: "已完成",
    filterTypeAll: "全部类型",
    filterTagAll: "全部标签",
    filterTagEmpty: "暂无标签",
    tagModeOr: "OR（任一）",
    tagModeAnd: "AND（全部）",
    filterKeywordPlaceholder: "筛选任务名/类型/详情",
    exportExcel: "导出Excel",
    exportLibMissing: "导出库未加载，请检查网络后重试",
    exportNoData: "当前筛选结果为空，无法导出",
    exportOk: (n) => `已导出 ${n} 条任务`,
    uploadFileFail: "文件上传失败",
    uploadFileOk: "文件已插入",
    loading: "加载中…",
    loadFail: "加载失败",
    createOk: "任务已创建",
    updateOk: "任务已更新",
    deleteOk: "任务已删除",
    requestFail: "请求失败",
    noTask: "暂无任务，先创建一个吧。",
    typeHint: "类型",
    tagsHint: "标签",
    dueHint: "截止",
    completedHint: "完成",
    statusDone: "已完成",
    statusTodo: "未完成",
    btnDone: "标记完成",
    btnTodo: "改为未完成",
    btnEdit: "编辑",
    btnDelete: "删除",
    btnDetail: "详情",
    deleteConfirm: "确定删除该任务？此操作不可撤销。",
    noVisibleTask: "当前筛选下暂无任务。",
    calendarTitle: "任务日历",
    calendarPrev: "上月",
    calendarNext: "下月",
    calendarToday: "本月",
    calendarYear: "年",
    calendarMonth: "月",
    calendarRegion: "地区",
    calendarRegionCN: "中国",
    calendarRegionJP: "日本",
    calendarRegionBoth: "中日同时",
    calendarWorkday: "工作日",
    calendarWeekend: "周末",
    calendarHoliday: "法定休息日",
    countryCnShort: "中",
    countryJpShort: "日",
    countryHoliday: "休",
    countryWorkday: "班",
    calendarHint: (n) => `日历仅显示有截止时间的任务（当前筛选下 ${n} 条）。`,
    calendarMonthLabel: (y, m) => `${y}年${m}月`,
    calendarMore: (n) => `+${n}项`,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
  },
  en: {
    pageTitle: "Task Manager",
    pageSub: "Create tasks with type, detail, and deadline. Tasks are stored in local data/tasks.json.",
    fieldTitle: "Task",
    fieldType: "Task Type",
    fieldTags: "Tags",
    fieldDue: "Due Time",
    fieldDetail: "Task Detail",
    fieldDetailHint: "Markdown supported (headings/lists/code/links/quotes/strikethrough/task list/table); paste images and drag any file",
    mdGuideTitle: "Markdown syntax guide (click to expand)",
    mdGuideBody:
      "# Heading\n## Sub heading\n\n- Unordered list\n1. Ordered list\n- [ ] Task\n- [x] Done\n\n> Quote\n~~Strikethrough~~\n`inline code`\n```js\nconsole.log('code block');\n```\n\n[Link](https://example.com)\n![Image](https://example.com/a.png)\n\n| Col1 | Col2 |\n| --- | --- |\n| A   | B   |",
    submitCreate: "Add Task",
    submitUpdate: "Save Changes",
    filterStatusLabel: "Status",
    filterTypeLabel: "Task Type",
    filterTagLabel: "Tag",
    filterTagModeLabel: "Tag Match",
    filterKeywordLabel: "Keyword",
    filterStatusAll: "All",
    filterStatusTodo: "Todo",
    filterStatusDone: "Done",
    filterTypeAll: "All Types",
    filterTagAll: "All Tags",
    filterTagEmpty: "No tags",
    tagModeOr: "OR (any)",
    tagModeAnd: "AND (all)",
    filterKeywordPlaceholder: "Filter title/type/detail",
    exportExcel: "Export Excel",
    exportLibMissing: "Export library not loaded. Check network and retry",
    exportNoData: "No data under current filters",
    exportOk: (n) => `Exported ${n} tasks`,
    uploadFileFail: "File upload failed",
    uploadFileOk: "File inserted",
    loading: "Loading...",
    loadFail: "Load failed",
    createOk: "Task created",
    updateOk: "Task updated",
    deleteOk: "Task deleted",
    requestFail: "Request failed",
    noTask: "No tasks yet. Create one first.",
    typeHint: "Type",
    tagsHint: "Tags",
    dueHint: "Due",
    completedHint: "Completed",
    statusDone: "Done",
    statusTodo: "Todo",
    btnDone: "Mark Done",
    btnTodo: "Mark Todo",
    btnEdit: "Edit",
    btnDelete: "Delete",
    btnDetail: "Detail",
    deleteConfirm: "Delete this task? This action cannot be undone.",
    noVisibleTask: "No tasks under current filter.",
    calendarTitle: "Task Calendar",
    calendarPrev: "Prev",
    calendarNext: "Next",
    calendarToday: "Today",
    calendarYear: "Year",
    calendarMonth: "Month",
    calendarRegion: "Region",
    calendarRegionCN: "China",
    calendarRegionJP: "Japan",
    calendarRegionBoth: "CN+JP",
    calendarWorkday: "Workday",
    calendarWeekend: "Weekend",
    calendarHoliday: "Public Holiday",
    countryCnShort: "CN",
    countryJpShort: "JP",
    countryHoliday: "Off",
    countryWorkday: "Work",
    calendarHint: (n) => `Only tasks with due time are shown (${n} under current filters).`,
    calendarMonthLabel: (y, m) => `${y}-${String(m).padStart(2, "0")}`,
    calendarMore: (n) => `+${n} more`,
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  ja: {
    pageTitle: "タスク管理",
    pageSub: "タスクの種類・詳細・期限を登録できます。タスクはローカル data/tasks.json に保存されます。",
    fieldTitle: "タスク",
    fieldType: "タスク種類",
    fieldTags: "タグ",
    fieldDue: "期限",
    fieldDetail: "詳細",
    fieldDetailHint: "Markdown 対応（見出し・リスト・コード・リンク・引用・取り消し線・タスクリスト・表）。画像貼り付けと任意ファイルのドラッグ対応",
    mdGuideTitle: "Markdown 記法ガイド（クリックして展開）",
    mdGuideBody:
      "# 見出し\n## 小見出し\n\n- 箇条書き\n1. 番号付きリスト\n- [ ] タスク\n- [x] 完了\n\n> 引用\n~~取り消し線~~\n`インラインコード`\n```js\nconsole.log('code block');\n```\n\n[リンク](https://example.com)\n![画像](https://example.com/a.png)\n\n| 列1 | 列2 |\n| --- | --- |\n| A   | B   |",
    submitCreate: "タスク追加",
    submitUpdate: "変更を保存",
    filterStatusLabel: "状態",
    filterTypeLabel: "タスク種類",
    filterTagLabel: "タグ",
    filterTagModeLabel: "タグ一致",
    filterKeywordLabel: "キーワード",
    filterStatusAll: "すべて",
    filterStatusTodo: "未完了",
    filterStatusDone: "完了",
    filterTypeAll: "すべての種類",
    filterTagAll: "すべてのタグ",
    filterTagEmpty: "タグなし",
    tagModeOr: "OR（いずれか）",
    tagModeAnd: "AND（すべて）",
    filterKeywordPlaceholder: "タイトル/種類/詳細で絞り込み",
    exportExcel: "Excel 出力",
    exportLibMissing: "出力ライブラリが未読込です。ネットワークを確認してください",
    exportNoData: "現在の絞り込み結果は空です",
    exportOk: (n) => `${n} 件のタスクを出力しました`,
    uploadFileFail: "ファイルのアップロードに失敗しました",
    uploadFileOk: "ファイルを挿入しました",
    loading: "読み込み中…",
    loadFail: "読み込み失敗",
    createOk: "タスクを作成しました",
    updateOk: "タスクを更新しました",
    deleteOk: "タスクを削除しました",
    requestFail: "リクエスト失敗",
    noTask: "タスクがありません。先に作成してください。",
    typeHint: "種類",
    tagsHint: "タグ",
    dueHint: "期限",
    completedHint: "完了",
    statusDone: "完了",
    statusTodo: "未完了",
    btnDone: "完了にする",
    btnTodo: "未完了に戻す",
    btnEdit: "編集",
    btnDelete: "削除",
    btnDetail: "詳細",
    deleteConfirm: "このタスクを削除しますか？元に戻せません。",
    noVisibleTask: "現在の表示条件ではタスクがありません。",
    calendarTitle: "タスクカレンダー",
    calendarPrev: "前月",
    calendarNext: "次月",
    calendarToday: "今月",
    calendarYear: "年",
    calendarMonth: "月",
    calendarRegion: "地域",
    calendarRegionCN: "中国",
    calendarRegionJP: "日本",
    calendarRegionBoth: "中日同時",
    calendarWorkday: "平日",
    calendarWeekend: "週末",
    calendarHoliday: "祝日",
    countryCnShort: "中",
    countryJpShort: "日",
    countryHoliday: "休",
    countryWorkday: "勤",
    calendarHint: (n) => `期限があるタスクのみ表示（現在の絞り込み: ${n} 件）。`,
    calendarMonthLabel: (y, m) => `${y}年${m}月`,
    calendarMore: (n) => `他 ${n} 件`,
    weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  },
};

function t(key, ...args) {
  const val = (I18N[lang] || I18N["zh-CN"])[key] || I18N["zh-CN"][key] || key;
  return typeof val === "function" ? val(...args) : val;
}

function setStatus(text, isError) {
  taskStatusEl.textContent = text;
  taskStatusEl.classList.toggle("error", Boolean(isError));
}

function toDatetimeLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyStaticI18n() {
  document.getElementById("taskTitle").textContent = t("pageTitle");
  document.getElementById("taskSub").textContent = t("pageSub");
  document.getElementById("taskFieldTitle").textContent = t("fieldTitle");
  document.getElementById("taskFieldType").textContent = t("fieldType");
  document.getElementById("taskFieldTags").textContent = t("fieldTags");
  document.getElementById("taskFieldDue").textContent = t("fieldDue");
  document.getElementById("taskFieldDetail").textContent = t("fieldDetail");
  document.getElementById("taskFieldDetailHint").textContent = t("fieldDetailHint");
  taskSubmitBtnEl.textContent = editingId ? t("submitUpdate") : t("submitCreate");
  document.getElementById("taskFilterStatusLabel").textContent = t("filterStatusLabel");
  document.getElementById("taskFilterTypeLabel").textContent = t("filterTypeLabel");
  document.getElementById("taskFilterTagLabel").textContent = t("filterTagLabel");
  document.getElementById("taskFilterTagModeLabel").textContent = t("filterTagModeLabel");
  document.getElementById("taskFilterKeywordLabel").textContent = t("filterKeywordLabel");
  if (taskStatusFilterEl) {
    if (taskStatusFilterEl.options[0]) taskStatusFilterEl.options[0].text = t("filterStatusAll");
    if (taskStatusFilterEl.options[1]) taskStatusFilterEl.options[1].text = t("filterStatusTodo");
    if (taskStatusFilterEl.options[2]) taskStatusFilterEl.options[2].text = t("filterStatusDone");
  }
  if (taskTypeFilterEl && taskTypeFilterEl.options[0]) {
    taskTypeFilterEl.options[0].text = t("filterTypeAll");
  }
  if (taskTagMatchModeEl) {
    if (taskTagMatchModeEl.options[0]) taskTagMatchModeEl.options[0].text = t("tagModeOr");
    if (taskTagMatchModeEl.options[1]) taskTagMatchModeEl.options[1].text = t("tagModeAnd");
    taskTagMatchModeEl.value = tagMatchMode;
  }
  if (taskKeywordFilterEl) taskKeywordFilterEl.placeholder = t("filterKeywordPlaceholder");
  if (taskExportBtnEl) taskExportBtnEl.textContent = t("exportExcel");
  if (taskCalendarTitleEl) taskCalendarTitleEl.textContent = t("calendarTitle");
  if (taskCalPrevBtnEl) taskCalPrevBtnEl.textContent = t("calendarPrev");
  if (taskCalNextBtnEl) taskCalNextBtnEl.textContent = t("calendarNext");
  if (taskCalTodayBtnEl) taskCalTodayBtnEl.textContent = t("calendarToday");
  if (taskCalYearLabelEl) taskCalYearLabelEl.textContent = t("calendarYear");
  if (taskCalMonthLabelEl) taskCalMonthLabelEl.textContent = t("calendarMonth");
  if (taskCalRegionLabelEl) taskCalRegionLabelEl.textContent = t("calendarRegion");
  if (taskCalLegendWorkdayEl) taskCalLegendWorkdayEl.textContent = t("calendarWorkday");
  if (taskCalLegendWeekendEl) taskCalLegendWeekendEl.textContent = t("calendarWeekend");
  if (taskCalLegendHolidayEl) taskCalLegendHolidayEl.textContent = t("calendarHoliday");
  if (taskCalRegionSelectEl) {
    const cn = taskCalRegionSelectEl.querySelector('option[value="CN"]');
    const jp = taskCalRegionSelectEl.querySelector('option[value="JP"]');
    const both = taskCalRegionSelectEl.querySelector('option[value="BOTH"]');
    if (cn) cn.textContent = t("calendarRegionCN");
    if (jp) jp.textContent = t("calendarRegionJP");
    if (both) both.textContent = t("calendarRegionBoth");
    taskCalRegionSelectEl.value = calendarRegion;
  }
  const mdGuideTitleEl = document.getElementById("taskMdGuideTitle");
  const mdGuideBodyEl = document.getElementById("taskMdGuideBody");
  if (mdGuideTitleEl) mdGuideTitleEl.textContent = t("mdGuideTitle");
  if (mdGuideBodyEl) mdGuideBodyEl.textContent = t("mdGuideBody");
  renderTagFilterChips();
  renderCalendar(cachedTasks);
}

function toDateKeyFromIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderCalendar(items) {
  if (!taskCalendarGridEl || !taskCalendarWeekEl || !taskCalendarMonthLabelEl || !taskCalendarHintEl) return;
  const visibleItems = getVisibleTasks(items);
  const dueItems = visibleItems.filter((x) => toDateKeyFromIso(x.dueAt));
  const bucket = new Map();
  for (const it of dueItems) {
    const k = toDateKeyFromIso(it.dueAt);
    if (!bucket.has(k)) bucket.set(k, []);
    bucket.get(k).push(it);
  }
  for (const [, arr] of bucket) {
    arr.sort((a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")));
  }

  const y = calendarMonthAnchor.getFullYear();
  const m = calendarMonthAnchor.getMonth();
  const regions = calendarRegion === "BOTH" ? ["CN", "JP"] : [calendarRegion];
  const maps = regions.map((r) => ({
    region: r,
    holidayMap: holidayCache.get(`${r}-${y}`) || new Map(),
    workingdaySet: workingdayCache.get(`${r}-${y}`) || new Set(),
  }));
  renderCalendarYmControls(y, m);
  taskCalendarMonthLabelEl.textContent = t("calendarMonthLabel", y, m + 1);
  taskCalendarHintEl.textContent = t("calendarHint", dueItems.length);

  taskCalendarWeekEl.innerHTML = "";
  const weekdays = Array.isArray(t("weekdays")) ? t("weekdays") : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const wd of weekdays) {
    const el = document.createElement("span");
    el.textContent = wd;
    taskCalendarWeekEl.appendChild(el);
  }

  taskCalendarGridEl.innerHTML = "";
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const totalCells = 42;
  for (let idx = 0; idx < totalCells; idx += 1) {
    let dayNum = 0;
    let cellMonth = m;
    let cellYear = y;
    let outside = false;
    if (idx < firstDay) {
      dayNum = daysInPrevMonth - firstDay + idx + 1;
      cellMonth = m - 1;
      if (cellMonth < 0) {
        cellMonth = 11;
        cellYear -= 1;
      }
      outside = true;
    } else if (idx >= firstDay + daysInMonth) {
      dayNum = idx - (firstDay + daysInMonth) + 1;
      cellMonth = m + 1;
      if (cellMonth > 11) {
        cellMonth = 0;
        cellYear += 1;
      }
      outside = true;
    } else {
      dayNum = idx - firstDay + 1;
    }

    const key = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dayTasks = bucket.get(key) || [];
    const weekend = new Date(cellYear, cellMonth, dayNum).getDay();
    const dayFlags = maps.map((m1) => ({
      region: m1.region,
      holidayName: m1.holidayMap.get(key) || "",
      isWorkingday: m1.workingdaySet.has(key),
    }));
    const holidayName = dayFlags.find((x) => x.holidayName)?.holidayName || "";

    const cell = document.createElement("div");
    cell.className = "task-calendar-day is-workday";
    if (outside) cell.classList.add("is-outside");
    if (key === todayKey) cell.classList.add("is-today");
    if (weekend === 0 || weekend === 6) {
      cell.classList.remove("is-workday");
      cell.classList.add("is-weekend");
    }
    const hasAnyWorkingdayOverride = dayFlags.some((x) => x.isWorkingday);
    if (hasAnyWorkingdayOverride) {
      cell.classList.remove("is-weekend");
      cell.classList.add("is-workday");
    }
    if (holidayName) {
      cell.classList.remove("is-workday");
      cell.classList.remove("is-weekend");
      cell.classList.add("is-holiday");
    }
    const num = document.createElement("div");
    num.className = "task-calendar-day-num";
    num.textContent = String(dayNum);
    cell.appendChild(num);
    if (holidayName) {
      const hol = document.createElement("div");
      hol.className = "task-calendar-day-holiday";
      hol.textContent = holidayName;
      cell.appendChild(hol);
    }
    if (calendarRegion === "BOTH") {
      const statusWrap = document.createElement("div");
      statusWrap.className = "task-calendar-country-status";
      for (const f of dayFlags) {
        if (!f.holidayName && !f.isWorkingday) continue;
        const tag = document.createElement("div");
        tag.className = `task-calendar-country-tag ${f.holidayName ? "is-holiday" : "is-workingday"}`;
        const prefix = f.region === "CN" ? t("countryCnShort") : t("countryJpShort");
        if (f.holidayName) tag.textContent = `${prefix}${t("countryHoliday")}: ${f.holidayName}`;
        else tag.textContent = `${prefix}${t("countryWorkday")}`;
        statusWrap.appendChild(tag);
      }
      if (statusWrap.childNodes.length) cell.appendChild(statusWrap);
    }

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "task-calendar-items";
    const showCount = 3;
    for (const it of dayTasks.slice(0, showCount)) {
      const a = document.createElement("a");
      a.className = `task-calendar-item${it.status === "done" ? " is-done" : ""}`;
      a.href = `/task-detail.html?id=${encodeURIComponent(it.id)}`;
      a.title = `${it.title || ""}`;
      a.textContent = it.title || "-";
      itemsWrap.appendChild(a);
    }
    if (dayTasks.length > showCount) {
      const more = document.createElement("div");
      more.className = "task-calendar-more";
      more.textContent = t("calendarMore", dayTasks.length - showCount);
      itemsWrap.appendChild(more);
    }
    cell.appendChild(itemsWrap);
    taskCalendarGridEl.appendChild(cell);
  }
}

function normalizeHolidayName(name, region) {
  const s = String(name || "").trim();
  if (!s) return "";
  // 中国数据有时会返回“简体 繁体”并列，这里优先取前半段，避免文案重复显示。
  if (region === "CN" && /\s/.test(s)) {
    return s.split(/\s+/)[0];
  }
  return s;
}

function renderCalendarYmControls(year, monthIndex) {
  if (taskCalYearSelectEl) {
    if (!taskCalYearSelectEl.options.length) {
      const nowY = new Date().getFullYear();
      for (let y = nowY - 20; y <= nowY + 20; y += 1) {
        const op = document.createElement("option");
        op.value = String(y);
        op.textContent = String(y);
        taskCalYearSelectEl.appendChild(op);
      }
    }
    taskCalYearSelectEl.value = String(year);
  }
  if (taskCalMonthSelectEl) {
    if (!taskCalMonthSelectEl.options.length) {
      for (let m = 1; m <= 12; m += 1) {
        const op = document.createElement("option");
        op.value = String(m - 1);
        op.textContent = String(m);
        taskCalMonthSelectEl.appendChild(op);
      }
    }
    taskCalMonthSelectEl.value = String(monthIndex);
  }
  ensureHolidayDataForRegion(year, "CN");
  ensureHolidayDataForRegion(year, "JP");
}

async function ensureHolidayDataForRegion(year, region) {
  const key = `${region}-${year}`;
  if (holidayCache.has(key)) return;
  try {
    const res = await fetch(`/api/holidays?country=${encodeURIComponent(region)}&year=${encodeURIComponent(String(year))}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const map = new Map();
    const workSet = new Set();
    for (const it of Array.isArray(data.items) ? data.items : []) {
      if (!it?.date) continue;
      const isWorkingday = Boolean(it.isWorkingday) || String(it.type || "").toLowerCase() === "workingday";
      if (isWorkingday) {
        workSet.add(it.date);
        continue;
      }
      if (it.allDay !== true) continue;
      const isHoliday = Boolean(it.isHoliday) || String(it.type || "").toLowerCase() === "public";
      if (!isHoliday) continue;
      const normalizedName = normalizeHolidayName(String(it.name || ""), region);
      if (!map.has(it.date)) map.set(it.date, normalizedName);
    }
    holidayCache.set(key, map);
    workingdayCache.set(key, workSet);
    renderCalendar(cachedTasks);
  } catch {
    // Keep calendar usable on request failure.
  }
}

function rebuildTypeFilterOptions(items) {
  if (!taskTypeFilterEl) return;
  const prev = typeFilter;
  const types = [...new Set(items.map((x) => String(x.type || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  taskTypeFilterEl.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = t("filterTypeAll");
  taskTypeFilterEl.appendChild(all);
  for (const tp of types) {
    const op = document.createElement("option");
    op.value = tp;
    op.textContent = tp;
    taskTypeFilterEl.appendChild(op);
  }
  if (prev && types.includes(prev)) {
    taskTypeFilterEl.value = prev;
    typeFilter = prev;
  } else {
    taskTypeFilterEl.value = "";
    typeFilter = "";
  }
}

function rebuildTagFilterOptions(items) {
  if (!taskTagFilterChipsEl) return;
  const prevSet = new Set(tagFilters);
  const tags = [
    ...new Set(
      items
        .flatMap((x) => (Array.isArray(x.tags) ? x.tags : []))
        .map((x) => String(x || "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  availableTagFilters = tags;
  tagFilters = tags.filter((tg) => prevSet.has(tg));
  renderTagFilterChips();
}

function renderTagFilterChips() {
  if (!taskTagFilterChipsEl) return;
  taskTagFilterChipsEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `task-tag-chip${tagFilters.length ? "" : " is-active"}`;
  allBtn.textContent = t("filterTagAll");
  allBtn.addEventListener("click", () => {
    tagFilters = [];
    renderTagFilterChips();
    renderTasks(cachedTasks);
  });
  taskTagFilterChipsEl.appendChild(allBtn);

  if (!availableTagFilters.length) {
    const empty = document.createElement("span");
    empty.className = "task-tag-chip-empty";
    empty.textContent = t("filterTagEmpty");
    taskTagFilterChipsEl.appendChild(empty);
    return;
  }

  const selected = new Set(tagFilters.map((x) => x.toLowerCase()));
  for (const tg of availableTagFilters) {
    const btn = document.createElement("button");
    btn.type = "button";
    const active = selected.has(tg.toLowerCase());
    btn.className = `task-tag-chip${active ? " is-active" : ""}`;
    btn.textContent = tg;
    btn.addEventListener("click", () => {
      const low = tg.toLowerCase();
      const set = new Set(tagFilters.map((x) => x.toLowerCase()));
      if (set.has(low)) tagFilters = tagFilters.filter((x) => x.toLowerCase() !== low);
      else tagFilters = [...tagFilters, tg];
      renderTagFilterChips();
      renderTasks(cachedTasks);
    });
    taskTagFilterChipsEl.appendChild(btn);
  }
}

function resetForm() {
  editingId = "";
  taskTitleInputEl.value = "";
  taskTypeInputEl.value = "";
  taskTagInputEl.value = "";
  taskDueInputEl.value = "";
  taskDetailInputEl.value = "";
  taskSubmitBtnEl.textContent = t("submitCreate");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMarkdown(md) {
  // 轻量 Markdown 渲染：优先满足任务场景（标题/列表/代码/链接/图片/引用/任务列表）
  // 注意：先做 HTML 转义，再做规则替换，避免直接注入原始 HTML。
  const src = escapeHtml(md || "");
  if (!src.trim()) return "";
  const applyInline = (text) =>
    String(text || "")
      .replace(/!\[([^\]]*)\]\(((?:\/api\/task-(?:assets|files)\/[^\s)]+)|https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\[([^\]]+)\]\(((?:\/api\/task-(?:assets|files)\/[^\s)]+)|https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
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
    if (h) {
      const lv = h[1].length;
      out.push(`<h${lv}>${applyInline(h[2])}</h${lv}>`);
    } else {
      out.push(`<p>${applyInline(line)}</p>`);
    }
  }
  closeTable();
  closeList();
  let html = out.join("");
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block);
  });
  return html;
}

function getVisibleTasks(items) {
  const kw = keywordFilter.trim().toLowerCase();
  return items.filter((x) => {
    if (statusFilter === "todo" && x.status === "done") return false;
    if (statusFilter === "done" && x.status !== "done") return false;
    if (typeFilter && String(x.type || "").trim() !== typeFilter) return false;
    if (tagFilters.length) {
      const lows = new Set((Array.isArray(x.tags) ? x.tags : []).map((t) => String(t).toLowerCase()));
      const wanted = tagFilters.map((t) => String(t).toLowerCase());
      const ok = tagMatchMode === "and" ? wanted.every((t) => lows.has(t)) : wanted.some((t) => lows.has(t));
      if (!ok) return false;
    }
    if (!kw) return true;
    const text = `${x.title || ""}\n${x.type || ""}\n${(x.tags || []).join(" ")}\n${x.detail || ""}`.toLowerCase();
    return text.includes(kw);
  });
}

function exportVisibleTasksToExcel() {
  if (!window.XLSX || !window.XLSX.utils) {
    setStatus(t("exportLibMissing"), true);
    return;
  }
  const items = getVisibleTasks(cachedTasks);
  if (!items.length) {
    setStatus(t("exportNoData"), true);
    return;
  }
  const rows = items.map((it) => ({
    [t("fieldTitle")]: it.title || "",
    [t("fieldType")]: it.type || "",
    [t("fieldTags")]: Array.isArray(it.tags) ? it.tags.join(", ") : "",
    [t("filterStatusLabel")]: it.status === "done" ? t("statusDone") : t("statusTodo"),
    [t("fieldDue")]: it.dueAt ? new Date(it.dueAt).toLocaleString() : "",
    [t("completedHint")]: it.completedAt ? new Date(it.completedAt).toLocaleString() : "",
    [t("fieldDetail")]: it.detail || "",
    Updated: it.updatedAt ? new Date(it.updatedAt).toLocaleString() : "",
  }));
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.json_to_sheet(rows);
  // 当前仅导出“筛选后可见任务”，与用户视觉结果保持一致
  window.XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  const ts = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  window.XLSX.writeFile(wb, `tasks-${ts}.xlsx`);
  setStatus(t("exportOk", items.length), false);
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
  // 复用后端 /api/task-files：统一附件落盘与 URL 管理
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/task-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, name: file.name || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || t("uploadFileFail"));
  }
  return data.url;
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

function markdownForUploadedFile(file, url) {
  const name = String(file?.name || "file");
  const label = name.replace(/[[\]]/g, "");
  if (String(file?.type || "").startsWith("image/")) {
    const alt = label.replace(/\.[a-zA-Z0-9]+$/, "") || "image";
    return `![${alt}](${url})`;
  }
  return `[${label}](${url})`;
}

function renderTasks(items) {
  taskListEl.innerHTML = "";
  const visibleItems = getVisibleTasks(items);
  renderCalendar(items);
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "task-empty";
    p.textContent = t("noTask");
    taskListEl.appendChild(p);
    return;
  }
  if (!visibleItems.length) {
    const p = document.createElement("p");
    p.className = "task-empty";
    p.textContent = t("noVisibleTask");
    taskListEl.appendChild(p);
    return;
  }
  for (const it of visibleItems) {
    const card = document.createElement("article");
    card.className = "task-item";
    const head = document.createElement("div");
    head.className = "task-item-head";
    const title = document.createElement("a");
    title.className = "task-item-title";
    title.href = `/task-detail.html?id=${encodeURIComponent(it.id)}`;
    title.textContent = it.title;
    const status = document.createElement("span");
    status.textContent = it.status === "done" ? t("statusDone") : t("statusTodo");
    head.appendChild(title);
    head.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "task-item-meta";
    const dueText = it.dueAt ? new Date(it.dueAt).toLocaleString() : "-";
    const completedText = it.completedAt ? new Date(it.completedAt).toLocaleString() : "-";
    const tagsText = Array.isArray(it.tags) && it.tags.length ? it.tags.join(", ") : "-";
    meta.textContent = `${t("typeHint")}: ${it.type || "-"}  ·  ${t("tagsHint")}: ${tagsText}  ·  ${t("dueHint")}: ${dueText}  ·  ${t("completedHint")}: ${completedText}`;

    const detail = document.createElement("div");
    detail.className = "task-item-detail";
    detail.innerHTML = renderMarkdown(it.detail || "");

    const actions = document.createElement("div");
    actions.className = "task-item-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.textContent = it.status === "done" ? t("btnTodo") : t("btnDone");
    toggleBtn.addEventListener("click", async () => {
      await saveTask({
        ...it,
        status: it.status === "done" ? "todo" : "done",
      });
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = t("btnEdit");
    editBtn.addEventListener("click", () => {
      editingId = it.id;
      taskTitleInputEl.value = it.title || "";
      taskTypeInputEl.value = it.type || "";
      taskTagInputEl.value = Array.isArray(it.tags) ? it.tags.join(", ") : "";
      taskDueInputEl.value = toDatetimeLocalInput(it.dueAt);
      taskDetailInputEl.value = it.detail || "";
      taskSubmitBtnEl.textContent = t("submitUpdate");
      taskTitleInputEl.focus();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = t("btnDelete");
    delBtn.addEventListener("click", async () => {
      if (!confirm(t("deleteConfirm"))) return;
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(it.id)}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus(data.error || t("requestFail"), true);
          return;
        }
        setStatus(t("deleteOk"), false);
        await loadTasks();
      } catch (e) {
        setStatus(e.message || t("requestFail"), true);
      }
    });

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.textContent = t("btnDetail");
    detailBtn.addEventListener("click", () => {
      window.location.href = `/task-detail.html?id=${encodeURIComponent(it.id)}`;
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(detailBtn);
    actions.appendChild(delBtn);
    card.appendChild(head);
    card.appendChild(meta);
    card.appendChild(detail);
    card.appendChild(actions);
    taskListEl.appendChild(card);
  }
}

async function loadTasks() {
  setStatus(t("loading"), false);
  try {
    const res = await fetch("/api/tasks");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || t("loadFail"), true);
      return;
    }
    cachedTasks = Array.isArray(data.items) ? data.items : [];
    rebuildTypeFilterOptions(cachedTasks);
    rebuildTagFilterOptions(cachedTasks);
    renderTasks(cachedTasks);
    setStatus("", false);
  } catch (e) {
    setStatus(e.message || t("requestFail"), true);
  }
}

async function saveTask(payload) {
  const isEdit = Boolean(payload.id || editingId);
  const id = payload.id || editingId;
  const tagsSource = payload.tags ?? taskTagInputEl.value;
  const tags = Array.isArray(tagsSource)
    ? tagsSource
    : String(tagsSource || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  const body = {
    title: String(payload.title ?? taskTitleInputEl.value).trim(),
    type: String(payload.type ?? taskTypeInputEl.value).trim(),
    tags,
    detail: String(payload.detail ?? taskDetailInputEl.value).trim(),
    dueAt: String(payload.dueAt ?? taskDueInputEl.value).trim(),
    status: payload.status || "todo",
  };
  if (!body.title) {
    setStatus(t("requestFail"), true);
    return;
  }
  try {
    const url = isEdit ? `/api/tasks/${encodeURIComponent(id)}` : "/api/tasks";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.error || t("requestFail"), true);
      return;
    }
    setStatus(isEdit ? t("updateOk") : t("createOk"), false);
    if (!payload.id) resetForm();
    await loadTasks();
  } catch (e) {
    setStatus(e.message || t("requestFail"), true);
  }
}

taskFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveTask({});
});

taskStatusFilterEl?.addEventListener("change", () => {
  statusFilter = taskStatusFilterEl.value || "all";
  renderTasks(cachedTasks);
});

taskTypeFilterEl?.addEventListener("change", () => {
  typeFilter = taskTypeFilterEl.value || "";
  renderTasks(cachedTasks);
});
taskTagMatchModeEl?.addEventListener("change", () => {
  tagMatchMode = taskTagMatchModeEl.value === "and" ? "and" : "or";
  renderTasks(cachedTasks);
});

taskKeywordFilterEl?.addEventListener("input", () => {
  keywordFilter = taskKeywordFilterEl.value || "";
  renderTasks(cachedTasks);
});
taskCalPrevBtnEl?.addEventListener("click", () => {
  calendarMonthAnchor = new Date(calendarMonthAnchor.getFullYear(), calendarMonthAnchor.getMonth() - 1, 1);
  renderCalendar(cachedTasks);
});
taskCalNextBtnEl?.addEventListener("click", () => {
  calendarMonthAnchor = new Date(calendarMonthAnchor.getFullYear(), calendarMonthAnchor.getMonth() + 1, 1);
  renderCalendar(cachedTasks);
});
taskCalTodayBtnEl?.addEventListener("click", () => {
  const now = new Date();
  calendarMonthAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar(cachedTasks);
});
taskCalYearSelectEl?.addEventListener("change", () => {
  const y = Number(taskCalYearSelectEl.value);
  if (!Number.isFinite(y)) return;
  calendarMonthAnchor = new Date(y, calendarMonthAnchor.getMonth(), 1);
  renderCalendar(cachedTasks);
});
taskCalMonthSelectEl?.addEventListener("change", () => {
  const m = Number(taskCalMonthSelectEl.value);
  if (!Number.isFinite(m)) return;
  calendarMonthAnchor = new Date(calendarMonthAnchor.getFullYear(), m, 1);
  renderCalendar(cachedTasks);
});
taskCalRegionSelectEl?.addEventListener("change", () => {
  const next = String(taskCalRegionSelectEl.value || "CN").toUpperCase();
  calendarRegion = next === "JP" ? "JP" : next === "BOTH" ? "BOTH" : "CN";
  renderCalendar(cachedTasks);
});
taskExportBtnEl?.addEventListener("click", exportVisibleTasksToExcel);
taskDetailInputEl?.addEventListener("paste", async (e) => {
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
    const md = `\n![${alt}](${url})\n`;
    insertTextAtCursor(taskDetailInputEl, md);
    setStatus(t("uploadFileOk"), false);
  } catch (err) {
    setStatus(err.message || t("uploadFileFail"), true);
  }
});

taskDetailInputEl?.addEventListener("dragover", (e) => {
  const files = collectFilesFromDataTransfer(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  taskDetailInputEl.classList.add("drag-over");
});

taskDetailInputEl?.addEventListener("dragleave", () => {
  taskDetailInputEl.classList.remove("drag-over");
});

taskDetailInputEl?.addEventListener("drop", async (e) => {
  const files = collectFilesFromDataTransfer(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  taskDetailInputEl.classList.remove("drag-over");
  setStatus(t("loading"), false);
  try {
    const lines = [];
    // 支持一次拖入多个文件：图片生成 Markdown 图片，其它文件生成普通链接
    for (const file of files) {
      const url = await uploadTaskFile(file);
      lines.push(markdownForUploadedFile(file, url));
    }
    insertTextAtCursor(taskDetailInputEl, `\n${lines.join("\n")}\n`);
    setStatus(t("uploadFileOk"), false);
  } catch (err) {
    setStatus(err.message || t("uploadFileFail"), true);
  }
});

applyStaticI18n();
loadTasks();
