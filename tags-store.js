import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const TAGS_FILE = path.join(DATA_DIR, "file-tags.json");

const MAX_TAGS_PER_FILE = 30;
const MAX_TAG_LEN = 40;
const MAX_NOTE_LEN = 2000;
const MIN_SCORE = 0;
const MAX_SCORE = 10;

/** 串行写锁：把所有写操作排队，避免并发覆盖同一 JSON 文件 */
let writeChain = Promise.resolve();

/** 在当前写链末尾追加任务，确保同一时刻只有一个写任务执行 */
function runExclusive(fn) {
  const p = writeChain.then(() => fn());
  writeChain = p.catch(() => {});
  return p;
}

/** 统一路径主键：优先 realpath，找不到时退回 resolve，避免悬挂路径失效 */
export async function tagKeyForFile(filePath) {
  const r = path.resolve(String(filePath).trim());
  try {
    return await fs.realpath(r);
  } catch {
    return r;
  }
}

async function readEntries() {
  // 允许“文件不存在/损坏”场景：兜底为空对象，不阻断业务
  try {
    const raw = await fs.readFile(TAGS_FILE, "utf8");
    const j = JSON.parse(raw);
    if (j && typeof j.entries === "object") return j.entries;
  } catch {
    /* 无文件或损坏 */
  }
  return {};
}

async function writeEntries(entries) {
  // 目录与文件一起兜底创建，便于首次启动即写入
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    TAGS_FILE,
    JSON.stringify({ version: 1, entries }, null, 0),
    "utf8",
  );
}

function sanitizeTags(arr) {
  // 标签规则：去空白、限长、大小写去重、数量上限
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const t of arr) {
    const s = String(t || "")
      .trim()
      .slice(0, MAX_TAG_LEN);
    if (!s) continue;
    const low = s.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(s);
    if (out.length >= MAX_TAGS_PER_FILE) break;
  }
  return out;
}

function sanitizeNote(n) {
  // 备注仅做长度限制，保留用户原有换行与文本
  if (n == null) return "";
  return String(n).slice(0, MAX_NOTE_LEN);
}

function sanitizeScore(n) {
  // 评分统一收敛到整数区间 [MIN_SCORE, MAX_SCORE]
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  const i = Math.trunc(v);
  if (i < MIN_SCORE) return MIN_SCORE;
  if (i > MAX_SCORE) return MAX_SCORE;
  return i;
}

function pickRow(entries, key) {
  // Windows 文件系统大小写不敏感：读时做一次不区分大小写匹配
  if (entries[key]) return entries[key];
  if (process.platform === "win32") {
    const low = key.toLowerCase();
    for (const k of Object.keys(entries)) {
      if (k.toLowerCase() === low) return entries[k];
    }
  }
  return null;
}

export async function getTagsForPath(filePath) {
  // 外部读接口：始终返回完整结构，避免前端判空分支过多
  const key = await tagKeyForFile(filePath);
  const entries = await readEntries();
  const row = pickRow(entries, key);
  return {
    path: key,
    tags: Array.isArray(row?.tags) ? [...row.tags] : [],
    note: typeof row?.note === "string" ? row.note : "",
    score: sanitizeScore(row?.score),
  };
}

export async function attachTagsToSearchResults(results) {
  // 批量补齐搜索结果上的标签/备注/评分字段，供前端直接渲染
  const entries = await readEntries();
  for (const r of results) {
    const key = await tagKeyForFile(r.file);
    const row = pickRow(entries, key);
    r.fileTags = Array.isArray(row?.tags) ? [...row.tags] : [];
    r.fileNote = typeof row?.note === "string" ? row.note : "";
    r.fileScore = sanitizeScore(row?.score);
  }
}

export async function attachTagsToImageFiles(files) {
  // 图片/视频列表复用同一附加逻辑
  const entries = await readEntries();
  for (const f of files) {
    const key = await tagKeyForFile(f.path);
    const row = pickRow(entries, key);
    f.fileTags = Array.isArray(row?.tags) ? [...row.tags] : [];
    f.fileNote = typeof row?.note === "string" ? row.note : "";
    f.fileScore = sanitizeScore(row?.score);
  }
}

function deleteEntryKeys(entries, key) {
  // 删除时同样兼容 Windows 的大小写不敏感键
  if (process.platform === "win32") {
    const low = key.toLowerCase();
    for (const k of [...Object.keys(entries)]) {
      if (k.toLowerCase() === low) delete entries[k];
    }
  } else {
    delete entries[key];
  }
}

