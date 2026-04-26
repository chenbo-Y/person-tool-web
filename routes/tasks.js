import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = process.env.KW_WEB_TASKS_FILE
  ? path.resolve(process.env.KW_WEB_TASKS_FILE)
  : path.join(__dirname, "..", "data", "tasks.json");
/** 各任务附件目录的父路径：磁盘为 data/task/<taskId>/... */
const TASK_FILES_BASE = process.env.KW_WEB_TASK_FILES_BASE?.trim()
  ? path.resolve(process.env.KW_WEB_TASK_FILES_BASE.trim())
  : path.join(__dirname, "..", "data", "task");
/** 旧版扁平目录 data/task-assets/，仅用于读取历史 Markdown 中的链接 */
const LEGACY_TASK_ASSET_DIR = process.env.KW_WEB_TASK_LEGACY_ASSETS?.trim()
  ? path.resolve(process.env.KW_WEB_TASK_LEGACY_ASSETS.trim())
  : process.env.KW_WEB_TASK_ASSET_DIR?.trim()
    ? path.resolve(process.env.KW_WEB_TASK_ASSET_DIR.trim())
    : path.join(__dirname, "..", "data", "task-assets");
// 单进程内写队列：串行化所有 tasks.json 写入，避免并发覆盖
let writeChain = Promise.resolve();

function isValidTaskId(id) {
  return /^task_[a-z0-9_]+$/i.test(String(id || "").trim());
}

async function taskExistsById(taskId) {
  const items = await readTasksRaw();
  return items.some((x) => String(x.id) === String(taskId));
}

function normalizeText(v, max = 500) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeDueAt(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function taskSort(a, b) {
  const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (ad !== bd) return ad - bd;
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

async function ensureTasksFile() {
  const dir = path.dirname(TASKS_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, "[]", "utf8");
  }
}

async function readTasksRaw() {
  await ensureTasksFile();
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function withWriteLock(fn) {
  // 无论前一个写任务成功/失败，都继续执行后续任务，避免链条中断
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

async function writeTasksRaw(items) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(items, null, 2), "utf8");
}

function genTaskId() {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/gif") return "gif";
  if (m === "image/webp") return "webp";
  if (
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    m === "application/vnd.ms-excel"
  ) {
    return "xlsx";
  }
  if (m === "application/pdf") return "pdf";
  if (m === "text/plain") return "txt";
  if (m === "application/zip") return "zip";
  return "";
}

function extFromFilename(name) {
  const base = path.basename(String(name || "").trim());
  const ext = path.extname(base).toLowerCase().replace(".", "");
  if (!ext) return "";
  if (!/^[a-z0-9]{1,12}$/i.test(ext)) return "";
  return ext;
}

function mimeByExt(extWithDot) {
  const ext = String(extWithDot || "").toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".xls") return "application/vnd.ms-excel";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".zip") return "application/zip";
  return "application/octet-stream";
}

