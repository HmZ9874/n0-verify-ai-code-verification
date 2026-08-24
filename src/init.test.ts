import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeProject } from "./init.js";

test("init discovers commands and can create a pinned GitHub workflow", async () => {
  const directory = await mkdtemp(join(tmpdir(), "n0-init-"));
  try {
    await writeFile(join(directory, "package.json"), JSON.stringify({ scripts: { build: "tsc", test: "node --test" } }));
    await writeFile(join(directory, "package-lock.json"), "{}");
    await initializeProject({ cwd: directory, language: "typescript", ci: "github" });
    const config = await readFile(join(directory, ".n0", "n0.config.yml"), "utf8");
    const workflow = await readFile(join(directory, ".github", "workflows", "n0-verify.yml"), "utf8");
    assert.match(config, /install: npm ci --ignore-scripts/);
    assert.match(config, /build: npm run build/);
    assert.match(config, /test: npm run test/);
    assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
    assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
