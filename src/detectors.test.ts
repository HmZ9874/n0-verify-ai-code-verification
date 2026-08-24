import assert from "node:assert/strict";
import test from "node:test";
import { detectIntegrityFindings } from "./detectors.js";
import type { ChangedFile } from "./model.js";

function testFile(status: ChangedFile["status"] = "modified"): ChangedFile {
  return { path: "test/auth.test.js", status, category: "test" };
}

test("detects a newly skipped test", () => {
  const patch = `diff --git a/test/auth.test.js b/test/auth.test.js
--- a/test/auth.test.js
+++ b/test/auth.test.js
@@ -1 +1 @@
-test('rejects invalid tokens', verify)
+test.skip('rejects invalid tokens', verify)`;
  const findings = detectIntegrityFindings(patch, [testFile()]);
  assert.equal(findings.some((finding) => finding.kind === "test_skip_added"), true);
});

test("does not report an unchanged skip", () => {
  const patch = `diff --git a/test/auth.test.js b/test/auth.test.js
--- a/test/auth.test.js
+++ b/test/auth.test.js
@@ -1 +1,2 @@
 test.skip('legacy behavior', verify)
+test('new behavior', verifyNew)`;
  const findings = detectIntegrityFindings(patch, [testFile()]);
  assert.equal(findings.some((finding) => finding.kind === "test_skip_added"), false);
});

test("detects masked test exits only in command-bearing files", () => {
  const patch = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1 +1 @@
-"test": "node --test"
+"test": "node --test || true"`;
  const file: ChangedFile = { path: "package.json", status: "modified", category: "dependency" };
  const findings = detectIntegrityFindings(patch, [file]);
  assert.equal(findings.some((finding) => finding.kind === "test_failure_masked"), true);
});

test("deleted test files are blocking", () => {
  const findings = detectIntegrityFindings("", [testFile("deleted")]);
  assert.deepEqual(
    findings.map(({ kind, severity }) => ({ kind, severity })),
    [{ kind: "test_file_deleted", severity: "blocking" }],
  );
});
