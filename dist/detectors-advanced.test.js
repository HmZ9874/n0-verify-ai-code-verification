import assert from "node:assert/strict";
import test from "node:test";
import { detectIntegrityFindings } from "./detectors.js";
test("detects high-confidence assertion weakening", () => {
    const path = "test/api.test.ts";
    const patch = `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -10 +10 @@\n-expect(response.status).toBe(401)\n+expect(response).toBeTruthy()`;
    const findings = detectIntegrityFindings(patch, [{ path, status: "modified", category: "test" }]);
    assert.equal(findings.some((finding) => finding.kind === "assertion_weakened"), true);
});
test("detects privileged workflow triggers", () => {
    const path = ".github/workflows/verify.yml";
    const patch = `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-on: pull_request\n+pull_request_target:`;
    const file = { path, status: "modified", category: "ci" };
    assert.equal(detectIntegrityFindings(patch, [file]).some((finding) => finding.kind === "untrusted_privileged_trigger"), true);
});
test("detects Python xfail additions", () => {
    const path = "tests/test_api.py";
    const patch = `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1,2 @@\n def test_api(): pass\n+@pytest.mark.xfail`;
    assert.equal(detectIntegrityFindings(patch, [{ path, status: "modified", category: "test" }]).some((finding) => finding.kind === "test_skip_added"), true);
});
//# sourceMappingURL=detectors-advanced.test.js.map