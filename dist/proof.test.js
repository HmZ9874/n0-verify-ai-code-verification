import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfig } from "./config.js";
import { produceProofPack, verifyProofPack } from "./proof.js";
test("produces a hash-verifiable proof pack and detects tampering", async () => {
    const root = await mkdtemp(join(tmpdir(), "n0-proof-test-"));
    const result = {
        schemaVersion: "1.0", toolVersion: "0.1.0", repository: root, base: "a".repeat(40), head: "b".repeat(40),
        decision: "PASS", evidenceStatus: "INCONCLUSIVE", findings: [], changedFiles: [],
        counterfactual: { status: "NOT_RUN", evidenceStatus: "INCONCLUSIVE", summary: "not run" },
        generatedAt: "2026-08-24T12:00:00.000Z",
    };
    try {
        const pack = await produceProofPack({ result, config: defaultConfig, outputRoot: root });
        assert.equal((await verifyProofPack(pack.directory)).valid, true);
        await writeFile(join(pack.directory, "findings.json"), "tampered\n", "utf8");
        const invalid = await verifyProofPack(pack.directory);
        assert.equal(invalid.valid, false);
        assert.equal(invalid.errors.some((error) => error.includes("findings.json")), true);
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
//# sourceMappingURL=proof.test.js.map