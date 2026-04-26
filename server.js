/**
 * 应用入口：
 * - 负责中间件与静态资源挂载
 * - 保留搜索接口（/api/search）
 * - 将媒体/标签相关接口委托给 routes 模块
 */
import chardet from "chardet";
import ChineseHolidays from "chinese-holidays";
import Holidays from "date-holidays";
import express from "express";
import fs from "fs/promises";
import http from "http";
import iconv from "iconv-lite";
import path from "path";
import { fileURLToPath } from "url";
import * as logger from "./logger.js";
import { compareScoreDescThenName } from "./lib/media.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { registerTagRoutes } from "./routes/tags.js";
import * as tagStore from "./tags-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const BASE_PORT = Number(process.env.PORT) || 3847;
const API_ACCESS_LOG_SKIP = new Set(["/api/image-file", "/api/video-file"]);
const cnHolidayBookPromise = ChineseHolidays.ready({ offline: true }).catch(() => null);

// 中国节假日兜底修正规则（优先级高于第三方库数据）。
// 说明：个别年份放假/调休安排可能与库内数据存在差异，这里按已确认规则覆盖。
const CN_HOLIDAY_OVERRIDES = {
  2026: {
    // 删除第三方库中与国务院通知不一致的日期
    clear: ["2026-09-19", "2026-09-30", "2026-10-09"],
    holiday: {
      "2026-05-01": "劳动节",
      "2026-05-02": "劳动节",
      "2026-05-03": "劳动节",
      "2026-05-04": "劳动节",
      "2026-05-05": "劳动节",
      "2026-10-01": "国庆节",
      "2026-10-02": "国庆节",
      "2026-10-03": "国庆节",
      "2026-10-04": "国庆节",
      "2026-10-05": "国庆节",
      "2026-10-06": "国庆节",
      "2026-10-07": "国庆节",
    },
    workingday: {
      "2026-05-09": "劳动节调休",
      "2026-09-20": "国庆节调休",
      "2026-10-10": "国庆节调休",
    },
  },
};

function applyCnHolidayOverrides(map, year) {
  const override = CN_HOLIDAY_OVERRIDES[year];
  if (!override) return;
  for (const date of override.clear || []) {
    map.delete(date);
  }
  for (const [date, name] of Object.entries(override.holiday || {})) {
    map.set(date, {
      date,
      name,
      type: "public",
      allDay: true,
      isHoliday: true,
      isWorkingday: false,
    });
  }
  for (const [date, name] of Object.entries(override.workingday || {})) {
    map.set(date, {
      date,
      name,
      type: "workingday",
      allDay: true,
      isHoliday: false,
      isWorkingday: true,
    });
  }
}

function formatLocalDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (API_ACCESS_LOG_SKIP.has(req.path)) return next();
  const start = Date.now();
  res.on("finish", () => {
    logger.info("http", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});
app.use(express.static(path.join(__dirname, "public")));

/** 搜索时默认忽略的常见构建与依赖目录 */
const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".turbo",
]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_MATCHES = 5000;
const MAX_FILES_SCANNED = 200_000;

/** 前端手动可选编码（与 iconv-lite 兼容） */
const MANUAL_ENCODINGS = new Set([
  "utf-8",
  "gb18030",
  "gbk",
  "gb2312",
  "big5",
  "shift_jis",
  "euc-jp",
  "euc-kr",
  "utf-16le",
  "utf-16be",
  "windows-1252",
  "latin1",
]);

/** chardet 名称到 iconv 编码名映射（必要兼容层） */
const CHARDET_TO_ICONV = {
  "ISO-8859-1": "windows-1252",
  "ISO-8859-2": "ISO-8859-2",
  "ISO-8859-5": "ISO-8859-5",
  "ISO-8859-6": "ISO-8859-6",
  "ISO-8859-7": "ISO-8859-7",
  "ISO-8859-8": "ISO-8859-8",
  "ISO-8859-9": "ISO-8859-9",
  "windows-1251": "windows-1251",
  "windows-1256": "windows-1256",
  KOI8_R: "KOI8-R",
};

function normalizeEncodingRequest(raw) {
  if (raw == null || raw === "") return "auto";
  const s = String(raw).trim().toLowerCase();
  const aliases = {
    utf8: "utf-8",
    sjis: "shift_jis",
    "shift-jis": "shift_jis",
    cp932: "shift_jis",
    eucjp: "euc-jp",
    euckr: "euc-kr",
    cp936: "gbk",
    utf16le: "utf-16le",
    utf16be: "utf-16be",
    cp1252: "windows-1252",
    iso88591: "latin1",
  };
  const v = aliases[s] || s;
  if (v === "auto") return "auto";
  if (MANUAL_ENCODINGS.has(v)) return v;
  return null;
}

