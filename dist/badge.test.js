import assert from "node:assert/strict";
import test from "node:test";
import { renderBadge } from "./proof.js";
test("renders decision-specific badges", () => {
    assert.match(renderBadge("PASS"), /N0 Verified/u);
    assert.match(renderBadge("BLOCK"), /N0 Blocked/u);
});
//# sourceMappingURL=badge.test.js.map