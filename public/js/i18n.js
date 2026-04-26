(() => {
  const SUPPORTED = ["zh-CN", "en", "ja"];
  const LANG_KEY = "kwWeb.lang";
  const FEATURE_KEY = "kwWeb.features";
  const ALL_FEATURES = ["search", "manga", "video", "overview", "task"];

  function normLang(v) {
    const s = String(v || "").toLowerCase();
    if (s.startsWith("zh")) return "zh-CN";
    if (s.startsWith("ja")) return "ja";
    if (s.startsWith("en")) return "en";
    return "zh-CN";
  }

  function pickLang() {
    const qp = new URLSearchParams(location.search);
    const byQuery = qp.get("lang");
    if (byQuery) return normLang(byQuery);
    try {
      const byStore = localStorage.getItem(LANG_KEY);
      if (byStore) return normLang(byStore);
    } catch {
      /* ignore */
    }
    return normLang(navigator.language || "zh-CN");
  }

  const lang = pickLang();

  const dict = {
    "zh-CN": {
      navSearch: "关键字搜索",
      navManga: "漫画式图片浏览",
      navVideo: "视频浏览",
      navOverview: "标注一览",
      navTask: "任务",
      langLabel: "语言",
      settings: "设置",
      settingsAria: "打开设置",
      featureLabel: "功能显示",
      featureSearch: "关键字搜索",
      featureManga: "图片浏览",
      featureVideo: "视频浏览",
      featureOverview: "标注一览",
      featureTask: "任务",
      langZh: "中文",
      langEn: "English",
      langJa: "日本語",
    },
    en: {
      navSearch: "Keyword Search",
      navManga: "Manga Image Browser",
      navVideo: "Video Browser",
      navOverview: "Tagged Overview",
      navTask: "Tasks",
      langLabel: "Language",
      settings: "Settings",
      settingsAria: "Open settings",
      featureLabel: "Visible Features",
      featureSearch: "Keyword Search",
      featureManga: "Image Browser",
      featureVideo: "Video Browser",
      featureOverview: "Tagged Overview",
      featureTask: "Tasks",
      langZh: "中文",
      langEn: "English",
      langJa: "日本語",
    },
    ja: {
      navSearch: "キーワード検索",
      navManga: "マンガ画像ブラウズ",
      navVideo: "動画ブラウズ",
      navOverview: "タグ一覧",
      navTask: "タスク",
      langLabel: "言語",
      settings: "設定",
      settingsAria: "設定を開く",
      featureLabel: "表示機能",
      featureSearch: "キーワード検索",
      featureManga: "画像ブラウズ",
      featureVideo: "動画ブラウズ",
      featureOverview: "タグ一覧",
      featureTask: "タスク",
      langZh: "中文",
      langEn: "English",
      langJa: "日本語",
    },
  };

  const pageDict = {
    "/": {
      "zh-CN": {
        title: "本地关键字搜索",
        h1: "本地关键字搜索",
      },
      en: {
        title: "Local Keyword Search",
        h1: "Local Keyword Search",
      },
      ja: {
        title: "ローカルキーワード検索",
        h1: "ローカルキーワード検索",
      },
    },
    "/manga.html": {
      "zh-CN": { title: "漫画式图片浏览", h1: "漫画式图片浏览" },
      en: { title: "Manga Image Browser", h1: "Manga Image Browser" },
      ja: { title: "マンガ画像ブラウズ", h1: "マンガ画像ブラウズ" },
    },
    "/video.html": {
      "zh-CN": { title: "本地视频浏览", h1: "本地视频浏览" },
      en: { title: "Local Video Browser", h1: "Local Video Browser" },
      ja: { title: "ローカル動画ブラウズ", h1: "ローカル動画ブラウズ" },
    },
    "/overview.html": {
      "zh-CN": { title: "已标注文件一览", h1: "已标注文件一览" },
      en: { title: "Tagged Files Overview", h1: "Tagged Files Overview" },
      ja: { title: "タグ付け済みファイル一覧", h1: "タグ付け済みファイル一覧" },
    },
    "/task.html": {
      "zh-CN": { title: "任务管理", h1: "任务管理" },
      en: { title: "Task Manager", h1: "Task Manager" },
      ja: { title: "タスク管理", h1: "タスク管理" },
    },
  };

  const pageUi = {
    "/": {
      "zh-CN": {
        subHtml:
          "默认只匹配「文件名与路径」（不读磁盘内容，速度快）。勾选「搜索文件内容」后才会按编码解码正文；PDF 等二进制仍只能匹配文件名。点击结果中的路径可在资源管理器中打开并定位到该文件。每条结果可添加<strong>标签与备注</strong>，保存在本机项目目录下的 <code>data/file-tags.json</code>（与浏览器 localStorage 无关）。顶栏<strong>标注一览</strong>可集中查看已保存的路径、标签与描述。",
        rootLabel: "根目录（绝对路径）",
        keywordLabel: "关键字或正则",
        rootPlaceholder: "例如 C:\\Users\\你\\Projects\\my-app",
        keywordPlaceholder: "要查找的内容",
        recentTitle: "本页最近关键字",
        recentClear: "清空全部",
        recentClearTitle: "清空全部记录",
        recentHint:
          "此处记录保存在本机浏览器（可删除）。输入框自带的「保存的信息」来自浏览器自动填充，需在浏览器设置里管理。",
        caseLabel: "区分大小写",
        regexLabel: "使用正则",
        searchNameLabel: "搜索文件名与路径",
        searchContentLabel: "搜索文件内容",
        encodingLabel: "文件编码（仅在勾选「搜索文件内容」时生效）",
        ignoreLabel: "额外忽略的目录名（逗号分隔，可选）",
        ignorePlaceholder: "例如 vendor,.cache",
        encodingOptions: {
          auto: "自动探测（chardet）",
          "gb18030": "GB18030（中文 Windows 常见）",
          big5: "Big5（繁体）",
          shift_jis: "Shift_JIS（日文）",
          "euc-jp": "EUC-JP（日文）",
          "euc-kr": "EUC-KR（韩文）",
          "windows-1252": "Windows-1252（西欧）",
        },
        submit: "开始搜索",
      },
      en: {
        subHtml:
          'By default, only file names and paths are matched (fast, no file content read). File content is decoded only when "Search file content" is enabled; binary files such as PDF still match by name only. Click a result path to reveal it in File Explorer. You can add <strong>tags and notes</strong> per result, stored in <code>data/file-tags.json</code> in this project (independent from browser localStorage). Use <strong>Tagged Overview</strong> in the top nav to review saved paths, tags, and notes.',
        rootLabel: "Root Directory (absolute path)",
        keywordLabel: "Keyword or Regex",
        rootPlaceholder: "e.g. C:\\Users\\You\\Projects\\my-app",
        keywordPlaceholder: "What to search for",
        recentTitle: "Recent Keywords on This Page",
        recentClear: "Clear All",
        recentClearTitle: "Clear all records",
        recentHint:
          'This list is saved in your local browser (you can delete it). The browser\'s own saved input suggestions are managed in browser settings.',
        caseLabel: "Case Sensitive",
        regexLabel: "Use Regex",
        searchNameLabel: "Search file names and paths",
        searchContentLabel: "Search file content",
        encodingLabel: 'File Encoding (effective only when "Search file content" is checked)',
        ignoreLabel: "Extra ignored directory names (comma-separated, optional)",
        ignorePlaceholder: "e.g. vendor,.cache",
        encodingOptions: {
          auto: "Auto Detect (chardet)",
          "gb18030": "GB18030 (Common on Chinese Windows)",
          big5: "Big5 (Traditional Chinese)",
          shift_jis: "Shift_JIS (Japanese)",
          "euc-jp": "EUC-JP (Japanese)",
          "euc-kr": "EUC-KR (Korean)",
          "windows-1252": "Windows-1252 (Western European)",
        },
        submit: "Search",
      },
      ja: {
        subHtml:
          "既定では「ファイル名とパス」のみを検索します（高速・内容は未読込）。「ファイル内容を検索」を有効にした場合のみエンコーディングに従って本文を解析します。PDF などのバイナリはファイル名のみ一致します。検索結果のパスをクリックするとエクスプローラーで位置を表示できます。各結果には<strong>タグとメモ</strong>を付与でき、<code>data/file-tags.json</code> に保存されます（ブラウザ localStorage とは別）。上部の<strong>タグ一覧</strong>で保存済みのパス・タグ・メモをまとめて確認できます。",
        rootLabel: "ルートディレクトリ（絶対パス）",
        keywordLabel: "キーワードまたは正規表現",
        rootPlaceholder: "例 C:\\Users\\You\\Projects\\my-app",
        keywordPlaceholder: "検索する内容",
        recentTitle: "このページの最近のキーワード",
        recentClear: "すべて削除",
        recentClearTitle: "記録をすべて削除",
        recentHint:
          "ここに表示される履歴はブラウザに保存されます（削除可能）。ブラウザ自体の入力候補はブラウザ設定で管理してください。",
        caseLabel: "大文字・小文字を区別",
        regexLabel: "正規表現を使用",
        searchNameLabel: "ファイル名とパスを検索",
        searchContentLabel: "ファイル内容を検索",
        encodingLabel: "ファイルエンコーディング（「ファイル内容を検索」有効時のみ）",
        ignoreLabel: "追加で無視するディレクトリ名（カンマ区切り・任意）",
        ignorePlaceholder: "例 vendor,.cache",
        encodingOptions: {
          auto: "自動判定（chardet）",
          "gb18030": "GB18030（中国語 Windows で一般的）",
          big5: "Big5（繁体字中国語）",
          shift_jis: "Shift_JIS（日本語）",
          "euc-jp": "EUC-JP（日本語）",
          "euc-kr": "EUC-KR（韓国語）",
          "windows-1252": "Windows-1252（西欧）",
        },
        submit: "検索開始",
      },
    },
    "/manga.html": {
      "zh-CN": {
        subHtml:
          "纵向连续阅读：图片按文件名排序；可在工具栏切换<strong>横排多列</strong>网格，同屏浏览多页。仅加载<strong>当前文件夹</strong>内一层，不进入子目录。点击图片或「在资源管理器中打开」可在资源管理器中定位该文件。也可使用 <code>manga.html?path=目录&amp;layout=grid-3</code>（<code>layout</code> 可选 <code>vertical</code>、<code>grid-2</code>～<code>grid-4</code>）自动填入并加载。每张图下方可编辑<strong>标签与备注</strong>，与搜索页共用本机 <code>data/file-tags.json</code>。工具栏可<strong>多选删除</strong>；单张图下亦有「删除文件」（均从磁盘永久删除，不可撤销）。",
        dirLabel: "图片目录（绝对路径）",
        dirPlaceholder: "例如 C:\\漫画\\某话",
        layoutLabel: "布局",
        layoutVertical: "纵向单列（默认）",
        layout2: "横排 2 列",
        layout3: "横排 3 列",
        layout4: "横排 4 列",
        load: "加载",
        bulkLabel: "多选",
        selectAll: "全选",
        selectNone: "取消全选",
        deleteSelected: "删除选中",
      },
      en: {
        subHtml:
          'Continuous vertical reading: images are sorted by filename. You can switch to a multi-column <strong>grid layout</strong> in the toolbar. Only one level of the <strong>current folder</strong> is loaded (no subfolders). Click an image or "Reveal in Explorer" to locate the file. You can also use <code>manga.html?path=DIR&amp;layout=grid-3</code> (<code>layout</code>: <code>vertical</code>, <code>grid-2</code> to <code>grid-4</code>) for auto load. Tags and notes are shared via <code>data/file-tags.json</code>. The toolbar supports <strong>multi-select delete</strong>; each image also has "Delete File" (permanent disk delete, cannot be undone).',
        dirLabel: "Image Directory (absolute path)",
        dirPlaceholder: "e.g. C:\\Comics\\Chapter-01",
        layoutLabel: "Layout",
        layoutVertical: "Vertical Single Column (default)",
        layout2: "Grid 2 Columns",
        layout3: "Grid 3 Columns",
        layout4: "Grid 4 Columns",
        load: "Load",
        bulkLabel: "Multi-select",
        selectAll: "Select All",
        selectNone: "Clear Selection",
        deleteSelected: "Delete Selected",
      },
      ja: {
        subHtml:
          "縦方向の連続閲覧：画像はファイル名順で表示されます。ツールバーで<strong>複数列グリッド</strong>に切り替え可能です。読み込み対象は<strong>現在フォルダ</strong>直下のみ（サブフォルダなし）。画像または「エクスプローラーで開く」をクリックすると該当ファイルを表示できます。<code>manga.html?path=フォルダ&amp;layout=grid-3</code>（<code>layout</code> は <code>vertical</code>、<code>grid-2</code>～<code>grid-4</code>）でも自動読み込み可能です。各画像の下で<strong>タグとメモ</strong>を編集でき、<code>data/file-tags.json</code> を共有します。ツールバーは<strong>複数選択削除</strong>に対応し、各画像にも「ファイル削除」（ディスクから完全削除・元に戻せません）があります。",
        dirLabel: "画像ディレクトリ（絶対パス）",
        dirPlaceholder: "例 C:\\漫画\\第1話",
        layoutLabel: "レイアウト",
        layoutVertical: "縦1列（既定）",
        layout2: "横並び 2 列",
        layout3: "横並び 3 列",
        layout4: "横並び 4 列",
        load: "読み込み",
        bulkLabel: "複数選択",
        selectAll: "すべて選択",
        selectNone: "選択解除",
        deleteSelected: "選択を削除",
      },
    },
    "/video.html": {
      "zh-CN": {
        subHtml:
          "仅扫描<strong>当前文件夹一层</strong>（不含子目录），按文件名排序。浏览器内嵌播放器，服务端按字节区间（Range）流式传输，可拖动进度。支持常见容器如 mp4 / webm / mov 等。<strong>.mov</strong>若为 iPhone/相机常见的 H.264，一般可播；若为 ProRes、部分 HEVC 或旧编码，Chrome/Edge 可能<strong>黑屏 0:00</strong>（与文件名中的空格、<code>@</code> 无关），请用本地播放器。部分容器（mkv、avi）亦取决于浏览器。可使用 <code>video.html?path=目录绝对路径</code> 自动填入并加载。标签与备注与搜索、漫画页共用 <code>data/file-tags.json</code>。每条视频旁可<strong>重命名</strong>（同目录改名，标签随路径迁移）或<strong>删除文件</strong>（从磁盘永久删除，不可撤销）。",
        dirLabel: "视频目录（绝对路径）",
        dirPlaceholder: "例如 C:\\Videos\\某文件夹",
        load: "加载",
        listAria: "视频列表",
        backToTop: "回到顶部",
      },
      en: {
        subHtml:
          "Only one level of the <strong>current folder</strong> is scanned (no subfolders), sorted by filename. Videos are streamed via HTTP Range and can seek in-browser. Common containers such as mp4 / webm / mov are supported. For <strong>.mov</strong>, H.264 usually works; ProRes, some HEVC, or old codecs may show <strong>black screen at 0:00</strong> in Chrome/Edge (not related to spaces or <code>@</code> in filenames). For mkv/avi, support depends on browser codecs. You can use <code>video.html?path=ABS_DIR</code> for auto load. Tags and notes are shared via <code>data/file-tags.json</code>. Each item supports <strong>rename</strong> (same folder) and <strong>delete file</strong> (permanent disk delete).",
        dirLabel: "Video Directory (absolute path)",
        dirPlaceholder: "e.g. C:\\Videos\\SomeFolder",
        load: "Load",
        listAria: "Video List",
        backToTop: "Back to Top",
      },
      ja: {
        subHtml:
          "読み込み対象は<strong>現在フォルダ直下1階層</strong>のみ（サブフォルダなし）で、ファイル名順に表示します。ブラウザ内プレイヤーで再生し、サーバーは HTTP Range でストリーミング配信します。mp4 / webm / mov などに対応しています。<strong>.mov</strong> は H.264 なら再生できることが多いですが、ProRes・一部 HEVC・旧コーデックは Chrome/Edge で<strong>0:00 の黒画面</strong>になる場合があります（ファイル名の空白や <code>@</code> は無関係）。mkv/avi はブラウザ依存です。<code>video.html?path=絶対パス</code> で自動読み込みできます。タグとメモは <code>data/file-tags.json</code> を共有。各動画で<strong>リネーム</strong>（同フォルダ）と<strong>ファイル削除</strong>（完全削除）に対応しています。",
        dirLabel: "動画ディレクトリ（絶対パス）",
        dirPlaceholder: "例 C:\\Videos\\フォルダ",
        load: "読み込み",
        listAria: "動画一覧",
        backToTop: "トップへ戻る",
      },
    },
    "/overview.html": {
      "zh-CN": {
        subHtml:
          "在关键字搜索、漫画或视频页为文件添加的<strong>标签</strong>与<strong>备注（描述）</strong>会写入本机 <code>data/file-tags.json</code>。本页集中展示所有已记录项；下方可按<strong>标签</strong>多选筛选，并可选择 AND / OR 匹配模式，再与上方关键字（路径 / 标签 / 描述）组合使用。支持 <code>overview.html?tag=标签名</code> 打开时预选标签。表格中<strong>类型</strong>按扩展名区分图片 / 视频 / 其他文件。可在资源管理器中打开对应文件，也可<strong>删除记录</strong>（仅从 JSON 移除，不删磁盘文件）。操作列可对磁盘上的文件<strong>重命名</strong>（仅同目录、改文件名），已保存的标签会随路径迁移。修改标签或备注仍请在各浏览/搜索页的面板中操作。",
        filterLabel: "筛选（路径、任一标签或描述中包含即可）",
        filterPlaceholder: "输入关键字…",
        typeLabel: "类型",
        tagModeLabel: "标签匹配",
        typeAll: "全部",
        typeImage: "图片",
        typeVideo: "视频",
        typeOther: "其他",
        modeAnd: "AND（同时包含）",
        modeOr: "OR（任一包含）",
        refresh: "重新加载",
        toggle: "隐藏下方内容",
        tagFilterLabel: "按标签筛选",
        backToTop: "回到顶部",
      },
      en: {
        subHtml:
          "Tags and notes added in search, manga, or video pages are stored in local <code>data/file-tags.json</code>. This page shows all saved records. You can multi-select tags and choose AND/OR matching, then combine with keyword filter (path / tag / note). Open with <code>overview.html?tag=NAME</code> to preselect tags. The <strong>Type</strong> column classifies image / video / other by extension. You can reveal files in Explorer, remove records from JSON, and rename files in place (same folder, tags migrate with path).",
        filterLabel: "Filter (path / tag / note contains)",
        filterPlaceholder: "Enter keyword…",
        typeLabel: "Type",
        tagModeLabel: "Tag Match",
        typeAll: "All",
        typeImage: "Image",
        typeVideo: "Video",
        typeOther: "Other",
        modeAnd: "AND (match all selected)",
        modeOr: "OR (match any selected)",
        refresh: "Reload",
        toggle: "Hide Content Below",
        tagFilterLabel: "Filter by Tag",
        backToTop: "Back to Top",
      },
      ja: {
        subHtml:
          "検索・マンガ・動画ページで追加した<strong>タグ</strong>と<strong>メモ</strong>はローカルの <code>data/file-tags.json</code> に保存されます。このページでは保存済みレコードを一覧表示します。タグの複数選択と AND/OR 一致を選び、キーワード（パス/タグ/メモ）と組み合わせて絞り込みできます。<code>overview.html?tag=タグ名</code> で事前選択も可能です。<strong>種類</strong>列は拡張子で画像/動画/その他を判定します。エクスプローラーで表示、JSON からの削除、同一フォルダ内でのリネームに対応しています。",
        filterLabel: "フィルター（パス・タグ・メモを含む）",
        filterPlaceholder: "キーワードを入力…",
        typeLabel: "種類",
        tagModeLabel: "タグ一致",
        typeAll: "すべて",
        typeImage: "画像",
        typeVideo: "動画",
        typeOther: "その他",
        modeAnd: "AND（すべて含む）",
        modeOr: "OR（いずれか含む）",
        refresh: "再読み込み",
        toggle: "下の内容を隠す",
        tagFilterLabel: "タグで絞り込み",
        backToTop: "トップへ戻る",
      },
    },
  };

  function t(key) {
    return dict[lang]?.[key] || dict["zh-CN"][key] || key;
  }

  function setNavText() {
    const nav = document.querySelector(".top-nav");
    if (!nav) return;
    const links = nav.querySelectorAll("a.nav-link");
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      if (href === "/") a.textContent = t("navSearch");
      else if (href.startsWith("/manga.html")) a.textContent = t("navManga");
      else if (href.startsWith("/video.html")) a.textContent = t("navVideo");
      else if (href.startsWith("/overview.html")) a.textContent = t("navOverview");
      else if (href.startsWith("/task.html")) a.textContent = t("navTask");
    }
  }

  function featureFromHref(href) {
    const base = String(href || "").split("?")[0];
    if (base === "/" || base === "/index.html") return "search";
    if (base === "/manga.html") return "manga";
    if (base === "/video.html") return "video";
    if (base === "/overview.html") return "overview";
    if (base === "/task.html") return "task";
    return "";
  }

  function readEnabledFeatures() {
    try {
      const raw = localStorage.getItem(FEATURE_KEY);
      if (!raw) return new Set(ALL_FEATURES);
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set(ALL_FEATURES);
      const ok = arr.filter((x) => ALL_FEATURES.includes(String(x)));
      return new Set(ok.length ? ok : ALL_FEATURES);
    } catch {
      return new Set(ALL_FEATURES);
    }
  }

  function saveEnabledFeatures(set) {
    try {
      localStorage.setItem(FEATURE_KEY, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
  }

  function applyNavVisibility(enabledSet) {
    const nav = document.querySelector(".top-nav");
    if (!nav) return;
    const links = nav.querySelectorAll("a.nav-link");
    links.forEach((a) => {
      const feature = featureFromHref(a.getAttribute("href") || "");
      const show = !feature || enabledSet.has(feature);
      a.style.display = show ? "" : "none";
    });
    const visibleLinks = [...links].filter((a) => a.style.display !== "none");
    const seps = nav.querySelectorAll(".nav-sep");
    seps.forEach((s) => (s.style.display = "none"));
    for (let i = 0; i < visibleLinks.length - 1; i++) {
      const sep = visibleLinks[i].nextElementSibling;
      if (sep && sep.classList.contains("nav-sep")) sep.style.display = "";
    }
  }

  function createLangSelect() {
    const select = document.createElement("select");
    select.setAttribute("aria-label", t("langLabel"));
    select.style.fontSize = "0.85rem";
    select.style.padding = "0.25rem 0.35rem";
    select.style.borderRadius = "8px";
    select.style.border = "1px solid #cbd5e1";
    select.style.background = "#fff";
    select.style.color = "#111827";
    const opts = [
      ["zh-CN", t("langZh")],
      ["en", t("langEn")],
      ["ja", t("langJa")],
    ];
    for (const [value, text] of opts) {
      const op = document.createElement("option");
      op.value = value;
      op.textContent = text;
      if (value === lang) op.selected = true;
      select.appendChild(op);
    }
    select.addEventListener("change", () => {
      const next = normLang(select.value);
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch {
        /* ignore */
      }
      const qp = new URLSearchParams(location.search);
      qp.set("lang", next);
      location.search = qp.toString();
    });
    return select;
  }

  function appendSettingsButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", t("settingsAria"));
    btn.title = t("settings");
    btn.textContent = "⚙";
    btn.style.position = "fixed";
    btn.style.right = "1rem";
    btn.style.top = "0.9rem";
    btn.style.zIndex = "2000";
    btn.style.width = "2rem";
    btn.style.height = "2rem";
    btn.style.border = "1px solid #cbd5e1";
    btn.style.borderRadius = "999px";
    btn.style.background = "#fff";
    btn.style.color = "#1f2937";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";

    const panel = document.createElement("div");
    panel.hidden = true;
    panel.style.position = "fixed";
    panel.style.right = "1rem";
    panel.style.top = "3.2rem";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "13rem";
    panel.style.padding = "0.7rem 0.8rem";
    panel.style.border = "1px solid #cbd5e1";
    panel.style.borderRadius = "10px";
    panel.style.background = "#fff";
    panel.style.boxShadow = "0 10px 24px rgba(0,0,0,0.16)";

    const title = document.createElement("div");
    title.textContent = t("settings");
    title.style.fontSize = "0.86rem";
    title.style.fontWeight = "700";
    title.style.color = "#111827";
    title.style.marginBottom = "0.55rem";

    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "0.35rem";
    row.style.fontSize = "0.78rem";
    row.style.color = "#4b5563";
    row.textContent = t("langLabel");
    row.appendChild(createLangSelect());

    const featureWrap = document.createElement("div");
    featureWrap.style.marginTop = "0.7rem";
    featureWrap.style.paddingTop = "0.55rem";
    featureWrap.style.borderTop = "1px solid #e5e7eb";
    const featureTitle = document.createElement("div");
    featureTitle.textContent = t("featureLabel");
    featureTitle.style.fontSize = "0.78rem";
    featureTitle.style.color = "#4b5563";
    featureTitle.style.marginBottom = "0.35rem";
    featureWrap.appendChild(featureTitle);

    const enabledSet = readEnabledFeatures();
    const defs = [
      ["search", t("featureSearch")],
      ["manga", t("featureManga")],
      ["video", t("featureVideo")],
      ["overview", t("featureOverview")],
      ["task", t("featureTask")],
    ];
    defs.forEach(([id, label]) => {
      const line = document.createElement("label");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "0.45rem";
      line.style.fontSize = "0.82rem";
      line.style.color = "#111827";
      line.style.margin = "0.2rem 0";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = enabledSet.has(id);
      cb.addEventListener("change", () => {
        if (cb.checked) enabledSet.add(id);
        else enabledSet.delete(id);
        if (enabledSet.size === 0) {
          enabledSet.add(id);
          cb.checked = true;
        }
        saveEnabledFeatures(enabledSet);
        applyNavVisibility(enabledSet);
      });
      const text = document.createElement("span");
      text.textContent = label;
      line.appendChild(cb);
      line.appendChild(text);
      featureWrap.appendChild(line);
    });

    panel.appendChild(title);
    panel.appendChild(row);
    panel.appendChild(featureWrap);
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
    });
    panel.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      panel.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") panel.hidden = true;
    });
  }

  function patchNavHrefWithLang() {
    const links = document.querySelectorAll(".top-nav a.nav-link");
    for (const a of links) {
      const raw = a.getAttribute("href");
      if (!raw) continue;
      const [base, query = ""] = raw.split("?");
      const qp = new URLSearchParams(query);
      qp.set("lang", lang);
      a.setAttribute("href", `${base}?${qp.toString()}`);
    }
  }

  function setPageTitleAndHeading() {
    const path = location.pathname === "/index.html" ? "/" : location.pathname;
    const cfg = pageDict[path]?.[lang] || pageDict[path]?.["zh-CN"];
    if (!cfg) return;
    if (cfg.title) document.title = cfg.title;
    const h1 = document.querySelector("h1");
    if (h1 && cfg.h1) h1.textContent = cfg.h1;
  }

  function applyPageUiText() {
    const path = location.pathname === "/index.html" ? "/" : location.pathname;
    const cfg = pageUi[path]?.[lang] || pageUi[path]?.["zh-CN"];
    if (!cfg) return;

    if (path === "/") {
      const sub = document.querySelector(".header .sub");
      if (sub && cfg.subHtml) sub.innerHTML = cfg.subHtml;
      const rootSpan = document.querySelector("label.field #root")?.closest("label.field")?.querySelector("span");
      if (rootSpan && cfg.rootLabel) rootSpan.textContent = cfg.rootLabel;
      const kwSpan = document.querySelector("label.field #keyword")?.closest("label.field")?.querySelector("span");
      if (kwSpan && cfg.keywordLabel) kwSpan.textContent = cfg.keywordLabel;
      const rootInput = document.getElementById("root");
      if (rootInput && cfg.rootPlaceholder) rootInput.setAttribute("placeholder", cfg.rootPlaceholder);
      const keywordInput = document.getElementById("keyword");
      if (keywordInput && cfg.keywordPlaceholder) keywordInput.setAttribute("placeholder", cfg.keywordPlaceholder);
      const recentTitle = document.querySelector("#recentBlock .recent-title");
      if (recentTitle && cfg.recentTitle) recentTitle.textContent = cfg.recentTitle;
      const recentClear = document.getElementById("recentClear");
      if (recentClear) {
        if (cfg.recentClear) recentClear.textContent = cfg.recentClear;
        if (cfg.recentClearTitle) recentClear.setAttribute("title", cfg.recentClearTitle);
      }
      const recentHint = document.querySelector("#recentBlock .recent-hint");
      if (recentHint && cfg.recentHint) recentHint.textContent = cfg.recentHint;
      const caseLabel = document.querySelector("#case")?.closest("label");
      if (caseLabel && cfg.caseLabel) caseLabel.lastChild.nodeValue = ` ${cfg.caseLabel}`;
      const regexLabel = document.querySelector("#regex")?.closest("label");
      if (regexLabel && cfg.regexLabel) regexLabel.lastChild.nodeValue = ` ${cfg.regexLabel}`;
      const nameLabel = document.querySelector("#searchName")?.closest("label");
      if (nameLabel && cfg.searchNameLabel) nameLabel.lastChild.nodeValue = ` ${cfg.searchNameLabel}`;
      const contentLabel = document.querySelector("#searchContent")?.closest("label");
      if (contentLabel && cfg.searchContentLabel) contentLabel.lastChild.nodeValue = ` ${cfg.searchContentLabel}`;
      const encodingSpan =
        document.querySelector("#encoding")?.closest("label.field")?.querySelector("span");
      if (encodingSpan && cfg.encodingLabel) encodingSpan.textContent = cfg.encodingLabel;
      const encoding = document.getElementById("encoding");
      if (encoding && cfg.encodingOptions) {
        for (const op of encoding.options) {
          const next = cfg.encodingOptions[op.value];
          if (next) op.text = next;
        }
      }
      const ignoreSpan = document.querySelector("#ignore")?.closest("label.field")?.querySelector("span");
      if (ignoreSpan && cfg.ignoreLabel) ignoreSpan.textContent = cfg.ignoreLabel;
      const ignoreInput = document.getElementById("ignore");
      if (ignoreInput && cfg.ignorePlaceholder) {
        ignoreInput.setAttribute("placeholder", cfg.ignorePlaceholder);
      }
      const submitBtn = document.getElementById("submit");
      if (submitBtn && cfg.submit) submitBtn.textContent = cfg.submit;
    }

    if (path === "/manga.html") {
      const sub = document.querySelector(".manga-header .sub");
      if (sub && cfg.subHtml) sub.innerHTML = cfg.subHtml;
      const dirSpan = document.querySelector("#mangaDirPath")?.closest("label.field")?.querySelector("span");
      if (dirSpan && cfg.dirLabel) dirSpan.textContent = cfg.dirLabel;
      const dirInput = document.getElementById("mangaDirPath");
      if (dirInput && cfg.dirPlaceholder) dirInput.setAttribute("placeholder", cfg.dirPlaceholder);
      const layoutSpan = document.querySelector("#mangaLayout")?.closest("label.field")?.querySelector("span");
      if (layoutSpan && cfg.layoutLabel) layoutSpan.textContent = cfg.layoutLabel;
      const layoutSel = document.getElementById("mangaLayout");
      if (layoutSel) {
        if (layoutSel.options[0] && cfg.layoutVertical) layoutSel.options[0].text = cfg.layoutVertical;
        if (layoutSel.options[1] && cfg.layout2) layoutSel.options[1].text = cfg.layout2;
        if (layoutSel.options[2] && cfg.layout3) layoutSel.options[2].text = cfg.layout3;
        if (layoutSel.options[3] && cfg.layout4) layoutSel.options[3].text = cfg.layout4;
      }
      const loadBtn = document.getElementById("mangaLoadBtn");
      if (loadBtn && cfg.load) loadBtn.textContent = cfg.load;
      const bulkLabel = document.querySelector("#mangaBulkBar .manga-bulk-label");
      if (bulkLabel && cfg.bulkLabel) bulkLabel.textContent = cfg.bulkLabel;
      const selectAll = document.getElementById("mangaSelectAll");
      if (selectAll && cfg.selectAll) selectAll.textContent = cfg.selectAll;
      const selectNone = document.getElementById("mangaSelectNone");
      if (selectNone && cfg.selectNone) selectNone.textContent = cfg.selectNone;
      const delSelected = document.getElementById("mangaDeleteSelected");
      if (delSelected && cfg.deleteSelected) delSelected.textContent = cfg.deleteSelected;
    }

    if (path === "/video.html") {
      const sub = document.querySelector(".video-header .sub");
      if (sub && cfg.subHtml) sub.innerHTML = cfg.subHtml;
      const dirSpan = document.querySelector("#videoDirPath")?.closest("label.field")?.querySelector("span");
      if (dirSpan && cfg.dirLabel) dirSpan.textContent = cfg.dirLabel;
      const dirInput = document.getElementById("videoDirPath");
      if (dirInput && cfg.dirPlaceholder) dirInput.setAttribute("placeholder", cfg.dirPlaceholder);
      const loadBtn = document.getElementById("videoLoadBtn");
      if (loadBtn && cfg.load) loadBtn.textContent = cfg.load;
      const list = document.getElementById("videoList");
      if (list && cfg.listAria) list.setAttribute("aria-label", cfg.listAria);
      const topBtn = document.getElementById("backToTopBtn");
      if (topBtn && cfg.backToTop) {
        topBtn.textContent = cfg.backToTop;
        topBtn.setAttribute("aria-label", cfg.backToTop);
      }
    }

    if (path === "/overview.html") {
      const sub = document.querySelector(".ov-header .sub");
      if (sub && cfg.subHtml) sub.innerHTML = cfg.subHtml;
      const filterLabel = document.querySelector("#ovFilter")?.closest("label");
      if (filterLabel && cfg.filterLabel) {
        const firstTextNode = [...filterLabel.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
        if (firstTextNode) firstTextNode.nodeValue = `\n          ${cfg.filterLabel}\n          `;
      }
      const filterInput = document.getElementById("ovFilter");
      if (filterInput && cfg.filterPlaceholder) {
        filterInput.setAttribute("placeholder", cfg.filterPlaceholder);
      }
      const kindSpan = document.querySelector("#ovKindFilter")?.closest("label")?.querySelector("span");
      if (kindSpan && cfg.typeLabel) kindSpan.textContent = cfg.typeLabel;
      const modeSpan = document.querySelector("#ovTagMode")?.closest("label")?.querySelector("span");
      if (modeSpan && cfg.tagModeLabel) modeSpan.textContent = cfg.tagModeLabel;
      const kindSel = document.getElementById("ovKindFilter");
      if (kindSel) {
        if (kindSel.options[0] && cfg.typeAll) kindSel.options[0].text = cfg.typeAll;
        if (kindSel.options[1] && cfg.typeImage) kindSel.options[1].text = cfg.typeImage;
        if (kindSel.options[2] && cfg.typeVideo) kindSel.options[2].text = cfg.typeVideo;
        if (kindSel.options[3] && cfg.typeOther) kindSel.options[3].text = cfg.typeOther;
      }
      const modeSel = document.getElementById("ovTagMode");
      if (modeSel) {
        if (modeSel.options[0] && cfg.modeAnd) modeSel.options[0].text = cfg.modeAnd;
        if (modeSel.options[1] && cfg.modeOr) modeSel.options[1].text = cfg.modeOr;
      }
      const refreshBtn = document.getElementById("ovRefresh");
      if (refreshBtn && cfg.refresh) refreshBtn.textContent = cfg.refresh;
      const toggleBtn = document.getElementById("ovToggleContent");
      if (toggleBtn && cfg.toggle) toggleBtn.textContent = cfg.toggle;
      const tagFilterLabel = document.querySelector("#ovTagFilterWrap .ov-tag-filter-label");
      if (tagFilterLabel && cfg.tagFilterLabel) tagFilterLabel.textContent = cfg.tagFilterLabel;
      const topBtn = document.getElementById("ovBackToTopBtn");
      if (topBtn && cfg.backToTop) {
        topBtn.textContent = cfg.backToTop;
        topBtn.setAttribute("aria-label", cfg.backToTop);
      }
    }
  }

  document.documentElement.lang = lang;
  window.__kwLang = lang;
  window.__kwI18n = {
    lang,
    t,
  };

  setNavText();
  setPageTitleAndHeading();
  applyPageUiText();
  patchNavHrefWithLang();
  applyNavVisibility(readEnabledFeatures());
  appendSettingsButton();
})();
