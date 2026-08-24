import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./process.js";
import { verifyRepository } from "./verify.js";
test("verifies a Python unittest change through the four-way matrix", async (context) => {
    const python = process.platform === "win32" ? "python" : "python3";
    try {
        if ((await runCommand(python, ["--version"], { cwd: process.cwd() })).exitCode !== 0)
            return context.skip("Python is unavailable");
    }
    catch {
        return context.skip("Python is unavailable");
    }
    const directory = await mkdtemp(join(tmpdir(), "n0-python-"));
    try {
        await git(directory, ["init", "--quiet"]);
        await git(directory, ["config", "user.email", "test@n0.invalid"]);
        await git(directory, ["config", "user.name", "N0 Test"]);
        await mkdir(join(directory, ".n0"));
        await mkdir(join(directory, "app"));
        await writeFile(join(directory, "pyproject.toml"), "[project]\nname='fixture'\nversion='0.0.0'\n");
        await writeFile(join(directory, "app", "score.py"), "def classify(score):\n    return 'low'\n");
        await writeFile(join(directory, ".n0", "n0.config.yml"), `version: 1
execution:
  mode: worktree
  timeout_seconds: 30
commands:
  test: ${python} -m unittest discover -s tests
matrix:
  enabled: true
negative_control:
  enabled: true
  max_mutants: 2
`);
        await writeFile(join(directory, ".n0", "requirements.yml"), "version: 1\nrequirements: []\n");
        await writeFile(join(directory, ".n0", "waivers.yml"), "version: 1\nwaivers: []\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "base"]);
        await mkdir(join(directory, "tests"));
        await writeFile(join(directory, "app", "score.py"), "def classify(score):\n    return 'high' if score >= 10 else 'low'\n");
        await writeFile(join(directory, "tests", "test_score.py"), "import unittest\nfrom app.score import classify\n\nclass ScoreTest(unittest.TestCase):\n    def test_boundary(self):\n        self.assertEqual(classify(10), 'high')\n\nif __name__ == '__main__':\n    unittest.main()\n");
        await git(directory, ["add", "."]);
        await git(directory, ["commit", "--quiet", "-m", "head"]);
        const result = await verifyRepository({ cwd: directory, base: "HEAD~1" });
        assert.equal(result.matrix?.cells.C0T1?.status, "FAIL");
        assert.equal(result.matrix?.cells.C1T1?.status, "PASS");
        assert.equal(result.headInventory?.totals.tests, 1);
        assert.equal(result.mutations?.some((mutation) => mutation.status === "KILLED"), true);
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
//# sourceMappingURL=python-integration.test.js.map