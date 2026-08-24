import assert from "node:assert/strict";
import test from "node:test";
import { parseDiffLines } from "./diff.js";
import { classifyFile } from "./git.js";
test("tracks old and new line numbers", () => {
    const lines = parseDiffLines(`diff --git a/test/a.test.js b/test/a.test.js
--- a/test/a.test.js
+++ b/test/a.test.js
@@ -8,2 +8,3 @@
 unchanged
-old assertion
+new assertion
+another line`);
    assert.deepEqual(lines, [
        { path: "test/a.test.js", line: 9, kind: "removed", content: "old assertion" },
        { path: "test/a.test.js", line: 9, kind: "added", content: "new assertion" },
        { path: "test/a.test.js", line: 10, kind: "added", content: "another line" },
    ]);
});
test("classifies common repository files", () => {
    assert.equal(classifyFile("src/math.ts"), "production");
    assert.equal(classifyFile("src/auth.ts"), "security_sensitive");
    assert.equal(classifyFile("src/auth.spec.ts"), "test");
    assert.equal(classifyFile("package.json"), "dependency");
    assert.equal(classifyFile("package-lock.json"), "lockfile");
    assert.equal(classifyFile(".github/workflows/ci.yml"), "ci");
    assert.equal(classifyFile("README.md"), "documentation");
});
//# sourceMappingURL=diff.test.js.map