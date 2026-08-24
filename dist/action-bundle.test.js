import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./process.js";
test("bundled GitHub Action runs without node_modules and reports inconclusive evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "n0-action-"));
    try {
        await git(directory, ["init", "--quiet"]);
        await git(directory, ["config", "user.email", "test@n0.invalid"]);
        await git(directory, ["config", "user.name", "N0 Test"]);
        await mkdir(join(directory, "src"));
        await writeFile(join(directory, "src", "value.js"), "export const value = 1;\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "base"]);
        await writeFile(join(directory, "src", "value.js"), "export const value = 2;\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "head"]);
        const run = await runCommand(process.execPath, [join(process.cwd(), "action-dist", "index.cjs")], {
            cwd: directory,
            timeoutMs: 30_000,
            env: { ...process.env, GITHUB_WORKSPACE: directory, INPUT_BASE: "HEAD~1", INPUT_HEAD: "HEAD", INPUT_MODE: "audit", INPUT_COMMENT: "false" },
        });
        assert.equal(run.exitCode, 2, run.stderr);
        assert.match(run.stdout, /N0 Verify: PASS/u);
        assert.match(run.stdout, /Evidence: INCONCLUSIVE/u);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
async function git(cwd, args) {
    const result = await runCommand("git", args, { cwd });
    if (result.exitCode !== 0)
        throw new Error(result.stderr);
}
//# sourceMappingURL=action-bundle.test.js.map