/**
 * 文件重命名后：把旧路径下的标注迁移到新路径（旧键删除，新键写入）。
 * oldKey / newKey 须为已 resolve 的路径字符串（与 JSON 中键一致）。
 */
export async function migrateTaggedPath(oldKey, newKey) {
  if (!oldKey || !newKey || typeof oldKey !== "string" || typeof newKey !== "string") {
    return;
  }
  if (oldKey === newKey) return;
  return runExclusive(async () => {
    // 迁移语义：删旧键 -> 写新键；仅在有有效数据时写新键
    const entries = await readEntries();
    const row = pickRow(entries, oldKey);
    deleteEntryKeys(entries, oldKey);
    if (row) {
      const tags = Array.isArray(row.tags) ? [...row.tags] : [];
      const note = typeof row.note === "string" ? row.note : "";
      const score = sanitizeScore(row.score);
      if (tags.length || note || score > 0) {
        deleteEntryKeys(entries, newKey);
        entries[newKey] = { tags, note, score };
      }
    }
    await writeEntries(entries);
  });
}

/** 一览用：返回所有已记录路径及标签、备注（按路径排序） */
export async function listAllTaggedEntries() {
  // 一览页只展示“有标注价值”的项：tags/note/score 任一存在
  const entries = await readEntries();
  const items = [];
  for (const filePath of Object.keys(entries)) {
    const row = entries[filePath];
    const tags = Array.isArray(row?.tags) ? [...row.tags] : [];
    const note = typeof row?.note === "string" ? row.note : "";
    const score = sanitizeScore(row?.score);
    if (!tags.length && !note && score <= 0) continue;
    items.push({ path: filePath, tags, note, score });
  }
  items.sort((a, b) => {
    // 默认按评分降序；同分按路径字典序，保证稳定输出
    if (b.score !== a.score) return b.score - a.score;
    return a.path.localeCompare(b.path, "zh-Hans-CN");
  });
  return items;
}

/**
 * body: { path, delete?, addTag?, removeTag?, setTags?, note?, score? }
 * delete: true 时整行移除（仅从 JSON 删除，不删磁盘文件）
 * note: 传 null 清空；不传则不修改
 */
export async function mutateFileTags(body) {
  const rawPath = body?.path;
  if (!rawPath || typeof rawPath !== "string") {
    throw new Error("缺少 path");
  }
  return runExclusive(async () => {
    // 单路径写入入口：支持 delete / add / remove / set / note / score 混合更新
    const entries = await readEntries();
    const key = await tagKeyForFile(rawPath);

    if (body.delete === true) {
      // delete 只删标注，不影响磁盘文件
      if (process.platform === "win32") {
        for (const k of [...Object.keys(entries)]) {
          if (k.toLowerCase() === key.toLowerCase()) delete entries[k];
        }
      } else {
        delete entries[key];
      }
      await writeEntries(entries);
      return { path: key, tags: [], note: "", score: 0, deleted: true };
    }

    const row = pickRow(entries, key) || { tags: [], note: "", score: 0 };
    let cur = {
      tags: [...(row.tags || [])],
      note: typeof row.note === "string" ? row.note : "",
      score: sanitizeScore(row.score),
    };

    if (Array.isArray(body.setTags)) {
      // setTags 为全量覆盖；add/remove 为增量变更
      cur.tags = sanitizeTags(body.setTags);
    }
    if (typeof body.addTag === "string" && body.addTag.trim()) {
      cur.tags = sanitizeTags([...cur.tags, body.addTag.trim()]);
    }
    if (typeof body.removeTag === "string" && body.removeTag.trim()) {
      const rm = body.removeTag.trim().toLowerCase();
      cur.tags = cur.tags.filter((x) => String(x).toLowerCase() !== rm);
    }
    if (body.note !== undefined) {
      // note=null 表示显式清空备注
      cur.note = body.note === null ? "" : sanitizeNote(body.note);
    }
    if (body.score !== undefined) {
      cur.score = sanitizeScore(body.score);
    }

    if (process.platform === "win32") {
      for (const k of [...Object.keys(entries)]) {
        if (k.toLowerCase() === key.toLowerCase()) delete entries[k];
      }
    } else {
      delete entries[key];
    }

    if (cur.tags.length || cur.note || cur.score > 0) {
      // 仅在存在有效内容时落盘，避免产生空壳条目
      entries[key] = { tags: cur.tags, note: cur.note, score: cur.score };
    }

    await writeEntries(entries);
    return { path: key, tags: cur.tags, note: cur.note, score: cur.score };
  });
}
