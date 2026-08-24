export type Severity = "critical" | "high" | "medium" | "low" | "blocking" | "warning" | "info";
export type EvidenceStatus = "SUPPORTED" | "CONTRADICTED" | "INCONCLUSIVE";
export type PolicyDecision = "PASS" | "WARN" | "BLOCK";
export type CheckStatus = "PASS" | "FAIL" | "BLOCKED" | "TIMEOUT" | "NOT_RUN";
export type IsolationMode = "audit" | "worktree" | "container";

export interface Finding {
  ruleId: string;
  kind: string;
  severity: Severity;
  message: string;
  path?: string | undefined;
  line?: number | undefined;
  evidence?: string | undefined;
  evidenceIds?: string[] | undefined;
  waived?: boolean | undefined;
}

export interface ChangedFile {
  path: string;
  oldPath?: string | undefined;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  category:
    | "production"
    | "test"
    | "test_configuration"
    | "build_configuration"
    | "configuration"
    | "dependency"
    | "lockfile"
    | "ci"
    | "documentation"
    | "generated"
    | "security_sensitive"
    | "unknown";
}

export interface CommandEvidence {
  id: string;
  name: string;
  command: string;
  cwd: string;
  status: CheckStatus;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  stdoutHash: string;
  stderrHash: string;
}

export interface SnapshotRun {
  snapshot: "base" | "head" | "c0t0" | "c1t0" | "c0t1" | "c1t1";
  ref: string;
  status: CheckStatus;
  commands: CommandEvidence[];
  summary: string;
}

export interface MatrixResult {
  status: "NOT_RUN" | "COMPLETE" | "PARTIAL";
  cells: Partial<Record<"C0T0" | "C1T0" | "C0T1" | "C1T1", SnapshotRun>>;
  interpretation: string;
}

export interface CounterfactualResult {
  status:
    | "NOT_RUN"
    | "NO_CHANGED_TESTS"
    | "HEAD_FAILED"
    | "SURVIVED"
    | "COUNTERFACTUAL_REJECTED"
    | "INVALID_EXPERIMENT";
  evidenceStatus: EvidenceStatus;
  summary: string;
  headExitCode?: number | undefined;
  counterfactualExitCode?: number | undefined;
}

export interface TestCaseInventory {
  path: string;
  framework: string;
  suites: string[];
  tests: string[];
  assertions: number;
  skipped: number;
  focused: number;
}

export interface TestInventory {
  files: TestCaseInventory[];
  totals: { files: number; suites: number; tests: number; assertions: number; skipped: number; focused: number };
}

export interface RequirementDefinition {
  id: string;
  statement: string;
  severity: "critical" | "high" | "medium" | "low";
  mandatory: boolean;
  evidence: string[];
  paths?: string[] | undefined;
  tests?: string[] | undefined;
  mustFailOnBase?: boolean | undefined;
}

export interface RequirementResult {
  id: string;
  statement: string;
  status: "PASS" | "FAIL" | "UNVERIFIED" | "BLOCKED" | "WAIVED" | "PRE_EXISTING";
  evidenceIds: string[];
  reason: string;
}

export interface EvidenceNode {
  id: string;
  type: string;
  status: "supporting" | "contradicting" | "neutral";
  source: string;
  hash?: string | undefined;
}

export interface VerificationResult {
  schemaVersion: "0.1" | "1.0";
  toolVersion: string;
  repository: string;
  base: string;
  head: string;
  decision: PolicyDecision;
  evidenceStatus: EvidenceStatus;
  policySource?: string | undefined;
  isolationMode?: IsolationMode | undefined;
  findings: Finding[];
  changedFiles: ChangedFile[];
  counterfactual: CounterfactualResult;
  matrix?: MatrixResult | undefined;
  runs?: SnapshotRun[] | undefined;
  baseInventory?: TestInventory | undefined;
  headInventory?: TestInventory | undefined;
  requirements?: RequirementResult[] | undefined;
  evidence?: EvidenceNode[] | undefined;
  proofDirectory?: string | undefined;
  generatedAt: string;
}
