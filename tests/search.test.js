import assert from "node:assert/strict";
import { test } from "node:test";
import { setupIsolatedServer } from "./helpers/test-server.js";

const ctx = setupIsolatedServer();

test("POST /api/search validates required fields", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root: process.cwd(), keyword: "" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
});
