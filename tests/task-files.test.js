import assert from "node:assert/strict";
import { test } from "node:test";
import { setupIsolatedServer } from "./helpers/test-server.js";

const ctx = setupIsolatedServer();

test("task file upload should return downloadable URL", async () => {
  const plain = "hello from automated test";
  const dataUrl = `data:text/plain;base64,${Buffer.from(plain, "utf8").toString("base64")}`;
  const uploadRes = await fetch(`${ctx.baseUrl}/api/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      name: "report.xlsx",
    }),
  });
  assert.equal(uploadRes.status, 200);
  const uploadBody = await uploadRes.json();
  assert.equal(uploadBody.ok, true);
  assert.ok(String(uploadBody.url || "").startsWith("/api/task-files/"));

  const downloadRes = await fetch(`${ctx.baseUrl}${uploadBody.url}`);
  assert.equal(downloadRes.status, 200);
  const text = await downloadRes.text();
  assert.equal(text, plain);
  assert.match(
    downloadRes.headers.get("content-type") || "",
    /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/i,
  );
});

test("task file upload should reject invalid data url", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl: "not-a-data-url",
      name: "bad.txt",
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
});

test("task file read should reject path traversal", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/task-files/..%2F..%2Fsecret.txt`);
  assert.equal(res.status, 400);
});

test("task file read should return 404 for missing file", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/task-files/not_exists_abc_123.txt`);
  assert.equal(res.status, 404);
});

test("task file upload should reject oversized payload", async () => {
  const tooLarge = Buffer.alloc(20 * 1024 * 1024 + 1, 65);
  const dataUrl = `data:application/pdf;base64,${tooLarge.toString("base64")}`;
  const res = await fetch(`${ctx.baseUrl}/api/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      name: "large.pdf",
    }),
  });
  // 可能被 express.json(1mb) 先拦截为 413，或被路由层拦截为 400；两者都符合预期。
  assert.equal([400, 413].includes(res.status), true);
});

test("task file upload should reject unsupported file type", async () => {
  const raw = Buffer.from("abc", "utf8");
  const dataUrl = `data:application/x-custom;base64,${raw.toString("base64")}`;
  const res = await fetch(`${ctx.baseUrl}/api/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      name: "",
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.match(body.error, /不支持|unsupported/i);
});