/** 下载时使用的展示文件名（去掉路径与控制字符） */
function sanitizeDownloadBasename(name) {
  let s = path.basename(String(name || "").trim()).replace(/[\x00-\x1f\\/:*?"<>|]/g, "_");
  if (s.length > 240) s = s.slice(0, 240);
  return s;
}

/** RFC 5987：让浏览器保存为上传时的原始文件名，而不是磁盘上的随机名 */
function buildAttachmentContentDisposition(displayName, storedBasename) {
  const name =
    sanitizeDownloadBasename(displayName) || sanitizeDownloadBasename(storedBasename) || storedBasename;
  const ascii = String(name)
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "_")
    .slice(0, 180);
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
  return `attachment; filename="${ascii || "download"}"; filename*=UTF-8''${encoded}`;
}

function normalizeTaskInput(body) {
  const title = normalizeText(body?.title, 120);
  const type = normalizeText(body?.type, 40);
  const tags = normalizeTagList(body?.tags);
  const detail = normalizeText(body?.detail, 3000);
  const dueAt = normalizeDueAt(body?.dueAt);
  const status = body?.status === "done" ? "done" : "todo";
  return { title, type, tags, detail, dueAt, status };
}

function normalizeTagList(v) {
  const src = Array.isArray(v) ? v : String(v || "").split(",");
  const out = [];
  const seen = new Set();
  for (const t of src) {
    const s = String(t || "").trim().slice(0, 24);
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeProgressInput(body) {
  const content = normalizeText(body?.content, 12000);
  if (!content) return null;
  return {
    id: `progress_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    content,
    createdAt: nowIso(),
  };
}

/** 为历史数据中没有 id 的进展条目补全 id，便于后续编辑/删除 */
function ensureProgressIdsOnTask(task) {
  if (!Array.isArray(task.progress)) task.progress = [];
  let changed = false;
  for (let i = 0; i < task.progress.length; i += 1) {
    const p = task.progress[i];
    if (!p || typeof p !== "object") continue;
    if (!String(p.id || "").trim()) {
      p.id = `progress_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 10)}`;
      changed = true;
    }
  }
  return changed;
}

function normalizeProgressContent(body) {
  const content = normalizeText(body?.content, 12000);
  return content || null;
}

export function registerTaskRoutes(app, { logger }) {
  // 任务附件：写入 data/task/<taskId>/，URL 为 /api/task-files/<taskId>/<file>
  async function handleTaskFileUpload(req, res) {
    const taskId = String(req.params.taskId || "").trim();
    if (!isValidTaskId(taskId)) return res.status(400).json({ error: "taskId 无效" });
    if (!(await taskExistsById(taskId))) return res.status(404).json({ error: "任务不存在" });

    const dataUrl = String(req.body?.dataUrl || "");
    const originalName = String(req.body?.name || "").trim();
    if (!dataUrl.startsWith("data:")) {
      return res.status(400).json({ error: "仅支持 DataURL" });
    }
    const m = /^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: "文件数据格式错误" });
    const mime = m[1];
    const b64 = m[2];
    const ext = extFromFilename(originalName) || extFromMime(mime);
    if (!ext) return res.status(400).json({ error: "不支持的文件类型" });

    let buf;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      return res.status(400).json({ error: "文件解码失败" });
    }
    if (!buf.length || buf.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: "文件大小无效或超过 20MB" });
    }
    try {
      const dir = path.join(TASK_FILES_BASE, taskId);
      await fs.mkdir(dir, { recursive: true });
      const name = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const fullPath = path.join(dir, name);
      await fs.writeFile(fullPath, buf);
      const orig = sanitizeDownloadBasename(originalName);
      if (orig) {
        const metaPath = path.join(dir, `${path.parse(name).name}.meta.json`);
        await fs.writeFile(metaPath, JSON.stringify({ originalName: orig }), "utf8");
      }
      logger?.info?.("task-file-create", { taskId, name, bytes: buf.length });
      const url = `/api/task-files/${encodeURIComponent(taskId)}/${encodeURIComponent(name)}`;
      res.json({ ok: true, url });
    } catch (e) {
      res.status(500).json({ error: e.message || "保存附件失败" });
    }
  }

  app.post("/api/tasks/:taskId/task-files", handleTaskFileUpload);
  app.post("/api/tasks/:taskId/task-assets", handleTaskFileUpload);

  async function sendTaskFileResponse(res, fullPath, storedBasename, metaDir) {
    let st;
    try {
      st = await fs.stat(fullPath);
    } catch {
      return res.status(404).send("not found");
    }
    if (!st.isFile()) return res.status(404).send("not found");
    const ext = path.extname(storedBasename).toLowerCase();
    const mime = mimeByExt(ext);
    let downloadLabel = storedBasename;
    try {
      const metaPath = path.join(metaDir, `${path.parse(storedBasename).name}.meta.json`);
      const metaRaw = await fs.readFile(metaPath, "utf8");
      const meta = JSON.parse(metaRaw);
      if (meta && typeof meta.originalName === "string" && meta.originalName.trim()) {
        const cand = sanitizeDownloadBasename(meta.originalName);
        if (cand) downloadLabel = cand;
      }
    } catch {
      /* 无元数据 */
    }
    try {
      const buf = await fs.readFile(fullPath);
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      if (!String(mime).toLowerCase().startsWith("image/")) {
        res.setHeader("Content-Disposition", buildAttachmentContentDisposition(downloadLabel, storedBasename));
      }
      res.send(buf);
    } catch {
      res.status(500).send("read failed");
    }
  }

  async function handleTaskFileReadByTask(req, res) {
    const taskId = path.basename(String(req.params.taskId || "").trim());
    const rawFile = String(req.params.fileName || "").trim();
    const safeFile = path.basename(rawFile);
    if (!taskId || !isValidTaskId(taskId)) return res.status(400).send("bad task");
    if (!safeFile || safeFile !== rawFile) return res.status(400).send("bad name");
    if (safeFile.endsWith(".meta.json")) return res.status(404).send("not found");
    const dir = path.join(TASK_FILES_BASE, taskId);
    const full = path.join(dir, safeFile);
    await sendTaskFileResponse(res, full, safeFile, dir);
  }

  async function handleTaskFileReadLegacy(req, res) {
    const raw = String(req.params.name || "").trim();
    const safe = path.basename(raw);
    if (!safe || safe !== raw) return res.status(400).send("bad name");
    if (safe.endsWith(".meta.json")) return res.status(404).send("not found");
    const full = path.join(LEGACY_TASK_ASSET_DIR, safe);
    await sendTaskFileResponse(res, full, safe, LEGACY_TASK_ASSET_DIR);
  }

  app.get("/api/task-files/:taskId/:fileName", handleTaskFileReadByTask);
  app.get("/api/task-assets/:taskId/:fileName", handleTaskFileReadByTask);
  app.get("/api/task-files/:name", handleTaskFileReadLegacy);
  app.get("/api/task-assets/:name", handleTaskFileReadLegacy);

  app.get("/api/tasks", async (_req, res) => {
    try {
      const items = await withWriteLock(async () => {
        const arr = await readTasksRaw();
        let dirty = false;
        for (const it of arr) {
          if (!Array.isArray(it.progress)) it.progress = [];
          if (typeof it.completedAt !== "string") it.completedAt = "";
          if (!Array.isArray(it.tags)) it.tags = [];
          if (typeof it.createdAt !== "string" || !it.createdAt.trim()) {
            it.createdAt =
              typeof it.updatedAt === "string" && it.updatedAt.trim() ? it.updatedAt : nowIso();
            dirty = true;
          }
        }
        if (dirty) await writeTasksRaw(arr);
        arr.sort(taskSort);
        return arr;
      });
      res.json({ count: items.length, items });
    } catch (e) {
      res.status(500).json({ error: e.message || "读取任务失败" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const input = normalizeTaskInput(req.body || {});
    if (!input.title) return res.status(400).json({ error: "title 不能为空" });

    try {
      const created = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const now = nowIso();
        // createdAt 仅服务端生成，不接受客户端覆盖
        const task = {
          id: genTaskId(),
          ...input,
          completedAt: input.status === "done" ? now : "",
          progress: [],
          createdAt: now,
          updatedAt: now,
        };
        items.push(task);
        await writeTasksRaw(items);
        return task;
      });
      logger?.info?.("task-create", { id: created.id, type: created.type || "default" });
      res.json({ ok: true, item: created });
    } catch (e) {
      res.status(500).json({ error: e.message || "创建任务失败" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const input = normalizeTaskInput(req.body || {});
    if (!input.title) return res.status(400).json({ error: "title 不能为空" });

    try {
      const updated = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const idx = items.findIndex((x) => String(x.id) === id);
        if (idx < 0) return null;
        const prev = items[idx];
        let completedAt = typeof prev.completedAt === "string" ? prev.completedAt : "";
        if (prev.status !== "done" && input.status === "done") {
          completedAt = nowIso();
        } else if (input.status !== "done") {
          completedAt = "";
        }
        const preservedCreated =
          typeof prev.createdAt === "string" && prev.createdAt.trim()
            ? prev.createdAt.trim()
            : typeof prev.updatedAt === "string" && prev.updatedAt.trim()
              ? prev.updatedAt.trim()
              : nowIso();
        const next = {
          ...prev,
          ...input,
          completedAt,
          createdAt: preservedCreated,
          updatedAt: nowIso(),
        };
        items[idx] = next;
        await writeTasksRaw(items);
        return next;
      });
      if (!updated) return res.status(404).json({ error: "任务不存在" });
      logger?.info?.("task-update", { id: updated.id, status: updated.status });
      res.json({ ok: true, item: updated });
    } catch (e) {
      res.status(500).json({ error: e.message || "更新任务失败" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "缺少 id" });
    try {
      const ok = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const next = items.filter((x) => String(x.id) !== id);
        if (next.length === items.length) return false;
        await writeTasksRaw(next);
        return true;
      });
      if (!ok) return res.status(404).json({ error: "任务不存在" });
      await fs.rm(path.join(TASK_FILES_BASE, id), { recursive: true, force: true }).catch(() => {});
      logger?.info?.("task-delete", { id });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message || "删除任务失败" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "缺少 id" });
    try {
      const hit = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const idx = items.findIndex((x) => String(x.id) === id);
        if (idx < 0) return null;
        const task = items[idx];
        if (!Array.isArray(task.progress)) task.progress = [];
        if (typeof task.completedAt !== "string") task.completedAt = "";
        if (!Array.isArray(task.tags)) task.tags = [];
        let needWrite = false;
        if (ensureProgressIdsOnTask(task)) {
          task.updatedAt = nowIso();
          needWrite = true;
        }
        if (typeof task.createdAt !== "string" || !task.createdAt.trim()) {
          task.createdAt =
            typeof task.updatedAt === "string" && task.updatedAt.trim() ? task.updatedAt : nowIso();
          needWrite = true;
        }
        if (needWrite) await writeTasksRaw(items);
        task.progress.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        return task;
      });
      if (!hit) return res.status(404).json({ error: "任务不存在" });
      res.json({ ok: true, item: hit });
    } catch (e) {
      res.status(500).json({ error: e.message || "读取任务详情失败" });
    }
  });

  app.post("/api/tasks/:id/progress", async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const entry = normalizeProgressInput(req.body || {});
    if (!entry) return res.status(400).json({ error: "content 不能为空" });
    try {
      const item = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const idx = items.findIndex((x) => String(x.id) === id);
        if (idx < 0) return null;
        if (!Array.isArray(items[idx].progress)) items[idx].progress = [];
        // 新进展插到前面，详情页按“最新在上”渲染
        items[idx].progress.unshift(entry);
        items[idx].updatedAt = nowIso();
        await writeTasksRaw(items);
        return items[idx];
      });
      if (!item) return res.status(404).json({ error: "任务不存在" });
      item.progress.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      logger?.info?.("task-progress-add", { id, pid: entry.id });
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message || "追加进展失败" });
    }
  });

  app.put("/api/tasks/:id/progress/:pid", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const pid = String(req.params.pid || "").trim();
    if (!id || !pid) return res.status(400).json({ error: "缺少任务 id 或进展 id" });
    const content = normalizeProgressContent(req.body || {});
    if (!content) return res.status(400).json({ error: "content 不能为空" });
    try {
      const item = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const idx = items.findIndex((x) => String(x.id) === id);
        if (idx < 0) return null;
        const task = items[idx];
        if (!Array.isArray(task.progress)) task.progress = [];
        ensureProgressIdsOnTask(task);
        const pidx = task.progress.findIndex((p) => p && String(p.id) === pid);
        if (pidx < 0) return null;
        task.progress[pidx].content = content;
        task.progress[pidx].updatedAt = nowIso();
        task.updatedAt = nowIso();
        await writeTasksRaw(items);
        return task;
      });
      if (!item) return res.status(404).json({ error: "任务或进展不存在" });
      item.progress.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      logger?.info?.("task-progress-update", { id, pid });
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message || "更新进展失败" });
    }
  });

  app.delete("/api/tasks/:id/progress/:pid", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const pid = String(req.params.pid || "").trim();
    if (!id || !pid) return res.status(400).json({ error: "缺少任务 id 或进展 id" });
    try {
      const item = await withWriteLock(async () => {
        const items = await readTasksRaw();
        const idx = items.findIndex((x) => String(x.id) === id);
        if (idx < 0) return null;
        const task = items[idx];
        if (!Array.isArray(task.progress)) task.progress = [];
        ensureProgressIdsOnTask(task);
        const before = task.progress.length;
        task.progress = task.progress.filter((p) => p && String(p.id) !== pid);
        if (task.progress.length === before) return null;
        task.updatedAt = nowIso();
        await writeTasksRaw(items);
        return task;
      });
      if (!item) return res.status(404).json({ error: "任务或进展不存在" });
      item.progress.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      logger?.info?.("task-progress-delete", { id, pid });
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message || "删除进展失败" });
    }
  });
}
