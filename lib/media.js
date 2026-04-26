import path from "path";

/**
 * 媒体能力常量与工具函数：
 * - 白名单扩展名
 * - MIME 推断
 * - 视频 Range 解析
 * - 评分排序与类型归类
 */

/** 图片浏览：仅当前目录、白名单扩展名 */
export const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".ico",
  ".avif",
  ".jxl",
]);

export const IMAGE_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".jxl": "image/jxl",
};

/** 视频浏览：仅当前目录、白名单扩展名；流式传输支持 Range（便于拖动进度） */
export const VIDEO_EXT = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".ogv",
  ".mov",
  ".m4v",
  ".mkv",
  ".avi",
  ".wmv",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".3g2",
  ".ts",
  ".m2ts",
]);

export const VIDEO_MIME = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  /* 多数 .mov 为 H.264/AAC 的类 MP4 结构；Chrome/Edge 对 video/quicktime 常解码失败，故用 video/mp4 提高兼容性 */
  ".mov": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2",
  ".ts": "video/mp2t",
  ".m2ts": "video/mp2t",
};

export const MAX_IMAGES_PER_DIR = 400;
export const MAX_IMAGE_SERVE_BYTES = 45 * 1024 * 1024;
export const MAX_VIDEOS_PER_DIR = 200;
/** 单文件大小上限（避免误点超大文件拖垮机器）；仅做 stat 校验，流式不按此读入内存 */
export const MAX_VIDEO_FILE_BYTES = 32 * 1024 * 1024 * 1024;

export function imageExtLower(p) {
  // 统一小写扩展名，避免大小写差异导致白名单误判
  return path.extname(p).toLowerCase();
}

export function isAllowedImagePath(p) {
  return IMAGE_EXT.has(imageExtLower(p));
}

export function mimeForImagePath(p) {
  return IMAGE_MIME[imageExtLower(p)] || "application/octet-stream";
}

export function videoExtLower(p) {
  return path.extname(p).toLowerCase();
}

export function isAllowedVideoPath(p) {
  return VIDEO_EXT.has(videoExtLower(p));
}

export function mimeForVideoPath(p) {
  return VIDEO_MIME[videoExtLower(p)] || "application/octet-stream";
}

/**
 * @param {string | undefined} rangeHeader
 * @param {number} size
 * @returns {{ start: number; end: number } | null}
 */
export function parseVideoRange(rangeHeader, size) {
  // 仅支持单段 bytes range（浏览器常见请求形态）
  if (!rangeHeader || !/^bytes=/i.test(rangeHeader)) return null;
  const range = rangeHeader.replace(/^bytes=/i, "").trim();
  const part = range.split(",")[0].trim();
  const m = /^(\d*)-(\d*)$/.exec(part);
  if (!m) return null;
  const a = m[1];
  const b = m[2];
  let start;
  let end;
  if (a === "" && b !== "") {
    // bytes=-500：取最后 500 字节
    const suffix = parseInt(b, 10);
    if (Number.isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (a !== "" && b === "") {
    // bytes=500-：从 500 到文件末尾
    start = parseInt(a, 10);
    if (Number.isNaN(start) || start < 0) return null;
    end = size - 1;
  } else if (a !== "" && b !== "") {
    // bytes=500-999：显式起止
    start = parseInt(a, 10);
    end = parseInt(b, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
  } else {
    return null;
  }
  if (start >= size) return null;
  end = Math.min(end, size - 1);
  if (start > end) return null;
  return { start, end };
}

export function compareScoreDescThenName(a, b, nameField) {
  // 统一排序：评分高优先；同分按名称稳定排序
  const as = Number(a?.fileScore || 0);
  const bs = Number(b?.fileScore || 0);
  if (bs !== as) return bs - as;
  const an = String(a?.[nameField] || "");
  const bn = String(b?.[nameField] || "");
  return an.localeCompare(bn, "zh-Hans-CN");
}

/** 根据扩展名区分一览中的文件类型（与图片/视频浏览白名单一致） */
export function taggedEntryMediaKind(filePath) {
  // 一览页类型字段与浏览页白名单保持同一来源，避免规则漂移
  const ext = path.extname(String(filePath)).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  return "other";
}
