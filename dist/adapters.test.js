import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfig } from "./config.js";
import { detectAdapter, goAdapter, rustAdapter } from "./adapters.js";
test("detects Go and Rust projects and exposes deterministic commands", async () => {
    const go = await mkdtemp(join(tmpdir(), "n0-go-"));
    const rust = await mkdtemp(join(tmpdir(), "n0-rust-"));
    try {
        await writeFile(join(go, "go.mod"), "module example.test/n0\n\ngo 1.22\n");
        await writeFile(join(rust, "Cargo.toml"), "[package]\nname='n0-fixture'\nversion='0.0.0'\n");
        assert.equal((await detectAdapter(go, defaultConfig))?.id, "go");
        assert.equal((await detectAdapter(rust, defaultConfig))?.id, "rust");
        assert.equal((await goAdapter.discoverCommands(go)).test, "go test ./...");
        assert.equal((await rustAdapter.discoverCommands(rust)).test, "cargo test");
        assert.equal(goAdapter.isTestFile("pkg/math_test.go"), true);
        assert.equal(rustAdapter.isTestFile("tests/math.rs"), true);
    }
    finally {
        await rm(go, { recursive: true, force: true });
        await rm(rust, { recursive: true, force: true });
    }
});
//# sourceMappingURL=adapters.test.js.map