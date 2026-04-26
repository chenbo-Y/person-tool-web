import assert from "node:assert/strict";
import { test } from "node:test";
import { setupIsolatedServer } from "./helpers/test-server.js";

const ctx = setupIsolatedServer();

test("task CRUD and progress should work with isolated generated data", async () => {
  const createRes = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "auto-test-task",
      type: "test",
      detail: "generated detail",
      status: "todo",
    }),
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.ok, true);
  assert.equal(typeof createBody.item?.id, "string");
  const id = createBody.item.id;

  const updateRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "auto-test-task-updated",
      type: "test-updated",
      detail: "updated detail",
      status: "done",
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.ok, true);
  assert.equal(updateBody.item.status, "done");
  assert.equal(typeof updateBody.item.completedAt, "string");
  assert.ok(updateBody.item.completedAt.length > 0);

  const progressRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "progress from automated test" }),
  });
  assert.equal(progressRes.status, 200);
  const progressBody = await progressRes.json();
  assert.equal(progressBody.ok, true);
  assert.equal(Array.isArray(progressBody.item.progress), true);
  assert.equal(progressBody.item.progress.length, 1);

  const getRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}`);
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.ok, true);
  assert.equal(getBody.item.title, "auto-test-task-updated");
  assert.equal(getBody.item.progress.length, 1);

  const delRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.equal(delBody.ok, true);
});

test("task progress should be updatable and deletable", async () => {
  const createRes = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "progress-edit-delete-test",
      detail: "for progress mutation api",
    }),
  });
  assert.equal(createRes.status, 200);
  const { item: created } = await createRes.json();
  const id = created.id;

  const addRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "first version" }),
  });
  assert.equal(addRes.status, 200);
  const addBody = await addRes.json();
  const pid = addBody.item.progress[0].id;
  assert.equal(typeof pid, "string");
  assert.ok(pid.length > 0);

  const putRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress/${encodeURIComponent(pid)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "second version" }),
  });
  assert.equal(putRes.status, 200);
  const putBody = await putRes.json();
  assert.equal(putBody.item.progress.some((p) => p.id === pid && p.content === "second version"), true);
  assert.equal(typeof putBody.item.progress.find((p) => p.id === pid).updatedAt, "string");

  const delRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress/${encodeURIComponent(pid)}`, {
    method: "DELETE",
  });
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.equal(delBody.item.progress.length, 0);

  const cleanup = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
  assert.equal(cleanup.status, 200);
});

test("task create should reject empty title", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "   ",
      detail: "invalid task",
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.match(body.error, /title/i);
});

test("task detail should return 404 for non-existing id", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/tasks/not_exists_task_id`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
});

test("task progress should reject empty content", async () => {
  const createRes = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "progress-empty-test",
      detail: "for negative test",
    }),
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  const id = createBody.item.id;

  const progressRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "   " }),
  });
  assert.equal(progressRes.status, 400);
  const progressBody = await progressRes.json();
  assert.equal(typeof progressBody.error, "string");
  assert.match(progressBody.error, /content/i);
});

test("task create should clamp/normalize boundary fields", async () => {
  const longTitle = "T".repeat(200);
  const longType = "Y".repeat(100);
  const longDetail = "D".repeat(4000);
  const res = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: longTitle,
      type: longType,
      detail: longDetail,
      dueAt: "not-a-date",
      status: "unexpected-status",
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.item.title.length, 120);
  assert.equal(body.item.type.length, 40);
  assert.equal(body.item.detail.length, 3000);
  assert.equal(body.item.dueAt, "");
  assert.equal(body.item.status, "todo");
});

test("task progress should truncate oversized content", async () => {
  const createRes = await fetch(`${ctx.baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "progress-length-boundary",
      detail: "prepare for progress boundary",
    }),
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  const id = createBody.item.id;

  const longContent = "P".repeat(13050);
  const progressRes = await fetch(`${ctx.baseUrl}/api/tasks/${encodeURIComponent(id)}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: longContent }),
  });
  assert.equal(progressRes.status, 200);
  const progressBody = await progressRes.json();
  assert.equal(progressBody.ok, true);
  assert.equal(progressBody.item.progress.length > 0, true);
  assert.equal(progressBody.item.progress[0].content.length, 12000);
});
