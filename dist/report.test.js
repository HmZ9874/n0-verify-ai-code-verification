import assert from "node:assert/strict";
import test from "node:test";
import { renderHtmlReport } from "./report.js";
test("HTML report is standalone, responsive and escapes repository-controlled text", () => {
    const result = {
        toolVersion: "0.1.0",
        generatedAt: "2026-08-24T00:00:00.000Z",
        base: "base<script>alert(1)</script>",
        head: "head",
        decision: "BLOCK",
        evidenceStatus: "CONTRADICTED",
        policySource: ".n0/n0.config.yml",
        isolationMode: "audit",
        changedFiles: [{ path: "src/<unsafe>.ts", oldPath: undefined, status: "M", category: "production", patch: "", additions: 1, deletions: 0 }],
        findings: [{ ruleId: "N0-TEST", kind: "test_skip_added", severity: "blocking", message: "unsafe <message>", path: "src/<unsafe>.ts" }],
        counterfactual: { status: "FAIL", summary: "negative control failed" },
        requirements: [],
    };
    const html = renderHtmlReport(result);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /name=viewport/);
    assert.match(html, /@media\(max-width:650px\)/);
    assert.match(html, /base&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /src\/&lt;unsafe&gt;\.ts/);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});
//# sourceMappingURL=report.test.js.map