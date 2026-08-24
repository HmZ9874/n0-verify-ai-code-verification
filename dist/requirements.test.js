import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRequirements } from "./requirements.js";
test("requires every declared evidence type", () => {
    const result = evaluateRequirements({
        definitions: [{ id: "AUTH-1", statement: "Reject invalid tokens", severity: "high", mandatory: true, evidence: ["runtime_test", "negative_test"] }],
        changedFiles: [{ path: "src/auth.ts", status: "modified", category: "security_sensitive" }],
        runs: [{ snapshot: "head", ref: "head", status: "PASS", commands: [], summary: "pass" }],
        matrix: {
            status: "COMPLETE",
            cells: {
                C0T1: { snapshot: "c0t1", ref: "base", status: "FAIL", commands: [], summary: "fail" },
                C1T1: { snapshot: "c1t1", ref: "head", status: "PASS", commands: [], summary: "pass" },
            },
            interpretation: "differential",
        },
    });
    assert.equal(result.results[0]?.status, "PASS");
    assert.equal(result.results[0]?.evidenceIds.length, 3);
});
//# sourceMappingURL=requirements.test.js.map