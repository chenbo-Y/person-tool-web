import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import {
  IMAGE_EXT,
  VIDEO_EXT,
  MAX_IMAGES_PER_DIR,
  MAX_IMAGE_SERVE_BYTES,
  MAX_VIDEOS_PER_DIR,
  MAX_VIDEO_FILE_BYTES,
  compareScoreDescThenName,
  isAllowedImagePath,
  isAllowedVideoPath,
  mimeForImagePath,
  mimeForVideoPath,
  parseVideoRange,
} from "../lib/media.js";

export function registerMediaRoutes(app, { logger, tagStore }) {
  // 图片列表：读取目录 -> 过滤扩展名 -> 绑定标签评分 -> 按评分排序
  /** 列出指定目录下（不含子目录）的图片文件，用于浏览器展示 */
  app.post("/api/images-in-dir", async (req, res) => {
    const raw = req.body?.path;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "请填写目录路径" });
    }
    const dir = path.resolve(raw.trim());
    let st;
    try {
      st = await fs.stat(dir);
    } catch {
      return res.status(400).json({ error: "目录不存在或无法访问" });
    }
    if (!st.isDirectory()) {
      return res.status(400).json({ error: "路径不是文件夹" });
    }

    let realDir = dir;
    try {
      realDir = await fs.realpath(dir);
    } catch {
      /* keep dir */
    }

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "无法读取目录" });
    }

    const all = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      all.push({
        name: ent.name,
        path: path.join(dir, ent.name),
      });
    }
    all.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

    try {
      await tagStore.attachTagsToImageFiles(all);
    } catch (e) {
      logger.error("[tags] attach images", { err: String(e) });
    }
    all.sort((a, b) => compareScoreDescThenName(a, b, "name"));
    const truncated = all.length > MAX_IMAGES_PER_DIR;
    const files = all.slice(0, MAX_IMAGES_PER_DIR);

    res.json({
      directory: realDir,
      count: files.length,
      totalImages: all.length,
      truncated,
      files,
    });
  });

  // 视频列表：流程与图片一致，仅白名单与统计字段不同
  /** 列出指定目录下（不含子目录）的视频文件 */
  app.post("/api/videos-in-dir", async (req, res) => {
    const raw = req.body?.path;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "请填写目录路径" });
    }
    const dir = path.resolve(raw.trim());
    let st;
    try {
      st = await fs.stat(dir);
    } catch {
      return res.status(400).json({ error: "目录不存在或无法访问" });
    }
    if (!st.isDirectory()) {
      return res.status(400).json({ error: "路径不是文件夹" });
    }

    let realDir = dir;
    try {
      realDir = await fs.realpath(dir);
    } catch {
      /* keep dir */
    }

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "无法读取目录" });
    }

    const all = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!VIDEO_EXT.has(ext)) continue;
      all.push({
        name: ent.name,
        path: path.join(dir, ent.name),
      });
    }
    all.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

    try {
      await tagStore.attachTagsToImageFiles(all);
    } catch (e) {
      logger.error("[tags] attach videos", { err: String(e) });
    }
    all.sort((a, b) => compareScoreDescThenName(a, b, "name"));
    const truncated = all.length > MAX_VIDEOS_PER_DIR;
    const files = all.slice(0, MAX_VIDEOS_PER_DIR);

    res.json({
      directory: realDir,
      count: files.length,
      totalVideos: all.length,
      truncated,
      files,
    });
  });

  /**
   * 流式输出视频（支持 Range，便于浏览器内拖动进度）。
   * 仅白名单扩展名；绑定 127.0.0.1。
   */
  app.get("/api/video-file", async (req, res) => {
    const q = req.query.path;
    const rawQ = Array.isArray(q) ? q[0] : q;
    if (!rawQ || typeof rawQ !== "string") {
      return res.status(400).send("missing path");
    }
    let filePath;
    try {
      filePath = decodeURIComponent(rawQ);
    } catch {
      return res.status(400).send("bad path encoding");
    }
    const resolved = path.resolve(String(filePath).trim());
    if (!isAllowedVideoPath(resolved)) {
      return res.status(400).send("unsupported file type");
    }

    let st;
    try {
      st = await fs.stat(resolved);
    } catch {
      return res.status(404).send("not found");
    }
    if (!st.isFile()) {
      return res.status(400).send("not a file");
    }
    if (st.size > MAX_VIDEO_FILE_BYTES) {
      return res.status(413).send("file too large");
    }

    const fileSize = st.size;
    const mime = mimeForVideoPath(resolved);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=30");

    // 支持 Range，保证浏览器拖动进度条时只拉取必要分片
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parsed = parseVideoRange(rangeHeader, fileSize);
      if (!parsed) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }
      const { start, end } = parsed;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", String(chunkSize));
      const stream = createReadStream(resolved, { start, end });
      stream.on("error", (err) => {
        logger.error("[video-file] stream", { err: String(err) });
        if (!res.headersSent) res.status(500).end();
        else res.destroy();
      });
      req.on("close", () => stream.destroy());
      stream.pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(fileSize));
    const stream = createReadStream(resolved);
    stream.on("error", (err) => {
      logger.error("[video-file] stream", { err: String(err) });
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    req.on("close", () => stream.destroy());
    stream.pipe(res);
  });

  app.head("/api/video-file", async (req, res) => {
    // HEAD 用于播放器探测：仅返回元信息，不返回实体
    const q = req.query.path;
    const rawQ = Array.isArray(q) ? q[0] : q;
    if (!rawQ || typeof rawQ !== "string") {
      return res.status(400).end();
    }
    let filePath;
    try {
      filePath = decodeURIComponent(rawQ);
    } catch {
      return res.status(400).end();
    }
    const resolved = path.resolve(String(filePath).trim());
    if (!isAllowedVideoPath(resolved)) {
      return res.status(400).end();
    }
    let st;
    try {
      st = await fs.stat(resolved);
    } catch {
      return res.status(404).end();
    }
    if (!st.isFile()) {
      return res.status(400).end();
    }
    if (st.size > MAX_VIDEO_FILE_BYTES) {
      return res.status(413).end();
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeForVideoPath(resolved));
    res.setHeader("Content-Length", String(st.size));
    res.setHeader("Cache-Control", "private, max-age=30");
    res.status(200).end();
  });

  /** 读取单个图片字节（仅白名单扩展名；本机工具绑定 127.0.0.1） */
  app.get("/api/image-file", async (req, res) => {
    const q = req.query.path;
    const rawQ = Array.isArray(q) ? q[0] : q;
    if (!rawQ || typeof rawQ !== "string") {
      return res.status(400).send("missing path");
    }
    let filePath;
    try {
      filePath = decodeURIComponent(rawQ);
    } catch {
      return res.status(400).send("bad path encoding");
    }
    const resolved = path.resolve(String(filePath).trim());
    if (!isAllowedImagePath(resolved)) {
      return res.status(400).send("unsupported file type");
    }

    let st;
    try {
      st = await fs.stat(resolved);
    } catch {
      return res.status(404).send("not found");
    }
    if (!st.isFile()) {
      return res.status(400).send("not a file");
    }
    if (st.size > MAX_IMAGE_SERVE_BYTES) {
      return res.status(413).send("file too large");
    }

    let buf;
    try {
      buf = await fs.readFile(resolved);
    } catch {
      return res.status(500).send("read failed");
    }

    res.setHeader("Content-Type", mimeForImagePath(resolved));
    res.setHeader("Cache-Control", "private, max-age=120");
    res.send(buf);
  });
}
