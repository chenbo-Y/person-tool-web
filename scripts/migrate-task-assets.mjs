#!/usr/bin/env node
/**
 * 将旧版扁平目录 data/task-assets/ 下的附件，按 tasks.json 中的 Markdown 引用
 * 移动到 data/task/<任务ID>/，并把正文里的链接从
 *   /api/task-files/<文件名> 或 /api/task-assets/<文件名>
 * 更新为
 *   /api/task-files/<任务ID>/<文件名>
 *
 * 用法：
 *   node scripts/migrate-task-assets.mjs           # 执行迁移
 *   node scripts/migrate-task-assets.mjs --dry-run # 只打印计划，不写盘、不移动文件
 *
 * 可选环境变量（与 server 一致）：
 *   KW_WEB_TASKS_FILE、KW_WEB_TASK_FILES_BASE、KW_WEB_TASK_LEGACY_ASSETS、KW_WEB_TASK_ASSET_DIR
 */

import fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function envPath(key, fallback) {
  const v = process.env[key];
  if (v != null && String(v).trim() !== "") return path.resolve(String(v).trim());
  return fallback;
}

const TASKS_FILE = envPath("KW_WEB_TASKS_FILE", path.join(ROOT, "data", "tasks.json"));
const TASK_FILES_BASE = envPath("KW_WEB_TASK_FILES_BASE", path.join(ROOT, "data", "task"));
const LEGACY_DIR = envPath(
  "KW_WEB_TASK_LEGACY_ASSETS",
  envPath("KW_WEB_TASK_ASSET_DIR", path.join(ROOT, "data", "task-assets")),
);

const dryRun = process.argv.includes("--dry-run");

function replaceUrlsInText(text, fileName, taskId) {
  if (!text) return text;
  let out = text;
  const fromFiles = `/api/task-files/${fileName}`;
  const fromAssets = `/api/task-assets/${fileName}`;
  const to = `/api/task-files/${taskId}/${fileName}`;
  out = out.split(fromFiles).join(to);
  out = out.split(fromAssets).join(to);
  return out;
}

