import { verifyRepository as verifyEnhanced, type VerifyOptions } from "./verify-enhanced.js";
import { loadTrustedConfig } from "./config.js";
import { produceProofPack } from "./proof.js";
export type { VerifyOptions } from "./verify-enhanced.js";

export async function verifyRepository(options: VerifyOptions) {
  const result = await verifyEnhanced({ ...options, claimsPath: options.claimsPath ?? process.env.N0_CLAIMS, writeProof: false });
  if (result.runs?.some((run) => run.status === "BLOCKED" || run.status === "TIMEOUT") && !result.findings.some((finding) => finding.kind === "execution_blocked")) {
    result.findings.push({ ruleId: "N0-RUN-003", kind: "execution_blocked", severity: "warning", message: "One or more verification runs were blocked by the execution environment." });
    if (result.decision === "PASS") result.decision = "WARN";
  }
  const claimEvidence = result.evidence?.filter((evidence) => evidence.type === "claim") ?? [];
  const mandatory = result.requirements?.filter((requirement) => requirement.mandatory !== false) ?? [];
  const activeBlocker = result.findings.some((finding) => !finding.waived && finding.severity === "blocking" && finding.kind !== "non_discriminating_test");
  if (!activeBlocker && claimEvidence.length > 0 && claimEvidence.every((evidence) => evidence.status === "supporting") && mandatory.every((requirement) => requirement.status === "PASS" || requirement.status === "WAIVED")) result.evidenceStatus = "SUPPORTED";
  if (process.env.N0_STRICT === "true" && result.decision === "WARN") result.decision = "BLOCK";
  if (options.writeProof) {
    const loaded = await loadTrustedConfig(result.repository, result.base); const config = structuredClone(loaded.config);
    if (options.mode) config.execution.mode = options.mode; if (options.timeoutMs) config.execution.timeoutSeconds = Math.max(1, Math.ceil(options.timeoutMs / 1000)); if (options.testCommand) config.commands.test = options.testCommand;
    const pack = await produceProofPack({ result, config, ...(options.proofOutput ? { outputRoot: options.proofOutput } : {}), ...(options.signingKey ? { signingKey: options.signingKey } : {}) }); result.proofDirectory = pack.directory;
  }
  return result;
}
