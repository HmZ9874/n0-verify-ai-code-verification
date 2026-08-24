import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CounterfactualResult,
  EvidenceStatus,
  Finding,
  PolicyDecision,
  SnapshotRun,
  VerificationResult,
} from "./model.js";
import { changedFiles, diffPatch, mergeBase, repositoryRoot, resolveRef } from "./git.js";
import { detectIntegrityFindings } from "./detectors.js";
import { runCounterfactual } from "./counterfactual.js";
import { loadTrustedConfig } from "./config.js";
import { detectAdapter, mergeCommandPlan, type CommandPlan, type LanguageAdapter } from "./adapters.js";
import { runFourWayMatrix } from "./matrix.js";
import { executePlan } from "./runner.js";
import { inventoryTests } from "./inventory.js";
import { evaluateRequirements, loadRequirements } from "./requirements.js";
import { produceProofPack } from "./proof.js";
import { runCommand } from "./process.js";

export interface VerifyOptions {
  cwd: string;
  base?: string | undefined;
  head?: string | undefined;
  testCommand?: string | undefined;
  timeoutMs?: number | undefined;
  mode?: "audit" | "worktree" | "container" | undefined;
  writeProof?: boolean | undefined;
  proofOutput?: string | undefined;
  signingKey?: string | undefined;
}

export async function verifyRepository(options: VerifyOptions): Promise<VerificationResult> {
  const repository = await repositoryRoot(options.cwd);
  const headRef = options.head ?? "HEAD";
  const requestedBase = options.base ?? "HEAD~1";
  const head = await resolveRef(repository, headRef);
  const resolvedRequestedBase = await resolveRef(repository, requestedBase);
  const base = options.base ? await mergeBase(repository, resolvedRequestedBase, head) : resolvedRequestedBase;
  const loaded = await loadTrustedConfig(repository, base);
  const config = structuredClone(loaded.config);
  if (options.mode) config.execution.mode = options.mode;
  if (options.timeoutMs) config.execution.timeoutSeconds = Math.max(1, Math.ceil(options.timeoutMs / 1000));
  if (options.testCommand) config.commands.test = options.testCommand;

  const files = await changedFiles(repository, base, head);
  const patch = await diffPatch(repository, base, head);
  const findings = detectIntegrityFindings(patch, files);
  applyPolicy(findings, config.policies.blockOn, config.policies.warnOn);

  let adapter: LanguageAdapter | undefined;
  let plan: CommandPlan | undefined;
  let runs: SnapshotRun[] = [];
  let matrix: VerificationResult["matrix"] = { status: "NOT_RUN", cells: {}, interpretation: "Audit-only mode." };
  let baseInventory: VerificationResult["baseInventory"];
  let headInventory: VerificationResult["headInventory"];

  if (config.execution.mode === "audit") {
    adapter = await detectAdapter(repository, config);
    if (adapter) {
      headInventory = await inventoryTests(repository, adapter);
    }
  } else {
    const snapshots = await createSnapshotPair(repository, base, head);
    try {
      adapter = await detectAdapter(snapshots.head, config);
      if (adapter) {
        plan = mergeCommandPlan(await adapter.discoverCommands(snapshots.head), config.commands);
        baseInventory = await inventoryTests(snapshots.base, adapter);
        headInventory = await inventoryTests(snapshots.head, adapter);
        runs = [
          await executePlan({ directory: snapshots.base, ref: base, snapshot: "base", plan, config }),
          await executePlan({ directory: snapshots.head, ref: head, snapshot: "head", plan, config }),
        ];
        addInventoryFindings(findings, baseInventory, headInventory);
      } else {
        findings.push({ ruleId: "N0-ADAPTER-001", kind: "adapter_missing", severity: "warning", message: "No supported language adapter was detected." });
      }
    } finally {
      await snapshots.cleanup();
    }
    if (adapter && plan) matrix = await runFourWayMatrix({ repository, base, head, files, plan, config });
  }

  let counterfactual = counterfactualFromMatrix(matrix);
  if (counterfactual.status === "NOT_RUN" && options.testCommand && config.execution.mode === "audit") {
    counterfactual = await runCounterfactual({ repository, base, head, files, testCommand: options.testCommand, ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}) });
  }
  appendCounterfactualFinding(findings, counterfactual);

  const requirementDefinitions = await loadRequirements(repository, base);
  const requirementEvaluation = evaluateRequirements({ definitions: requirementDefinitions, changedFiles: files, runs, matrix });
  for (const requirement of requirementDefinitions) {
    const result = requirementEvaluation.results.find((item) => item.id === requirement.id);
    if (requirement.mandatory && result && result.status !== "PASS" && result.status !== "WAIVED") {
      findings.push({
        ruleId: "N0-REQ-001",
        kind: "mandatory_requirement_failed",
        severity: config.policies.blockOn.includes("mandatory_requirement_failed") ? "blocking" : "warning",
        message: `${requirement.id}: ${result.reason}`,
      });
    }
  }

  const result: VerificationResult = {
    schemaVersion: "1.0",
    toolVersion: "0.1.0",
    repository,
    base,
    head,
    decision: decisionFor(findings),
    evidenceStatus: evidenceFor(findings, counterfactual, runs),
    policySource: loaded.source,
    isolationMode: config.execution.mode,
    findings,
    changedFiles: files,
    counterfactual,
    matrix,
    runs,
    ...(baseInventory ? { baseInventory } : {}),
    ...(headInventory ? { headInventory } : {}),
    requirements: requirementEvaluation.results,
    evidence: requirementEvaluation.evidence,
    generatedAt: new Date().toISOString(),
  };
  if (options.writeProof) {
    const pack = await produceProofPack({
      result,
      config,
      ...(options.proofOutput ? { outputRoot: options.proofOutput } : {}),
      ...(options.signingKey ? { signingKey: options.signingKey } : {}),
    });
    result.proofDirectory = pack.directory;
  }
  return result;
}

