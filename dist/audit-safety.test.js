import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./process.js";
import { verifyRepository } from "./verify.js";
test("audit mode never executes an explicitly supplied test command", async () => {
    const directory = await mkdtemp(join(tmpdir(), "n0-audit-"));
    const marker = join(directory, "executed.txt");
    try {
        await git(directory, ["init", "--quiet"]);
        await git(directory, ["config", "user.email", "test@n0.invalid"]);
        await git(directory, ["config", "user.name", "N0 Test"]);
        await mkdir(join(directory, "src"));
        await writeFile(join(directory, "src", "a.js"), "export const a = 1;\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "base"]);
        await writeFile(join(directory, "src", "a.js"), "export const a = 2;\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "head"]);
        const command = process.platform === "win32" ? `echo executed>${marker}` : `touch ${marker}`;
        const result = await verifyRepository({ cwd: directory, base: "HEAD~1", mode: "audit", testCommand: command });
        assert.equal(result.counterfactual.status, "NOT_RUN");
        await assert.rejects(readFile(marker), /ENOENT/u);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
async function git(cwd, args) { const result = await runCommand("git", args, { cwd }); if (result.exitCode !== 0)
    throw new Error(result.stderr); }
//# sourceMappingURL=audit-safety.test.js.map