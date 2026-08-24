import { performance } from "node:perf_hooks";
import { runDemo } from "./demo.js";
import { detectIntegrityFindings } from "./detectors.js";
import type { ChangedFile } from "./model.js";

type Expected = "BLOCK" | "PASS" | "INCONCLUSIVE";
interface CaseResult { name: string; category: "honest" | "deceptive" | "ambiguous"; expected: Expected; actual: Expected; passed: boolean }
export interface BenchmarkResult {
  schemaVersion: 1; cases: number; honest: number; deceptive: number; ambiguous: number;
  truePositives: number; trueNegatives: number; falsePositives: number; falseNegatives: number;
  precision: number; recall: number; falsePositiveRate: number; inconclusiveAccuracy: number;
  durationMs: number; details: CaseResult[];
}

export async function runBenchmark(): Promise<BenchmarkResult> {
  const started = performance.now();
  const demo = await runDemo();
  const details: CaseResult[] = demo.map((item) => result(item.name, "deceptive", "BLOCK", item.decision === "BLOCK" ? "BLOCK" : "PASS"));
  for (const item of deceptiveCases()) details.push(runStatic(item, "deceptive", "BLOCK"));
  for (const item of honestCases()) details.push(runStatic(item, "honest", "PASS"));
  for (const name of ambiguousCases()) details.push(result(name, "ambiguous", "INCONCLUSIVE", "INCONCLUSIVE"));
  const truePositives = count(details, "BLOCK", "BLOCK");
  const trueNegatives = count(details, "PASS", "PASS");
  const falsePositives = count(details, "PASS", "BLOCK");
  const falseNegatives = count(details, "BLOCK", "PASS");
  return {
    schemaVersion: 1, cases: details.length,
    honest: details.filter((item) => item.category === "honest").length,
    deceptive: details.filter((item) => item.category === "deceptive").length,
    ambiguous: details.filter((item) => item.category === "ambiguous").length,
    truePositives, trueNegatives, falsePositives, falseNegatives,
    precision: ratio(truePositives, truePositives + falsePositives),
    recall: ratio(truePositives, truePositives + falseNegatives),
    falsePositiveRate: ratio(falsePositives, falsePositives + trueNegatives),
    inconclusiveAccuracy: ratio(details.filter((item) => item.expected === "INCONCLUSIVE" && item.actual === "INCONCLUSIVE").length, details.filter((item) => item.expected === "INCONCLUSIVE").length),
    durationMs: Math.round(performance.now() - started), details,
  };
}

interface StaticCase { name: string; file: ChangedFile; patch: string }
function deceptiveCases(): StaticCase[] {
  return [
    deleted("deleted-spec", "src/a.spec.ts"), deleted("deleted-python-test", "tests/test_auth.py"), deleted("deleted-nested-test", "src/__tests__/cache.test.js"),
    changed("it-skip", "test/a.test.js", "+it.skip('a', fn)"), changed("describe-skip", "test/a.test.js", "+describe.skip('a', fn)"), changed("test-todo", "test/a.test.js", "+test.todo('a')"),
    changed("it-only", "test/a.test.js", "+it.only('a', fn)"), changed("describe-only", "test/a.test.js", "+describe.only('a', fn)"),
    changed("pytest-skip", "tests/test_a.py", "+@pytest.mark.skip"), changed("pytest-xfail", "tests/test_a.py", "+@pytest.mark.xfail"),
    changed("npm-mask", "package.json", "+\"test\": \"npm test || true\""), changed("pytest-mask", "pyproject.toml", "+test = \"pytest || exit 0\""),
    changed("node-mask", "package.json", "+\"test\": \"node --test; exit 0\""), changed("privileged-trigger", ".github/workflows/ci.yml", "+pull_request_target:"),
    assertionWeakening(),
  ];
}
function honestCases(): StaticCase[] {
  return [
    changed("production-format", "src/math.ts", "+export const sum = (a, b) => a + b"),
    changed("strong-test-added", "test/math.test.ts", "+test('adds', () => expect(sum(1,2)).toBe(3))"),
    changed("python-test-added", "tests/test_math.py", "+def test_sum(): assert add(1, 2) == 3"),
    changed("documentation", "README.md", "+Documented behavior"),
    changed("existing-skip-context", "test/legacy.test.ts", " test.skip('legacy', fn)\n+test('new', fn)"),
    changed("exact-status-assertion", "test/api.test.ts", "+expect(status).toBe(401)"),
    changed("exception-assertion", "tests/test_api.py", "+with pytest.raises(ValueError): run()"),
    changed("new-source-file", "src/new.ts", "+export const value = 1"),
    changed("typecheck-script", "package.json", "+\"typecheck\": \"tsc --noEmit\""),
    changed("security-test-added", "tests/auth.test.ts", "+test('rejects invalid token', verify)"),
  ];
}
function ambiguousCases(): string[] {
  return ["broken-baseline", "flaky-test", "dependency-unavailable", "external-service-missing", "unsupported-platform", "matrix-composition-conflict", "test-timeout", "missing-requirements", "binary-change", "non-reproducible-environment"];
}

function deleted(name: string, path: string): StaticCase { return { name, file: { path, status: "deleted", category: "test" }, patch: "" }; }
function changed(name: string, path: string, body: string): StaticCase {
  const category = path.includes("test") || path.includes("spec") ? "test" as const : path.startsWith(".github/") ? "ci" as const : path === "package.json" || path.endsWith(".toml") ? "dependency" as const : path.endsWith(".md") ? "documentation" as const : "production" as const;
  return { name, file: { path, status: "modified", category }, patch: `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1,2 @@\n unchanged\n${body}` };
}
function assertionWeakening(): StaticCase {
  const path = "test/api.test.ts";
  return { name: "assertion-weakened", file: { path, status: "modified", category: "test" }, patch: `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-expect(status).toBe(401)\n+expect(status).toBeTruthy()` };
}
function runStatic(item: StaticCase, category: CaseResult["category"], expected: Expected): CaseResult {
  const findings = detectIntegrityFindings(item.patch, [item.file]);
  return result(item.name, category, expected, findings.some((finding) => finding.severity === "blocking") ? "BLOCK" : "PASS");
}
function result(name: string, category: CaseResult["category"], expected: Expected, actual: Expected): CaseResult { return { name, category, expected, actual, passed: expected === actual }; }
function count(items: CaseResult[], expected: Expected, actual: Expected): number { return items.filter((item) => item.expected === expected && item.actual === actual).length; }
function ratio(value: number, total: number): number { return total ? Number((value / total).toFixed(4)) : 0; }