function manualModeToIconvEncoding(mode) {
  if (mode === "shift_jis") return "Shift_JIS";
  if (mode === "euc-jp") return "EUC-JP";
  if (mode === "euc-kr") return "EUC-KR";
  if (mode === "utf-16le") return "UTF-16LE";
  if (mode === "utf-16be") return "UTF-16BE";
  if (mode === "gb2312") return "gb2312";
  if (mode === "gb18030") return "gb18030";
  if (mode === "gbk") return "gbk";
  if (mode === "big5") return "big5";
  if (mode === "windows-1252") return "windows-1252";
  if (mode === "latin1") return "latin1";
  return "utf-8";
}

function chardetNameToIconv(name) {
  if (!name) return "utf-8";
  if (iconv.encodingExists(name)) return name;
  const mapped = CHARDET_TO_ICONV[name];
  if (mapped && iconv.encodingExists(mapped)) return mapped;
  return "utf-8";
}

function autoTieBreakPriority(iconvEnc) {
  const k = String(iconvEnc).toLowerCase();
  if (k === "ascii") return 99;
  const order = [
    "utf-8",
    "gb18030",
    "gbk",
    "gb2312",
    "big5",
    "shift_jis",
    "euc-jp",
    "euc-kr",
    "utf-16le",
    "utf-16be",
    "windows-1252",
    "latin1",
    "iso-8859-2",
    "iso-8859-5",
    "windows-1251",
    "windows-1256",
    "koi8-r",
  ];
  const i = order.indexOf(k);
  return i === -1 ? 50 : i;
}

function tryDecodeUtf8Strict(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return null;
  }
}

function decodeBufferForSearch(buf, encodingMode) {
  // 手动模式：直接按用户指定编码解码
  if (encodingMode !== "auto") {
    const iconvEnc = manualModeToIconvEncoding(encodingMode);
    return { text: iconv.decode(buf, iconvEnc), iconvEnc };
  }
  // 自动模式：优先严格 UTF-8，再回退 chardet 结果
  const utf8Strict = tryDecodeUtf8Strict(buf);
  if (utf8Strict !== null) return { text: utf8Strict, iconvEnc: "utf-8" };
  const matches = chardet
    .analyse(buf)
    .map((m) => ({ m, enc: chardetNameToIconv(m.name) }))
    .filter((x) => x.enc && iconv.encodingExists(x.enc));
  if (matches.length === 0) return { text: iconv.decode(buf, "utf-8"), iconvEnc: "utf-8" };
  matches.sort((a, b) => {
    if (b.m.confidence !== a.m.confidence) return b.m.confidence - a.m.confidence;
    return autoTieBreakPriority(a.enc) - autoTieBreakPriority(b.enc);
  });
  const iconvEnc = matches[0].enc;
  return { text: iconv.decode(buf, iconvEnc), iconvEnc };
}

function shouldIgnoreDir(name, extraIgnores) {
  if (DEFAULT_IGNORE_DIRS.has(name)) return true;
  return extraIgnores.some((p) => p === name);
}

async function* walkFiles(root, extraIgnores) {
  // 使用显式栈 DFS，避免深层目录递归导致调用栈风险
  const stack = [root];
  let scanned = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (scanned >= MAX_FILES_SCANNED) return;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (shouldIgnoreDir(ent.name, extraIgnores)) continue;
        stack.push(full);
      } else if (ent.isFile()) {
        scanned++;
        yield full;
      }
    }
  }
}

function looksBinary(buf) {
  // 简易二进制探测：采样区间内出现 \0 视为二进制
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  for (let i = 0; i < sample.length; i++) if (sample[i] === 0) return true;
  return false;
}

function searchInText(text, keyword, { caseSensitive, useRegex }) {
  const matches = [];
  let re;
  if (useRegex) {
    try {
      re = new RegExp(keyword, caseSensitive ? "g" : "gi");
    } catch (e) {
      throw new Error("无效的正则表达式: " + e.message);
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      re.lastIndex = 0;
      if (re.test(line)) matches.push({ line: idx + 1, text: line.slice(0, 500) });
    });
  } else {
    const lines = text.split(/\r?\n/);
    const needle = caseSensitive ? keyword : keyword.toLowerCase();
    lines.forEach((line, idx) => {
      const hay = caseSensitive ? line : line.toLowerCase();
      if (hay.includes(needle)) matches.push({ line: idx + 1, text: line.slice(0, 500) });
    });
  }
  return matches;
}

