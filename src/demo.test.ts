import assert from "node:assert/strict";
import test from "node:test";
import { runDemo } from "./demo.js";

test("controlled demo catches all five evidence failures", async () => {
  const cases = await runDemo();
  assert.equal(cases.length, 5);
  assert.deepEqual(cases.map((item) => item.decision), ["BLOCK", "BLOCK", "BLOCK", "BLOCK", "BLOCK"]);
  assert.equal(
    cases.at(-1)?.findings.some((finding) => finding.kind === "non_discriminating_test"),
    true,
  );
});
