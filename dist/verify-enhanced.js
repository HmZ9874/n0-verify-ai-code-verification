import "./extensions.js";
import { resolve } from "node:path";
import { verifyRepository as verifyCore } from "./verify-core.js";
import { loadClaims } from "./claims.js";
import { applyWaivers, loadTrustedWaivers } from "./waivers.js";
import { diffPatch } from "./git.js";
import { loadTrustedConfig } from "./config.js";
import { detectAdapter, mergeCommandPlan } from "./adapters.js";
import { runChangedLineMutations } from "./mutation.js";
import { produceProofPack } from "./proof.js";
export async function verifyRepository(options) {
    const result = await verifyCore({ ...options, writeProof: false });
    const loaded = await loadTrustedConfig(result.repository, result.base);
    const config = structuredClone(loaded.config);
    if (options.mode)
        config.execution.mode = options.mode;
    if (options.timeoutMs)
        config.execution.timeoutSeconds = Math.max(1, Math.ceil(options.timeoutMs / 1000));
    if (options.testCommand)
        config.commands.test = options.testCommand;
    const claims = options.claimsPath ? await loadClaims(resolve(options.claimsPath)) : [];
    result.claims = claims;
    const claimEvidence = evaluateClaimEvidence(claims, result);
    result.evidence = [...(result.evidence ?? []), ...claimEvidence];
    if (result.isolationMode === "worktree" && config.negativeControl.enabled) {
        const adapter = await detectAdapter(result.repository, config);
        if (adapter) {
            const plan = mergeCommandPlan(await adapter.discoverCommands(result.repository), config.commands);
            result.mutations = await runChangedLineMutations({
                repository: result.repository,
                head: result.head,
                patch: await diffPatch(result.repository, result.base, result.head),
                files: result.changedFiles,
                plan,
                config,
            });
            const survived = result.mutations.filter((mutation) => mutation.status === "SURVIVED");
            if (survived.length)
                result.findings.push({
                    ruleId: "N0-MUT-001",
                    kind: "changed_line_mutant_survived",
                    severity: "warning",
                    message: `${survived.length} of ${result.mutations.length} changed-line mutants survived the test suite.`,
                });
        }
    }
    applyWaivers(result.findings, await loadTrustedWaivers(result.repository, result.base));
    result.decision = decisionFor(result.findings);
    result.evidenceStatus = evidenceFor(result, claimEvidence);
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
function evaluateClaimEvidence(claims, result) {
    const types = new Set();
    if (result.changedFiles.length)
        types.add("file_change");
    if (result.changedFiles.some((file) => file.category === "test" && file.status !== "deleted"))
        types.add("test_diff");
    if (result.runs?.some((run) => run.snapshot === "head" && run.status === "PASS")) {
        types.add("runtime_test");
        types.add("clean_test_run");
    }
    if (result.matrix?.cells.C1T0?.status === "PASS")
        types.add("regression_test");
    if (result.counterfactual.status === "COUNTERFACTUAL_REJECTED" || result.mutations?.some((mutation) => mutation.status === "KILLED"))
        types.add("negative_test");
    return claims.map((claim) => {
        const supported = claim.requiredEvidence.length > 0 && claim.requiredEvidence.every((type) => types.has(type));
        const contradicted = claim.requiredEvidence.some((type) => type.includes("test")) && result.runs?.some((run) => run.snapshot === "head" && run.status === "FAIL");
        return {
            id: `E-${claim.id}`,
            type: "claim",
            status: contradicted ? "contradicting" : supported ? "supporting" : "neutral",
            source: `${claim.id}: ${claim.statement}`,
        };
    });
}
function decisionFor(findings) {
    const active = findings.filter((finding) => !finding.waived);
    if (active.some((finding) => finding.severity === "blocking" || finding.severity === "critical"))
        return "BLOCK";
    if (active.some((finding) => ["warning", "high", "medium"].includes(finding.severity)))
        return "WARN";
    return "PASS";
}
function evidenceFor(result, claims) {
    if (claims.some((claim) => claim.status === "contradicting") || result.findings.some((finding) => !finding.waived && finding.severity === "blocking" && finding.kind !== "non_discriminating_test"))
        return "CONTRADICTED";
    const mandatoryRequirements = result.requirements?.filter((requirement) => requirement.status !== "WAIVED") ?? [];
    const claimsComplete = claims.length > 0 && claims.every((claim) => claim.status === "supporting");
    const requirementsComplete = mandatoryRequirements.length === 0 || mandatoryRequirements.every((requirement) => requirement.status === "PASS");
    if (claimsComplete && requirementsComplete)
        return "SUPPORTED";
    return "INCONCLUSIVE";
}
//# sourceMappingURL=verify-enhanced.js.map