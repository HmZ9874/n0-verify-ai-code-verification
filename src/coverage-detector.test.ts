import assert from "node:assert/strict";
import test from "node:test";
import { detectIntegrityFindings } from "./detectors.js";

test("detects a reduced coverage threshold", () => {
  const path = "vitest.config.ts";
  const patch = `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -5 +5 @@\n-coverage: { lines: 90 }\n+coverage: { lines: 20 }`;
  const findings = detectIntegrityFindings(patch, [{ path, status: "modified", category: "test_configuration" }]);
  assert.equal(findings.some((finding) => finding.kind === "coverage_reduced"), true);
});