function applyPolicy(findings: Finding[], blockOn: string[], warnOn: string[]): void {
  for (const finding of findings) {
    if (blockOn.includes(finding.kind)) finding.severity = "blocking";
    else if (warnOn.includes(finding.kind)) finding.severity = "warning";
  }
}

function addInventoryFindings(findings: Finding[], base: NonNullable<VerificationResult["baseInventory"]>, head: NonNullable<VerificationResult["headInventory"]>): void {
  if (head.totals.skipped > base.totals.skipped && !findings.some((finding) => finding.kind === "test_skip_added")) {
    findings.push({ ruleId: "N0-TEST-002", kind: "test_skip_added", severity: "blocking", message: `Skipped test count increased from ${base.totals.skipped} to ${head.totals.skipped}.` });
  }
  if (head.totals.focused > base.totals.focused && !findings.some((finding) => finding.kind === "focused_test_added")) {
    findings.push({ ruleId: "N0-TEST-003", kind: "focused_test_added", severity: "blocking", message: `Focused test count increased from ${base.totals.focused} to ${head.totals.focused}.` });
  }
  if (head.totals.assertions < base.totals.assertions) {
    findings.push({ ruleId: "N0-TEST-005", kind: "assertion_removed", severity: "warning", message: `Assertion count decreased from ${base.totals.assertions} to ${head.totals.assertions}.` });
  }
}

function counterfactualFromMatrix(matrix: NonNullable<VerificationResult["matrix"]>): CounterfactualResult {
  if (matrix.status === "NOT_RUN") return { status: "NOT_RUN", evidenceStatus: "INCONCLUSIVE", summary: matrix.interpretation };
  const head = matrix.cells.C1T1;
  const baseWithHeadTests = matrix.cells.C0T1;
  if (head?.status !== "PASS") return { status: "HEAD_FAILED", evidenceStatus: "CONTRADICTED", summary: "Candidate code with candidate tests did not pass." };
  if (baseWithHeadTests?.status === "PASS") return { status: "SURVIVED", evidenceStatus: "INCONCLUSIVE", summary: "Changed tests pass on both base and head code, so they do not distinguish the change." };
  if (baseWithHeadTests?.status === "FAIL") return { status: "COUNTERFACTUAL_REJECTED", evidenceStatus: "INCONCLUSIVE", summary: "Changed tests reject base code. Framework-specific assertion reachability is still required for SUPPORTED status." };
  return { status: "INVALID_EXPERIMENT", evidenceStatus: "INCONCLUSIVE", summary: matrix.interpretation };
}

function appendCounterfactualFinding(findings: Finding[], result: CounterfactualResult): void {
  if (result.status === "SURVIVED" && !findings.some((finding) => finding.kind === "non_discriminating_test")) findings.push({ ruleId: "N0-EVIDENCE-001", kind: "non_discriminating_test", severity: "blocking", message: result.summary });
  if (result.status === "HEAD_FAILED") findings.push({ ruleId: "N0-RUN-001", kind: "candidate_tests_failed", severity: "blocking", message: result.summary });
  if (result.status === "INVALID_EXPERIMENT") findings.push({ ruleId: "N0-RUN-002", kind: "counterfactual_invalid", severity: "warning", message: result.summary });
}

function decisionFor(findings: Finding[]): PolicyDecision {
  if (findings.some((finding) => finding.severity === "blocking" || finding.severity === "critical")) return "BLOCK";
  if (findings.some((finding) => finding.severity === "warning" || finding.severity === "high" || finding.severity === "medium")) return "WARN";
  return "PASS";
}
function evidenceFor(findings: Finding[], counterfactual: CounterfactualResult, runs: SnapshotRun[]): EvidenceStatus {
  if (findings.some((finding) => finding.severity === "blocking" && finding.kind !== "non_discriminating_test") || runs.some((run) => run.snapshot === "head" && run.status === "FAIL")) return "CONTRADICTED";
  if (counterfactual.evidenceStatus === "SUPPORTED") return "SUPPORTED";
  return "INCONCLUSIVE";
}

async function createSnapshotPair(repository: string, base: string, head: string): Promise<{ base: string; head: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), "n0-snapshots-"));
  const baseDirectory = join(root, "base");
  const headDirectory = join(root, "head");
  await addWorktree(repository, baseDirectory, base);
  try { await addWorktree(repository, headDirectory, head); } catch (error) { await removeWorktree(repository, baseDirectory); throw error; }
  return {
    base: baseDirectory,
    head: headDirectory,
    cleanup: async () => {
      await removeWorktree(repository, headDirectory);
      await removeWorktree(repository, baseDirectory);
      await rm(root, { recursive: true, force: true });
    },
  };
}
async function addWorktree(repository: string, path: string, ref: string): Promise<void> {
  const result = await runCommand("git", ["worktree", "add", "--detach", path, ref], { cwd: repository });
  if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "Could not create snapshot worktree.");
}
async function removeWorktree(repository: string, path: string): Promise<void> {
  await runCommand("git", ["worktree", "remove", "--force", path], { cwd: repository }).catch(() => undefined);
}
