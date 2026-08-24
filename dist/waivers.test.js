import assert from "node:assert/strict";
import test from "node:test";
import { applyWaivers } from "./waivers.js";
test("applies only non-expired trusted waivers matching rule and path", () => {
    const findings = [{ ruleId: "N0-TEST-001", kind: "test_file_deleted", severity: "blocking", path: "tests/legacy/a.test.ts", message: "deleted" }];
    applyWaivers(findings, [{ rule: "N0-TEST-001", path: "tests/legacy/**", reason: "migration", approvedBy: "maintainer", expires: "2026-10-01" }], new Date("2026-08-24T00:00:00Z"));
    assert.equal(findings[0]?.waived, true);
    assert.equal(findings[0]?.severity, "info");
});
//# sourceMappingURL=waivers.test.js.map