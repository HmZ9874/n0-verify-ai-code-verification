import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectIntegrityFindings } from "./detectors.js";
import { changedFiles, classifyFile, resolveRef } from "./git.js";
import { runCommand } from "./process.js";
import { runCounterfactual } from "./counterfactual.js";
import type { ChangedFile, Finding } from "./model.js";

export interface DemoCase { name: string; decision: "PASS" | "WARN" | "BLOCK"; findings: Finding[] }
export async function runDemo(): Promise<DemoCase[]> {
  const cases = [
    demoFromPatch("deleted-test", "D\ttest/auth.test.js", "diff --git a/test/auth.test.js b/test/auth.test.js\ndeleted file mode 100644\n--- a/test/auth.test.js\n+++ /dev/null\n@@ -1,1 +0,0 @@\n-test('rejects expired token', () => {})"),
    demoFromPatch("skipped-test", "M\ttest/auth.test.js", "diff --git a/test/auth.test.js b/test/auth.test.js\n--- a/test/auth.test.js\n+++ b/test/auth.test.js\n@@ -1,1 +1,1 @@\n-test('rejects expired token', fn)\n+test.skip('rejects expired token', fn)"),
    demoFromPatch("focused-test", "M\ttest/auth.test.js", "diff --git a/test/auth.test.js b/test/auth.test.js\n--- a/test/auth.test.js\n+++ b/test/auth.test.js\n@@ -1,1 +1,1 @@\n-test('works', fn)\n+test.only('works', fn)"),
    demoFromPatch("masked-exit", "M\tpackage.json", "diff --git a/package.json b/package.json\n--- a/package.json\n+++ b/package.json\n@@ -1,1 +1,1 @@\n-\"test\": \"node --test\"\n+\"test\": \"node --test || true\""),
  ];
  cases.push(await nonDiscriminatingTestDemo());
  return cases;
}
function demoFromPatch(name: string, nameStatus: string, patch: string): DemoCase {
  const files = parseNameStatus(nameStatus); const findings = detectIntegrityFindings(patch, files);
  return { name, decision: findings.some((finding) => finding.severity === "blocking") ? "BLOCK" : findings.length ? "WARN" : "PASS", findings };
}
function parseNameStatus(value: string): ChangedFile[] {
  return value.split(/\r?\n/u).filter(Boolean).map((line) => { const [code = "", path = ""] = line.split("\t"); const status: ChangedFile["status"] = code === "A" ? "added" : code === "D" ? "deleted" : "modified"; return { path, status, category: classifyFile(path) }; });
}
async function nonDiscriminatingTestDemo(): Promise<DemoCase> {
  const directory = await mkdtemp(join(tmpdir(), "n0-demo-"));
  try {
    await git(directory, ["init", "--quiet"]); await git(directory, ["config", "user.email", "demo@n0.invalid"]); await git(directory, ["config", "user.name", "N0 Demo"]);
    await mkdir(join(directory, "src")); await mkdir(join(directory, "test"));
    await writeFile(join(directory, "package.json"), "{\"type\":\"module\"}\n");
    await writeFile(join(directory, "src", "score.js"), "export const classify = () => 'low';\n");
    await git(directory, ["add", "."]); await git(directory, ["commit", "--quiet", "-m", "base"]);
    await writeFile(join(directory, "src", "score.js"), "export const classify = (score) => score > 10 ? 'high' : 'low';\n");
    await writeFile(join(directory, "test", "score.test.js"), "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { classify } from '../src/score.js';\ntest('classifies scores', () => assert.equal(typeof classify(20), 'string'));\n");
    await git(directory, ["add", "."]); await git(directory, ["commit", "--quiet", "-m", "candidate"]);
    const base = await resolveRef(directory, "HEAD~1"); const head = await resolveRef(directory, "HEAD"); const files = await changedFiles(directory, base, head);
    const result = await runCounterfactual({ repository: directory, base, head, files, testCommand: "node --test", timeoutMs: 30_000 });
    const findings: Finding[] = result.status === "SURVIVED" ? [{ ruleId: "N0-EVIDENCE-001", kind: "non_discriminating_test", severity: "blocking", message: result.summary }] : [];
    return { name: "non-discriminating-test", decision: findings.length ? "BLOCK" : "WARN", findings };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
async function git(cwd: string, args: string[]): Promise<void> { const result = await runCommand("git", args, { cwd }); if (result.exitCode !== 0) throw new Error(result.stderr || "Git command failed in demo."); }