function stringMatchesKeyword(haystack, keyword, { caseSensitive, useRegex }) {
  if (useRegex) {
    const re = new RegExp(keyword, caseSensitive ? "" : "i");
    return re.test(haystack);
  }
  const h = caseSensitive ? haystack : haystack.toLowerCase();
  const n = caseSensitive ? keyword : keyword.toLowerCase();
  return h.includes(n);
}

function filePathMatchesKeyword(filePath, keyword, opts) {
  const base = path.basename(filePath);
  return stringMatchesKeyword(base, keyword, opts) || stringMatchesKeyword(filePath, keyword, opts);
}

app.post("/api/search", async (req, res) => {
  // 1) 参数校验
  const body = req.body || {};
  const rootRaw = body.root;
  const keyword = typeof body.keyword === "string" ? body.keyword : String(body.keyword ?? "");
  const caseSensitive = Boolean(body.caseSensitive);
  const useRegex = Boolean(body.useRegex);
  const ignoreDirs = Array.isArray(body.ignoreDirs) ? body.ignoreDirs : [];
  const encodingMode = normalizeEncodingRequest(body.encoding);
  if (encodingMode === null) return res.status(400).json({ error: "不支持的 encoding 参数" });
  const searchFileName = body.searchFileName !== false;
  const searchContent = body.searchContent === true;
  const keywordTrim = keyword.trim();
  if (!keywordTrim) return res.status(400).json({ error: "请填写关键字" });
  if (useRegex) {
    try {
      new RegExp(keywordTrim, caseSensitive ? "" : "i");
    } catch (e) {
      return res.status(400).json({ error: "无效的正则表达式: " + e.message });
    }
  }
  if (!rootRaw || typeof rootRaw !== "string") return res.status(400).json({ error: "请填写根目录路径" });
  if (!searchFileName && !searchContent) {
    return res.status(400).json({ error: "请至少开启「搜索文件名与路径」或「搜索文件内容」之一" });
  }

  // 2) 根目录校验
  const root = path.resolve(rootRaw.trim());
  // 3) 扫描与匹配
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) return res.status(400).json({ error: "根路径不是目录" });
  } catch {
    return res.status(400).json({ error: "根目录不存在或无法访问" });
  }

  const extraIgnores = ignoreDirs.map((s) => String(s).trim()).filter(Boolean);
  const results = [];
  let filesScanned = 0;
  let truncated = false;
  let regexError = null;
  const encodingStats = encodingMode === "auto" && searchContent ? Object.create(null) : null;
  const nameOpts = { caseSensitive, useRegex };

  function pushResult(filePath, matches) {
    results.push({ file: filePath, matches });
    const totalMatches = results.reduce((n, r) => n + r.matches.length, 0);
    if (totalMatches >= MAX_MATCHES) {
      truncated = true;
      return true;
    }
    return false;
  }

  try {
    for await (const filePath of walkFiles(root, extraIgnores)) {
      filesScanned++;
      const nameHit = searchFileName && filePathMatchesKeyword(filePath, keywordTrim, nameOpts);
      if (!searchContent) {
        if (nameHit) {
          const base = path.basename(filePath);
          if (pushResult(filePath, [{ line: 0, text: `（文件名）${base}` }])) break;
        }
        continue;
      }
      let buf;
      try {
        buf = await fs.readFile(filePath);
      } catch {
        continue;
      }
      if (buf.length > MAX_FILE_BYTES) {
        if (nameHit) {
          const hit = [{ line: 0, text: `（文件名）文件过大已跳过正文 ${path.basename(filePath)}` }];
          if (pushResult(filePath, hit)) break;
        }
        continue;
      }
      if (looksBinary(buf)) {
        if (nameHit && pushResult(filePath, [{ line: 0, text: `（文件名）${path.basename(filePath)}` }])) break;
        continue;
      }
      const { text, iconvEnc } = decodeBufferForSearch(buf, encodingMode);
      if (encodingStats) encodingStats[iconvEnc] = (encodingStats[iconvEnc] || 0) + 1;
      let lineMatches;
      try {
        lineMatches = searchInText(text, keywordTrim, { caseSensitive, useRegex });
      } catch (e) {
        regexError = e.message;
        break;
      }
      if (nameHit) {
        const tag = { line: 0, text: `（文件名）${path.basename(filePath)}` };
        if (!lineMatches.some((m) => m.line === 0 && m.text === tag.text)) lineMatches = [tag, ...lineMatches];
      }
      if (lineMatches.length && pushResult(filePath, lineMatches)) break;
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || "搜索失败" });
  }
  if (regexError) return res.status(400).json({ error: regexError });

  // 4) 统计同名文件（用于前端“同名”标识）
  const basenameCount = new Map();
  for (const r of results) {
    const key = process.platform === "win32" ? path.basename(r.file).toLowerCase() : path.basename(r.file);
    basenameCount.set(key, (basenameCount.get(key) || 0) + 1);
  }
  for (const r of results) {
    const key = process.platform === "win32" ? path.basename(r.file).toLowerCase() : path.basename(r.file);
    r.duplicateBasename = basenameCount.get(key) > 1;
  }
  // 5) 附加标签/备注/评分并按评分排序
  try {
    await tagStore.attachTagsToSearchResults(results);
  } catch (e) {
    logger.error("[tags] attach search", { err: String(e) });
  }
  results.sort((a, b) => compareScoreDescThenName(a, b, "file"));

  res.json({
    root,
    searchFileName,
    searchContent,
    encoding: encodingMode,
    encodingStats: encodingStats && Object.keys(encodingStats).length ? encodingStats : undefined,
    filesScanned,
    truncated,
    maxMatches: MAX_MATCHES,
    results,
  });
});