function applyUrlReplacementsForFile(tasks, fileName, taskIds) {
  let changed = false;
  for (const t of tasks) {
    if (!taskIds.includes(String(t.id))) continue;
    const d0 = t.detail;
    t.detail = replaceUrlsInText(t.detail, fileName, t.id);
    if (t.detail !== d0) changed = true;
    if (Array.isArray(t.progress)) {
      for (const p of t.progress) {
        const c0 = p.content;
        p.content = replaceUrlsInText(p.content, fileName, t.id);
        if (p.content !== c0) changed = true;
      }
    }
  }
  return changed;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function safeMove(src, dst) {
  await fs.mkdir(path.dirname(dst), { recursive: true });
  try {
    await fs.rename(src, dst);
  } catch (e) {
    if (e && e.code === "EXDEV") {
      await fs.copyFile(src, dst);
      await fs.unlink(src);
    } else {
      throw e;
    }
  }
}

async function safeCopy(src, dst) {
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(src, dst);
}

async function main() {
  console.log("tasks.json     :", TASKS_FILE);
  console.log("legacy assets  :", LEGACY_DIR);
  console.log("target base    :", TASK_FILES_BASE);
  console.log("mode           :", dryRun ? "DRY-RUN" : "APPLY");
  console.log("");

  if (!(await pathExists(TASKS_FILE))) {
    console.error("ERROR: tasks.json 不存在:", TASKS_FILE);
    process.exit(1);
  }
  if (!(await pathExists(LEGACY_DIR))) {
    console.log("旧目录不存在，无需迁移:", LEGACY_DIR);
    process.exit(0);
  }

  const raw = await fs.readFile(TASKS_FILE, "utf8");
  /** @type {unknown} */
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    console.error("ERROR: tasks.json 根节点不是数组");
    process.exit(1);
  }
  const tasks = dryRun ? JSON.parse(JSON.stringify(parsed)) : parsed;

  const entries = await fs.readdir(LEGACY_DIR, { withFileTypes: true });
  const dataFiles = entries
    .filter((d) => d.isFile() && !d.name.endsWith(".meta.json"))
    .map((d) => d.name)
    .sort();

  let moved = 0;
  let copied = 0;
  let skipped = 0;
  let urlOnly = 0;
  let jsonDirty = false;
  const errors = [];

  function findTaskIdsForFile(fileName) {
    const ids = [];
    const needles = [`/api/task-files/${fileName}`, `/api/task-assets/${fileName}`];
    for (const t of tasks) {
      const chunks = [t.detail || "", ...((t.progress || []).map((p) => p.content || ""))];
      const blob = chunks.join("\n\u0000");
      if (needles.some((n) => blob.includes(n))) ids.push(String(t.id));
    }
    return [...new Set(ids)];
  }

  for (const fileName of dataFiles) {
    const legacyPath = path.join(LEGACY_DIR, fileName);
    const stem = path.parse(fileName).name;
    const metaLegacy = path.join(LEGACY_DIR, `${stem}.meta.json`);
    const hasMeta = await pathExists(metaLegacy);

    const taskIds = findTaskIdsForFile(fileName);
    if (taskIds.length === 0) {
      console.log("[SKIP 无引用]", fileName);
      skipped += 1;
      continue;
    }

    try {
      if (taskIds.length === 1) {
        const tid = taskIds[0];
        const dest = path.join(TASK_FILES_BASE, tid, fileName);
        const destExists = await pathExists(dest);
        const legacyExists = await pathExists(legacyPath);

        if (!legacyExists && destExists) {
          const ch = applyUrlReplacementsForFile(tasks, fileName, taskIds);
          if (ch) {
            jsonDirty = true;
            urlOnly += 1;
            console.log("[URL 仅更新]", fileName, `(目标已存在 task ${tid})`);
          } else {
            skipped += 1;
            console.log("[SKIP]", fileName, "目标已存在且无旧式链接");
          }
          continue;
        }

        if (destExists && legacyExists) {
          console.log("[WARN 冲突]", fileName, "legacy 与目标均存在，跳过移动，仅尝试更新链接");
          const ch = applyUrlReplacementsForFile(tasks, fileName, taskIds);
          if (ch) {
            jsonDirty = true;
            urlOnly += 1;
          } else skipped += 1;
          continue;
        }

        if (!dryRun) {
          console.log("[MOVE]", fileName, "->", path.relative(ROOT, dest), `(task ${tid})`);
          await safeMove(legacyPath, dest);
          if (hasMeta) {
            const metaDest = path.join(TASK_FILES_BASE, tid, `${stem}.meta.json`);
            console.log("[MOVE]", `${stem}.meta.json`, "->", path.relative(ROOT, metaDest));
            await safeMove(metaLegacy, metaDest);
          }
          moved += 1;
        } else {
          console.log("[DRY-RUN MOVE]", fileName, "->", path.relative(ROOT, dest), `(task ${tid})`);
        }
      } else {
        for (const tid of taskIds) {
          const dest = path.join(TASK_FILES_BASE, tid, fileName);
          if (await pathExists(dest)) {
            console.log("[SKIP 目标已存在]", fileName, "->", dest);
            continue;
          }
          if (!dryRun) {
            console.log(
              "[COPY]",
              fileName,
              "->",
              path.relative(ROOT, dest),
              `(task ${tid}，共 ${taskIds.length} 个任务引用)`,
            );
            await safeCopy(legacyPath, dest);
            if (hasMeta) {
              const metaDest = path.join(TASK_FILES_BASE, tid, `${stem}.meta.json`);
              await safeCopy(metaLegacy, metaDest);
            }
            copied += 1;
          } else {
            console.log("[DRY-RUN COPY]", fileName, "->", path.relative(ROOT, dest), `(task ${tid})`);
          }
        }
        if (!dryRun) {
          let allHave = true;
          for (const tid of taskIds) {
            if (!(await pathExists(path.join(TASK_FILES_BASE, tid, fileName)))) allHave = false;
          }
          if (allHave && (await pathExists(legacyPath))) {
            await fs.unlink(legacyPath).catch(() => {});
            if (hasMeta) await fs.unlink(metaLegacy).catch(() => {});
            console.log("[DEL 源]", fileName, "(各任务目录已有副本)");
          }
        }
      }

      const ch = applyUrlReplacementsForFile(tasks, fileName, taskIds);
      if (ch) jsonDirty = true;
    } catch (e) {
      errors.push({ fileName, err: e });
      console.error("[ERROR]", fileName, e.message || e);
    }
  }

  if (!dryRun && jsonDirty) {
    const bak = `${TASKS_FILE}.migrate-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
    await fs.copyFile(TASKS_FILE, bak);
    console.log("\n已备份 tasks.json ->", path.relative(ROOT, bak));
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
    console.log("已写回 tasks.json");
  } else if (dryRun) {
    console.log("\n(dry-run：未修改磁盘上的 tasks.json 与附件文件)");
  } else if (!jsonDirty) {
    console.log("\n无需更新 tasks.json（无链接变更）");
  }

  console.log("\n---- 汇总 ----");
  console.log("扫描数据文件数:", dataFiles.length);
  console.log("移动(单引用):", moved);
  console.log("复制(多引用次数):", copied);
  console.log("仅更新链接(文件已在目标等):", urlOnly);
  console.log("跳过(无引用等):", skipped);
  if (errors.length) {
    console.log("失败:", errors.length);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
