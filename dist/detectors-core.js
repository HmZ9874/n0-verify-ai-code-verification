import { parseDiffLines } from "./diff.js";
import { classifyFile } from "./git.js";
const testDeclaration = /\b(?:test|it|describe)\s*\(|^\s*(?:async\s+)?def\s+test_/u;
const assertion = /\b(?:expect\s*\(|assert(?:\.|\s*\())|\bassert\s+/u;
export function detectIntegrityFindings(patch, files) {
    const findings = [];
    const lines = parseDiffLines(patch);
    for (const file of files) {
        if (file.category === "test" && file.status === "deleted")
            findings.push(finding("N0-TEST-001", "test_file_deleted", "blocking", "A test file was deleted.", file.path));
        if (file.category === "ci")
            findings.push(finding("N0-CI-001", "ci_configuration_changed", "warning", "CI configuration changed and requires trusted-policy review.", file.path));
    }
    for (const line of lines)
        detectLine(line, findings);
    detectAssertionWeakening(lines, findings);
    detectThresholdReduction(lines, findings);
    detectSnapshotVolume(lines, findings);
    return deduplicate(findings);
}
function detectLine(line, findings) {
    const category = classifyFile(line.path);
    const added = line.kind === "added";
    if (added && category === "test" && (/\b(?:test|it|describe)\.(?:skip|todo)\s*\(/u.test(line.content) || /@pytest\.mark\.(?:skip|xfail)|@unittest\.skip/u.test(line.content)))
        findings.push(at(line, "N0-TEST-002", "test_skip_added", "blocking", "A skipped, todo, or expected-failure test was added."));
    if (added && category === "test" && /\b(?:test|it|describe)\.only\s*\(/u.test(line.content))
        findings.push(at(line, "N0-TEST-003", "focused_test_added", "blocking", "A focused .only test was added and can exclude the rest of the suite."));
    if (!added && category === "test" && testDeclaration.test(line.content))
        findings.push(at(line, "N0-TEST-004", "test_case_removed", "warning", "A test declaration was removed. Confirm that the removal is intentional."));
    if (!added && category === "test" && assertion.test(line.content))
        findings.push(at(line, "N0-TEST-005", "assertion_removed", "warning", "An assertion was removed."));
    if (added && ["configuration", "test_configuration", "build_configuration", "dependency", "ci"].includes(category) && /(?:npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|pytest|vitest|jest|node\s+--test)[^\n]*(?:\|\|\s*true|\|\|\s*exit\s+0|;\s*exit\s+0|\$LASTEXITCODE\s*=\s*0)/iu.test(line.content))
        findings.push(at(line, "N0-CMD-001", "test_failure_masked", "blocking", "The test command masks a failing exit status."));
    if (added && /passWithNoTests\s*[:=]\s*true|--passWithNoTests/iu.test(line.content))
        findings.push(at(line, "N0-TEST-006", "empty_suite_allowed", "warning", "The test configuration now allows an empty test suite to pass."));
    if (added && /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*)?$|except(?:\s+Exception)?\s*:\s*pass/iu.test(line.content))
        findings.push(at(line, "N0-ERR-001", "error_swallowed", "warning", "A broad error handler appears to ignore an error."));
    if (added && category === "ci" && /pull_request_target\s*:/u.test(line.content))
        findings.push(at(line, "N0-CI-002", "untrusted_privileged_trigger", "blocking", "pull_request_target can expose privileged context to untrusted pull-request code."));
    if (added && /(?:retry|retries)\s*[:=]\s*(?:[5-9]|\d{2,})|timeout\s*[:=]\s*(?:[6-9]\d{4}|\d{6,})/iu.test(line.content))
        findings.push(at(line, "N0-TEST-009", "timeout_or_retry_increased", "warning", "A high timeout or retry value may conceal instability."));
}
function detectAssertionWeakening(lines, findings) {
    const removed = lines.filter((line) => line.kind === "removed" && /toEqual|toStrictEqual|toBe\s*\(|status_code\s*==|raises\s*\(\s*[A-Z]/u.test(line.content));
    const added = lines.filter((line) => line.kind === "added" && /toBeTruthy|toBeDefined|assert\s+\w+\s*$|assertTrue\s*\(/u.test(line.content));
    for (const weak of added) {
        const precise = removed.find((line) => line.path === weak.path && Math.abs(line.line - weak.line) <= 5);
        if (precise)
            findings.push({ ...at(weak, "N0-TEST-007", "assertion_weakened", "blocking", "A precise assertion appears to have been replaced by a weaker truthiness or existence check."), evidence: `${precise.content.trim()} -> ${weak.content.trim()}` });
    }
}
function detectThresholdReduction(lines, findings) {
    const removed = lines.filter((line) => line.kind === "removed");
    for (const added of lines.filter((line) => line.kind === "added")) {
        const match = /(?:threshold|branches|functions|lines|statements)[^\d]*(\d+(?:\.\d+)?)/iu.exec(added.content);
        if (!match)
            continue;
        const previous = removed.find((line) => line.path === added.path && new RegExp(match[0].replace(match[1] ?? "", "(\\d+(?:\\.\\d+)?)").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "iu").test(line.content));
        const oldNumber = previous ? Number(/\d+(?:\.\d+)?/u.exec(previous.content)?.[0]) : Number.NaN;
        const newNumber = Number(match[1]);
        if (Number.isFinite(oldNumber) && newNumber < oldNumber)
            findings.push(at(added, "N0-COV-001", "coverage_reduced", "blocking", `A coverage threshold appears to decrease from ${oldNumber} to ${newNumber}.`));
    }
}
function detectSnapshotVolume(lines, findings) {
    const snapshotChanges = lines.filter((line) => /\.snap$/iu.test(line.path)).length;
    const productionChanges = lines.filter((line) => ["production", "security_sensitive"].includes(classifyFile(line.path))).length;
    if (snapshotChanges >= 50 && snapshotChanges > productionChanges * 5)
        findings.push(finding("N0-SNAPSHOT-001", "snapshot_bulk_update", "warning", `${snapshotChanges} snapshot lines changed relative to ${productionChanges} production lines.`));
}
function finding(ruleId, kind, severity, message, path) { return { ruleId, kind, severity, message, ...(path ? { path } : {}) }; }
function at(line, ruleId, kind, severity, message) { return { ruleId, kind, severity, path: line.path, line: line.line, message, evidence: line.content.trim() }; }
function deduplicate(findings) {
    const seen = new Set();
    return findings.filter((item) => { const key = `${item.ruleId}:${item.path ?? ""}:${item.line ?? ""}`; if (seen.has(key))
        return false; seen.add(key); return true; });
}
//# sourceMappingURL=detectors-core.js.map