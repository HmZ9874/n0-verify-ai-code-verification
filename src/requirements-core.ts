import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type {
  ChangedFile,
  EvidenceNode,
  MatrixResult,
  RequirementDefinition,
  RequirementResult,
  SnapshotRun,
} from "./model.js";
import { showFile } from "./git.js";

export async function loadRequirements(repository: string, base: string): Promise<RequirementDefinition[]> {
  let text: string | undefined;
  try { text = await showFile(repository, base, ".n0/requirements.yml"); } catch { /* local fallback */ }
  if (!text) {
    try { text = await readFile(join(repository, ".n0", "requirements.yml"), "utf8"); } catch { return []; }
  }
  const document = parse(text) as { requirements?: Array<Record<string, unknown>> } | undefined;
  return (document?.requirements ?? []).map((item, index) => ({
    id: typeof item.id === "string" ? item.id : `REQ-${index + 1}`,
    statement: typeof item.statement === "string" ? item.statement : "Unspecified requirement",
    severity: oneOf(item.severity, ["critical", "high", "medium", "low"] as const, "medium"),
    mandatory: item.mandatory !== false,
    evidence: stringArray(item.evidence),
    ...(Array.isArray(item.paths) ? { paths: stringArray(item.paths) } : {}),
    ...(Array.isArray(item.tests) ? { tests: stringArray(item.tests) } : {}),
    ...(typeof item.must_fail_on_base === "boolean" ? { mustFailOnBase: item.must_fail_on_base } : {}),
  }));
}

export function evaluateRequirements(options: {
  definitions: RequirementDefinition[];
  changedFiles: ChangedFile[];
  runs: SnapshotRun[];
  matrix?: MatrixResult | undefined;
}): { results: RequirementResult[]; evidence: EvidenceNode[] } {
  const evidence: EvidenceNode[] = [];
  const headRun = options.runs.find((run) => run.snapshot === "head" || run.snapshot === "c1t1");
  const headPassed = headRun?.status === "PASS";
  const baseNewTestsFailed = options.matrix?.cells.C0T1?.status === "FAIL";
  const headNewTestsPassed = options.matrix?.cells.C1T1?.status === "PASS";
  const results = options.definitions.map((definition) => {
    const ids: string[] = [];
    const pathChanged = !definition.paths?.length || options.changedFiles.some((file) => definition.paths?.some((pattern) => globMatch(file.path, pattern)));
    if (pathChanged) {
      const id = `E-${definition.id}-DIFF`;
      ids.push(id);
      evidence.push({ id, type: "file_change", status: "supporting", source: "git diff" });
    }
    if (headPassed && definition.evidence.some((type) => ["runtime_test", "regression_test"].includes(type))) {
      const id = `E-${definition.id}-RUN`;
      ids.push(id);
      evidence.push({ id, type: "runtime_test", status: "supporting", source: "candidate test run" });
    }
    if (baseNewTestsFailed && headNewTestsPassed && definition.evidence.some((type) => ["negative_test", "mutation"].includes(type))) {
      const id = `E-${definition.id}-NEG`;
      ids.push(id);
      evidence.push({ id, type: "negative_test", status: "supporting", source: "C0T1/C1T1 differential" });
    }
    const required = definition.evidence;
    const providedTypes = new Set(ids.map((id) => evidence.find((node) => node.id === id)?.type));
    const complete = required.length > 0 && required.every((type) => providedTypes.has(type));
    const failed = headRun?.status === "FAIL" && required.includes("runtime_test");
    return {
      id: definition.id,
      statement: definition.statement,
      status: failed ? "FAIL" as const : complete ? "PASS" as const : "UNVERIFIED" as const,
      evidenceIds: ids,
      reason: failed ? "Candidate runtime checks failed." : complete ? "All required evidence types were produced." : "Required evidence is incomplete.",
    };
  });
  return { results, evidence };
}

function globMatch(path: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&").replaceAll("**", "\u0000").replaceAll("*", "[^/]*").replaceAll("\u0000", ".*");
  return new RegExp(`^${escaped}$`, "u").test(path);
}
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T { return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback; }
