import assert from "node:assert/strict";
import test from "node:test";
import { normalizeConfig } from "./config.js";
test("normalizes snake-case trusted configuration", () => {
    const config = normalizeConfig({
        version: 1,
        execution: { mode: "container", timeout_seconds: 30, max_memory_mb: 1024 },
        policies: { block_on: ["test_skip_added"] },
        commands: { test: "npm test" },
    });
    assert.equal(config.execution.mode, "container");
    assert.equal(config.execution.timeoutSeconds, 30);
    assert.equal(config.execution.maxMemoryMb, 1024);
    assert.deepEqual(config.policies.blockOn, ["test_skip_added"]);
    assert.equal(config.commands.test, "npm test");
});
test("rejects unsupported config versions", () => {
    assert.throws(() => normalizeConfig({ version: 2 }), /Unsupported/u);
});
//# sourceMappingURL=config.test.js.map