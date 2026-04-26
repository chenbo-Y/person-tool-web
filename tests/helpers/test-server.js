import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before } from "node:test";

const HOST = "127.0.0.1";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, HOST, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      server.close((err) => {
        if (err) return reject(err);
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/tasks`);
      if (res.ok) return;
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server startup timeout");
}

/**
 * 每个测试文件都使用独立的临时 data 目录与独立端口，避免互相污染。
 * 返回值通过 getter 暴露 baseUrl，供测试用例发请求。
 */
export function setupIsolatedServer() {
  let child = null;
  let tempDir = "";
  let baseUrl = "";

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "person-tool-web-test-"));
    const tempDataDir = path.join(tempDir, "data");
    const tempTasksFile = path.join(tempDataDir, "tasks.json");
    const tempTaskFilesBase = path.join(tempDataDir, "task");
    const tempLegacyAssets = path.join(tempDataDir, "task-assets");
    await fs.mkdir(tempDataDir, { recursive: true });
    await fs.mkdir(tempTaskFilesBase, { recursive: true });
    await fs.mkdir(tempLegacyAssets, { recursive: true });
    await fs.writeFile(tempTasksFile, "[]", "utf8");

    const port = await getFreePort();
    baseUrl = `http://${HOST}:${port}`;
    child = spawn(process.execPath, ["server.js"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        KW_WEB_NO_LOG: "1",
        KW_WEB_LOG_LEVEL: "error",
        KW_WEB_TASKS_FILE: tempTasksFile,
        KW_WEB_TASK_FILES_BASE: tempTaskFilesBase,
        KW_WEB_TASK_LEGACY_ASSETS: tempLegacyAssets,
      },
      stdio: "ignore",
    });
    await waitForServer(baseUrl);
  });

  after(async () => {
    if (child && !child.killed) child.kill("SIGTERM");
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  return {
    get baseUrl() {
      return baseUrl;
    },
  };
}
