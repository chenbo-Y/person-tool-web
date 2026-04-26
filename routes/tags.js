import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { IMAGE_EXT, VIDEO_EXT, taggedEntryMediaKind } from "../lib/media.js";

/**
 * Windows：直接 spawn %SystemRoot%\explorer.exe。
 * 文件定位须用 `/select,"完整路径"`：路径含空格时，整段路径必须在一对双引号内，否则会被拆错。
 * （路径里不应含 `"`；若出现则去掉，避免打断引号。）
 */
function explorerSelectArgForFile(target) {
  const inner = String(target).replace(/"/g, "");
  return `/select,"${inner}"`;
}

function revealWindowsExplorer(target, isDirectory, logger) {
  // Windows 下优先 explorer.exe：目录直接打开，文件用 /select, 精准定位
  const root = process.env.SystemRoot || process.env.windir || "C:\\Windows";
  const explorer = path.join(root, "explorer.exe");

  const opts = {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  };

  if (isDirectory) {
    const child = spawn(explorer, [target], opts);
    child.on("error", (err) => logger.error("[reveal] explorer", { err: String(err) }));
    child.unref();
    return;
  }

  const selectArg = explorerSelectArgForFile(target);
  const child = spawn(explorer, [selectArg], {
    ...opts,
    windowsVerbatimArguments: true,
  });
  child.on("error", (err) => logger.error("[reveal] explorer /select", { err: String(err) }));
  child.unref();
}

/** 校验重命名目标：仅文件名、禁止路径与常见非法字符 / Windows 保留名 */
function assertSafeRenameBasename(name) {
  const s = String(name ?? "").trim();
  if (!s) throw new Error("文件名为空");
  if (/[/\\:\0]/.test(s)) throw new Error("文件名不能包含路径或冒号");
  if (s === "." || s === "..") throw new Error("文件名无效");
  if (s !== path.basename(s)) throw new Error("仅允许文件名，不能包含目录");
  if (/[<>:"|?*\x01-\x1f]/.test(s)) throw new Error("文件名含非法字符");
  if (s.length > 240) throw new Error("文件名过长");
  const dot = s.lastIndexOf(".");
  const stem = dot > 0 ? s.slice(0, dot) : s;
  if (/^(CON|PRN|AUX|NUL|COM\d+|LPT\d+)$/i.test(stem)) {
    throw new Error("该名称为 Windows 保留设备名");
  }
  return s;
}

export function registerTagRoutes(app, { logger, tagStore }) {
  // 本模块负责“标签/备注/评分 + 本地文件操作（重命名/删除/定位）”
  /** 在系统文件管理器中定位路径（本机工具，仅绑定 127.0.0.1） */
  app.post("/api/reveal", async (req, res) => {
    const raw = req.body?.path;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "缺少 path" });
    }
    let target = path.resolve(raw.trim());
    if (target.length < 2) {
      return res.status(400).json({ error: "路径无效" });
    }

    try {
      // realpath 可归一化符号链接；失败时仍允许 resolve 结果继续尝试
      target = await fs.realpath(target);
    } catch {
      /* 仍用 resolve 结果 */
    }

    let stat;
    try {
      stat = await fs.stat(target);
    } catch {
      return res.status(400).json({ error: "路径不存在或无法访问" });
    }

    try {
      // 按平台调用系统文件管理器；均采用 detached + ignore，避免阻塞请求
      if (process.platform === "win32") {
        revealWindowsExplorer(path.win32.normalize(target), stat.isDirectory(), logger);
      } else if (process.platform === "darwin") {
        spawn("open", ["-R", target], { detached: true, stdio: "ignore" }).unref();
      } else {
        const dir = stat.isDirectory() ? target : path.dirname(target);
        spawn("xdg-open", [dir], { detached: true, stdio: "ignore" }).unref();
      }
    } catch (e) {
      return res.status(500).json({ error: e.message || "无法打开文件管理器" });
    }

    logger.info("reveal", {
      isDir: stat.isDirectory(),
      base: path.basename(target),
    });
    res.json({ ok: true });
  });

  /** 同目录下重命名文件；已保存的标签/备注会迁移到新路径 */
  app.post("/api/rename-file", async (req, res) => {
    const rawPath = req.body?.path;
    const rawName = req.body?.newName;
    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "缺少 path" });
    }
    if (rawName == null || typeof rawName !== "string") {
      return res.status(400).json({ error: "缺少 newName" });
    }

    let oldResolved;
    try {
      oldResolved = path.resolve(String(rawPath).trim());
    } catch {
      return res.status(400).json({ error: "路径无效" });
    }

    let newBase;
    try {
      newBase = assertSafeRenameBasename(rawName);
    } catch (e) {
      return res.status(400).json({ error: e.message || "文件名无效" });
    }

    let oldStat;
    try {
      oldStat = await fs.stat(oldResolved);
    } catch {
      return res.status(400).json({ error: "源文件不存在或无法访问" });
    }
    if (!oldStat.isFile()) {
      return res.status(400).json({ error: "路径不是文件" });
    }

    const dir = path.dirname(oldResolved);
    const dirResolved = path.resolve(dir);
    const newFull = path.join(dir, newBase);
    const newResolved = path.resolve(newFull);
    if (path.dirname(newResolved).toLowerCase() !== dirResolved.toLowerCase()) {
      return res.status(400).json({ error: "目标必须位于同一目录" });
    }

    const samePath =
      oldResolved === newResolved ||
      (process.platform === "win32" && oldResolved.toLowerCase() === newResolved.toLowerCase());
    if (samePath) {
      // 仅大小写变化或同路径时，不执行 rename，直接返回 unchanged
      let key = oldResolved;
      try {
        key = await fs.realpath(oldResolved);
      } catch {
        /* keep */
      }
      return res.json({ ok: true, path: key, unchanged: true });
    }

    try {
      // 目标已存在直接拒绝，避免覆盖用户文件
      await fs.access(newResolved);
      return res.status(400).json({ error: "目标文件名已存在" });
    } catch {
      /* 不存在即可 */
    }

    const oldKey = await tagStore.tagKeyForFile(oldResolved);
    try {
      // 先改磁盘文件，再迁移标签键，保证标签跟随真实文件路径
      await fs.rename(oldResolved, newResolved);
    } catch (e) {
      const code = e && e.code;
      if (code === "EPERM") {
        return res.status(400).json({ error: "无权限重命名（文件可能被占用）" });
      }
      if (code === "EXDEV") {
        return res.status(400).json({ error: "无法跨卷重命名" });
      }
      return res.status(500).json({ error: e.message || "重命名失败" });
    }

    let newKey = newResolved;
    try {
      newKey = await tagStore.tagKeyForFile(newResolved);
    } catch {
      newKey = newResolved;
    }
    try {
      await tagStore.migrateTaggedPath(oldKey, newKey);
    } catch (e) {
      logger.error("[rename-file] migrate tags", { err: String(e) });
    }

    logger.info("rename-file", { to: path.basename(newKey) });
    res.json({ ok: true, path: newKey });
  });

  /**
   * 删除磁盘上的单个文件（仅本机；须为 kind 对应的扩展名白名单）。
   * body: { path, kind: "image" | "video" }
   */
  app.post("/api/delete-file", async (req, res) => {
    const rawPath = req.body?.path;
    const kind = req.body?.kind;
    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "缺少 path" });
    }
    if (kind !== "image" && kind !== "video") {
      return res.status(400).json({ error: "kind 须为 image 或 video" });
    }

    let target;
    try {
      target = path.resolve(String(rawPath).trim());
    } catch {
      return res.status(400).json({ error: "路径无效" });
    }

    try {
      target = await fs.realpath(target);
    } catch {
      /* 仍用 resolve */
    }

    const ext = path.extname(target).toLowerCase();
    if (kind === "image" && !IMAGE_EXT.has(ext)) {
      return res.status(400).json({ error: "非允许的图片扩展名" });
    }
    if (kind === "video" && !VIDEO_EXT.has(ext)) {
      return res.status(400).json({ error: "非允许的视频扩展名" });
    }

    let st;
    try {
      st = await fs.stat(target);
    } catch {
      return res.status(400).json({ error: "文件不存在或无法访问" });
    }
    if (!st.isFile()) {
      return res.status(400).json({ error: "路径不是文件" });
    }

    try {
      // 先删标注后删文件：即使删文件失败，也尽量不保留悬挂标签
      await tagStore.mutateFileTags({ path: target, delete: true });
    } catch (e) {
      logger.error("[delete-file] clear tags", { err: String(e) });
    }

    try {
      await fs.unlink(target);
    } catch (e) {
      const code = e && e.code;
      if (code === "EPERM") {
        return res.status(400).json({ error: "无权限删除（文件可能被占用）" });
      }
      return res.status(500).json({ error: e.message || "删除失败" });
    }

    logger.info("delete-file", { kind, base: path.basename(target) });
    res.json({ ok: true });
  });

  app.get("/api/file-tags", async (req, res) => {
    // 读取单路径标签数据
    const q = req.query.path;
    const raw = Array.isArray(q) ? q[0] : q;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "缺少 path" });
    }
    try {
      const data = await tagStore.getTagsForPath(raw);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message || "读取标签失败" });
    }
  });

  app.post("/api/file-tags", async (req, res) => {
    // 统一写入口：由 tags-store 做字段级校验与序列化写
    try {
      const out = await tagStore.mutateFileTags(req.body || {});
      res.json(out);
    } catch (e) {
      const msg = e.message || "保存失败";
      const code = msg.includes("缺少") ? 400 : 500;
      res.status(code).json({ error: msg });
    }
  });

  /** 已保存路径、标签、备注的一览（数据即 data/file-tags.json） */
  app.get("/api/tagged-overview", async (req, res) => {
    // 一览：先拿全量标注，再附加 mediaKind，并可选按 q 做轻量过滤
    try {
      const all = await tagStore.listAllTaggedEntries();
      const withKind = all.map((it) => ({
        ...it,
        mediaKind: taggedEntryMediaKind(it.path),
      }));
      const rawQ = req.query.q;
      const qParam = Array.isArray(rawQ) ? rawQ[0] : rawQ;
      const needle = String(qParam || "")
        .trim()
        .toLowerCase();
      let items = withKind;
      if (needle) {
        items = withKind.filter((it) => {
          if (it.path.toLowerCase().includes(needle)) return true;
          if (it.note.toLowerCase().includes(needle)) return true;
          return it.tags.some((t) => String(t).toLowerCase().includes(needle));
        });
      }
      res.json({
        total: withKind.length,
        count: items.length,
        items,
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "读取失败" });
    }
  });
}
