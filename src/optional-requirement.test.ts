import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRequirements } from "./requirements.js";

test("preserves mandatory metadata for global evidence evaluation", () => {
  const evaluation = evaluateRequirements({
    definitions: [{ id: "DOC-1", statement: "Optional docs", severity: "low", mandatory: false, evidence: ["file_change"] }],
    changedFiles: [], runs: [],
  });
  assert.equal(evaluation.results[0]?.mandatory, false);
  assert.equal(evaluation.results[0]?.status, "UNVERIFIED");
});
