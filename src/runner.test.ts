import assert from "node:assert/strict";
import test from "node:test";
import { defaultConfig } from "./config.js";
import { executePlan } from "./runner.js";

test("records nonzero shell commands as FAIL evidence", async () => {
  const config = structuredClone(defaultConfig);
  config.execution.mode = "worktree";
  const result = await executePlan({ directory: process.cwd(), ref: "HEAD", snapshot: "head", plan: { adapter: "fixture", test: "n0-command-that-does-not-exist-84726" }, config, testOnly: true });
  assert.equal(result.status, "FAIL");
  assert.equal(result.commands[0]?.status, "FAIL");
});
