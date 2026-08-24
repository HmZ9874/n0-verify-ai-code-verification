import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkdown } from "./claims.js";

test("normalizes markdown completion claims without using an LLM", () => {
  const claims = normalizeMarkdown("- Implemented token expiry handling\n- Added tests for invalid tokens\n- All tests pass");
  assert.deepEqual(claims.map((claim) => claim.type), ["behavior", "test", "quality"]);
  assert.deepEqual(claims[0]?.requiredEvidence, ["runtime_test"]);
  assert.deepEqual(claims[2]?.requiredEvidence, ["clean_test_run"]);
});
