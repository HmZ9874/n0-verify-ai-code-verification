import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./process.js";
import { verifyRepository } from "./verify.js";

test("runs trusted policy, four-way matrix, requirements, claims and changed-line mutation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "n0-integration-"));
  try {
    await git(directory, ["init", "--quiet"]);
    await git(directory, ["config", "user.email", "test@n0.invalid"]);
    await git(directory, ["config", "user.name", "N0 Test"]);
    await mkdir(join(directory, ".n0"));
    await mkdir(join(directory, "src"));
    await writeFile(join(directory, "package.json"), "{\"type\":\"module\"}\n");
    await writeFile(join(directory, "src", "score.js"), "export const classify = () => 'low';\n");
    await writeFile(join(directory, ".n0", "n0.config.yml"), `version: 1
execution:
  mode: worktree
  timeout_seconds: 30
commands:
  test: node --test
matrix:
  enabled: true
negative_control:
  enabled: true
  max_mutants: 3
`);
    await writeFile(join(directory, ".n0", "requirements.yml"), `version: 1
requirements:
  - id: SCORE-01
    statement: Scores at least ten are high
    severity: high
    mandatory: true
    evidence: [runtime_test, negative_test]
`);
    await writeFile(join(directory, ".n0", "waivers.yml"), "version: 1\nwaivers: []\n");
    await git(directory, ["add", "."]);
    await git(directory, ["commit", "--quiet", "-m", "base"]);
    await mkdir(join(directory, "test"));
    await writeFile(join(directory, "src", "score.js"), "export const classify = (score) => score >= 10 ? 'high' : 'low';\n");
    await writeFile(join(directory, "test", "score.test.js"), "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { classify } from '../src/score.js';\ntest('classifies boundary', () => assert.equal(classify(10), 'high'));\n");
    await git(directory, ["add", "."]);
    await git(directory, ["commit", "--quiet", "-m", "head"]);
    const claims = join(directory, "claims.md");
    await writeFile(claims, "- Implemented score boundary handling\n");
    const result = await verifyRepository({ cwd: directory, base: "HEAD~1", claimsPath: claims });
    assert.equal(result.matrix?.status, "COMPLETE", JSON.stringify(result.matrix, null, 2));
    assert.equal(result.matrix?.cells.C0T1?.status, "FAIL", JSON.stringify(result.matrix?.cells.C0T1, null, 2));
    assert.equal(result.matrix?.cells.C1T1?.status, "PASS", JSON.stringify(result.matrix?.cells.C1T1, null, 2));
    assert.equal(result.requirements?.[0]?.status, "PASS", JSON.stringify(result.requirements, null, 2));
    assert.equal(result.mutations?.some((mutation) => mutation.status === "KILLED"), true, JSON.stringify(result.mutations, null, 2));
    assert.equal(result.claims?.length, 1);
    assert.equal(result.evidenceStatus, "SUPPORTED", JSON.stringify(result.evidence, null, 2));
    assert.equal(result.decision, "PASS", JSON.stringify(result.findings, null, 2));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function git(cwd: string, args: string[]): Promise<void> {
  const result = await runCommand("git", args, { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
}