app.get("/api/holidays", async (req, res) => {
  const country = String(req.query.country || "").trim().toUpperCase();
  const yearRaw = Number(req.query.year);
  const year = Number.isFinite(yearRaw) ? Math.trunc(yearRaw) : NaN;
  if (!["CN", "JP"].includes(country)) {
    return res.status(400).json({ error: "country 仅支持 CN 或 JP" });
  }
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return res.status(400).json({ error: "year 参数无效" });
  }
  try {
    let items = [];
    if (country === "CN") {
      const book = await cnHolidayBookPromise;
      if (!book) return res.status(500).json({ error: "中国节假日日历不可用" });
      const map = new Map();
      for (const ev of book.events()) {
        const days = ev.days().filter((d) => d.getFullYear() === year);
        for (const d of days) {
          // chinese-holidays 返回的是本地时区日期，不能用 toISOString() 否则会偏移到前一天。
          const date = formatLocalDate(d);
          const prev = map.get(date) || { date, name: "", allDay: true, isHoliday: false, isWorkingday: false };
          const isHoliday = Boolean(ev.isHoliday());
          const isWorkingday = Boolean(ev.isWorkingday());
          const next = {
            ...prev,
            name: String(ev.name || prev.name || ""),
            type: isWorkingday ? "workingday" : isHoliday ? "public" : "other",
            isHoliday: prev.isHoliday || isHoliday,
            isWorkingday: prev.isWorkingday || isWorkingday,
            allDay: true,
          };
          map.set(date, next);
        }
      }
      applyCnHolidayOverrides(map, year);
      items = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const hd = new Holidays(country);
      items = (hd.getHolidays(year) || [])
        .filter((x) => x && x.date)
        .map((x) => ({
          date: String(x.date).slice(0, 10),
          dateTime: String(x.date),
          name: String(x.name || ""),
          type: String(x.type || ""),
          allDay: /\s00:00:00$/.test(String(x.date)),
          isHoliday: String(x.type || "").toLowerCase() === "public",
          isWorkingday: false,
        }));
    }
    res.json({ ok: true, country, year, items });
  } catch (e) {
    res.status(500).json({ error: e.message || "读取节假日失败" });
  }
});

// 将高耦合接口拆到独立路由模块，降低 server.js 体积
registerTagRoutes(app, { logger, tagStore });
registerMediaRoutes(app, { logger, tagStore });
registerTaskRoutes(app, { logger });

function listenFrom(port, attemptsLeft) {
  // 端口被占用时自动递增重试，方便本地多实例开发
  const server = http.createServer(app);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      logger.warn("端口占用，尝试递增", { port, next: port + 1 });
      server.close(() => listenFrom(port + 1, attemptsLeft - 1));
    } else {
      logger.error("server listen error", { err: String(err), code: err.code });
      process.exit(1);
    }
  });
  server.listen(port, "127.0.0.1", () => {
    const base = `http://127.0.0.1:${port}`;
    logger.info("server listening", { port, logDir: logger.logDir(), base });
    // console.log(`搜索 ${base}/  漫画 ${base}/manga.html  视频 ${base}/video.html  标注一览 ${base}/overview.html`);
    // console.log(`运行日志目录: ${logger.logDir()}（按天 app-YYYY-MM-DD.log；可用 KW_WEB_NO_LOG=1 关闭写文件）`);
  });
}

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { err: String(err), stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", { reason: String(reason) });
});

logger.info("person-tool-web boot", {
  node: process.version,
  cwd: process.cwd(),
  dirname: __dirname,
});

listenFrom(BASE_PORT, 30);
