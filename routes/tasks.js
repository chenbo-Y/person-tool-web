import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = process.env.KW_WEB_TASKS_FILE
  ? path.resolve(process.env.KW_WEB_TASKS_FILE)
  : path.join(__dirname, "..", "data", "tasks.json");
const TASK_ASSET_DIR = process.env.KW_WEB_TASK_ASSET_DIR
  ? path.resolve(process.env.KW_WEB_TASK_ASSET_DIR)
  : path.join(__dirname, "..", "data", "task-assets");
// 单进程内写队列：串行化所有 tasks.json 写入，避免并发覆盖
let writeChain = Promise.resolve();

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

export function registerTaskRoutes(app, { logger }) {
  // 任务附件上传：前端以 DataURL 传文件（图片/文档），后端落盘后返回可访问 URL
  async function handleTaskFileUpload(req, res) {
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
      await fs.mkdir(TASK_ASSET_DIR, { recursive: true });
      const name = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await fs.writeFile(path.join(TASK_ASSET_DIR, name), buf);
      logger?.info?.("task-file-create", { name, bytes: buf.length });
      res.json({ ok: true, url: `/api/task-files/${encodeURIComponent(name)}` });
    } catch (e) {
      res.status(500).json({ error: e.message || "保存附件失败" });
    }
  }

  app.post("/api/task-files", handleTaskFileUpload);
  app.post("/api/task-assets", handleTaskFileUpload);

  async function handleTaskFileRead(req, res) {
    // 仅允许 basename，防止路径穿越读取任意文件
    const raw = String(req.params.name || "").trim();
    const safe = path.basename(raw);
    if (!safe || safe !== raw) return res.status(400).send("bad name");
    const full = path.join(TASK_ASSET_DIR, safe);
    let st;
    try {
      st = await fs.stat(full);
    } catch {
      return res.status(404).send("not found");
    }
    if (!st.isFile()) return res.status(404).send("not found");
    const ext = path.extname(safe).toLowerCase();
    const mime = mimeByExt(ext);
    try {
      const buf = await fs.readFile(full);
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buf);
    } catch {
      res.status(500).send("read failed");
    }
  }

  app.get("/api/task-files/:name", handleTaskFileRead);
  app.get("/api/task-assets/:name", handleTaskFileRead);

  app.get("/api/tasks", async (_req, res) => {
    try {
      const items = await readTasksRaw();
      // 兼容历史数据：旧任务可能没有 progress 字段
      for (const it of items) {
        if (!Array.isArray(it.progress)) it.progress = [];
        if (typeof it.completedAt !== "string") it.completedAt = "";
        if (!Array.isArray(it.tags)) it.tags = [];
      }
      items.sort(taskSort);
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
        const next = {
          ...prev,
          ...input,
          completedAt,
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
      const items = await readTasksRaw();
      const hit = items.find((x) => String(x.id) === id);
      if (!hit) return res.status(404).json({ error: "任务不存在" });
      if (!Array.isArray(hit.progress)) hit.progress = [];
      if (typeof hit.completedAt !== "string") hit.completedAt = "";
      if (!Array.isArray(hit.tags)) hit.tags = [];
      hit.progress.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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
      logger?.info?.("task-progress-add", { id, pid: entry.id });
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message || "追加进展失败" });
    }
  });
}
