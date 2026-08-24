import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cacheKey, EvidenceCache } from "./cache.js";
test("separates trusted base and candidate cache namespaces", async () => {
    const directory = await mkdtemp(join(tmpdir(), "n0-cache-"));
    try {
        const key = cacheKey({ commit: "a", lockfileHash: "b", commandHash: "c", environmentFingerprint: "d", policyHash: "e" });
        const cache = new EvidenceCache(directory);
        await cache.set("candidate", key, { status: "candidate" });
        assert.equal(await cache.get("base", key), undefined);
        await cache.set("base", key, { status: "trusted" });
        assert.deepEqual(await cache.get("base", key), { status: "trusted" });
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
//# sourceMappingURL=cache.test.js.map