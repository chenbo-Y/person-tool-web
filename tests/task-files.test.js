import assert from "node:assert/strict";
import { test } from "node:test";
import { setupIsolatedServer } from "./helpers/test-server.js";

const ctx = setupIsolatedServer();

async function createUploadHostTask() {
  const r = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "upload-host", detail: "for file tests" }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  return j.item.id;
}

test("task file upload should return downloadable URL under task directory", async () => {
  const taskId = await createUploadHostTask();
  const plain = "hello from automated test";
  const dataUrl = `data:text/plain;base64,${Buffer.from(plain, "utf8").toString("base64")}`;
  const uploadRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(taskId)}/task-files`, {
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
  const u = String(uploadBody.url || "");
  assert.ok(u.startsWith(`/api/task-files/${encodeURIComponent(taskId)}/`));

  const downloadRes = await fetch(`${ctx.baseUrl}${uploadBody.url}`);
  assert.equal(downloadRes.status, 200);
  const text = await downloadRes.text();
  assert.equal(text, plain);
  assert.match(
    downloadRes.headers.get("content-type") || "",
    /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/i,
  );
  const cd = downloadRes.headers.get("content-disposition") || "";
  assert.match(cd, /attachment/i);
  assert.ok(cd.includes("report.xlsx"), "download filename should match upload originalName");
});

test("task file upload should reject invalid data url", async () => {
  const taskId = await createUploadHostTask();
  const res = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(taskId)}/task-files`, {
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

test("task file upload should 404 when task does not exist", async () => {
  const dataUrl = `data:text/plain;base64,${Buffer.from("x", "utf8").toString("base64")}`;
  const res = await fetch(`${ctx.baseUrl}/api/tasks/task_notexist_zzzzzz/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, name: "a.txt" }),
  });
  assert.equal(res.status, 404);
});

test("task file read legacy single segment should reject path traversal", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/task-files/..%2F..%2Fsecret.txt`);
  assert.equal(res.status, 400);
});

test("task file read should return 404 for missing file (per-task path)", async () => {
  const taskId = await createUploadHostTask();
  const res = await fetch(`${ctx.baseUrl}/api/task-files/${encodeURIComponent(taskId)}/missing_zz.bin`);
  assert.equal(res.status, 404);
});

test("task file read legacy should return 404 for missing flat file", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/task-files/not_exists_abc_123.txt`);
  assert.equal(res.status, 404);
});

test("task file upload should reject oversized payload", async () => {
  const taskId = await createUploadHostTask();
  const tooLarge = Buffer.alloc(20 * 1024 * 1024 + 1, 65);
  const dataUrl = `data:application/pdf;base64,${tooLarge.toString("base64")}`;
  const res = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(taskId)}/task-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataUrl,
      name: "large.pdf",
    }),
  });
  assert.equal([400, 413].includes(res.status), true);
});

test("task file upload should reject unsupported file type", async () => {
  const taskId = await createUploadHostTask();
  const raw = Buffer.from("abc", "utf8");
  const dataUrl = `data:application/x-custom;base64,${raw.toString("base64")}`;
  const res = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(taskId)}/task-files`, {
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
