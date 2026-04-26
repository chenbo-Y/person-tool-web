import assert from "node:assert/strict";
import { test } from "node:test";
import { setupIsolatedServer } from "./helpers/test-server.js";

const ctx = setupIsolatedServer();

test("GET /api/tasks returns task list payload", async () => {
  const res = await fetch(`${ctx.baseUrl}/api/tasks`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body, "object");
  assert.equal(Array.isArray(body.items), true);
});
