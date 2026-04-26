import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "logs");

/**
 * 运行日志：写入项目下 logs/app-YYYY-MM-DD.log（按天滚动，链式 append 避免并发写乱序）。
 *
 * 环境变量：
 * - KW_WEB_NO_LOG=1 — 不写文件（error/warn 仍会打控制台）
 * - KW_WEB_LOG_LEVEL=error|warn|info|debug — 写入文件的最低级别，默认 info
 */
let writeChain = Promise.resolve();

const LEVEL_ORDER = { error: 0, warn: 1, info: 2, debug: 3 };

function minLevelNum() {
  const raw = String(process.env.KW_WEB_LOG_LEVEL || "info").toLowerCase();
  return LEVEL_ORDER[raw] ?? LEVEL_ORDER.info;
}

/** 是否写入日志文件（受 NO_LOG 与级别控制） */
function fileShouldLog(level) {
  if (process.env.KW_WEB_NO_LOG === "1") return false;
  return (LEVEL_ORDER[level] ?? 2) <= minLevelNum();
}

function toLine(level, msg, meta) {
  const ts = new Date().toISOString();
  let line = `${ts} [${String(level).toUpperCase()}] ${String(msg).replace(/\r?\n/g, " ").trim()}`;
  if (meta != null && typeof meta === "object") {
    try {
      const keys = Object.keys(meta);
      if (keys.length) line += ` ${JSON.stringify(meta)}`;
    } catch {
      line += " [meta]";
    }
  } else if (meta != null) {
    line += ` ${String(meta)}`;
  }
  return line + "\n";
}

async function appendLine(line) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const file = path.join(LOG_DIR, `app-${y}-${mo}-${day}.log`);
  await fs.appendFile(file, line, "utf8");
}

function queueWrite(level, msg, meta) {
  if (!fileShouldLog(level)) return;
  const line = toLine(level, msg, meta);
  writeChain = writeChain
    .then(() => appendLine(line))
    .catch((e) => {
      console.error("[logger] append failed", e);
    });
}

export function debug(msg, meta) {
  queueWrite("debug", msg, meta);
}

export function info(msg, meta) {
  queueWrite("info", msg, meta);
}

export function warn(msg, meta) {
  console.warn("[WARN]", msg, meta ?? "");
  queueWrite("warn", msg, meta);
}

export function error(msg, meta) {
  console.error("[ERROR]", msg, meta ?? "");
  queueWrite("error", msg, meta);
}

export function logDir() {
  return LOG_DIR;
}
