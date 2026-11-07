import { test, expect } from "@playwright/test";
import { createStore } from "../server/store.js";
import { createSeed } from "../src/model.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
test("migration preserves conflicts, is idempotent, and survives restart", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "revenue-test-"));
  const store = createStore(dir);
  const state = createSeed();
  store.migrate({ migrationId: "a", state });
  state.prospects[0].problem = "Different browser notes";
  const next = store.migrate({ migrationId: "b", state });
  expect(next.state.prospects).toHaveLength(9);
  expect(
    store.migrate({ migrationId: "b", state }).state.prospects,
  ).toHaveLength(9);
  expect(createStore(dir).snapshot().state).toEqual(next.state);
});
test("agent tools save real work, enforce drafts and reject lost updates", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "revenue-test-"));
  const store = createStore(dir);
  const p = store.action({
    tool: "create_prospect",
    args: { company: "Test Company", problem: "Five hours" },
  }).result;
  const base = store.snapshot().state;
  store.action({
    tool: "update_prospect",
    args: { id: p.id, changes: { problem: "Two hours" } },
  });
  const stale = structuredClone(base);
  stale.prospects[0].problem = "Stale edit";
  expect(() => store.sync({ base, state: stale })).toThrow("Another writer");
  const draft = store.action({
    tool: "save_draft",
    args: { prospectId: p.id, status: "Sent" },
  }).result;
  expect(draft.status).toBe("Draft");
  expect(draft.body).toContain("Two hours");
  store.action({
    tool: "log_activity",
    args: { prospectId: p.id, text: "Correction verified" },
  });
  expect(() => store.action({ tool: "send_email" })).toThrow("Unknown tool");
  expect(store.snapshot().state.activities[0].text).toBe("Correction verified");
});
